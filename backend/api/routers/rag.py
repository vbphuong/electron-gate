import asyncio
from typing import List, Optional, Any, Dict
from uuid import UUID
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from api.models import Document as DocumentModel
from api.deps import (
    user_dependency,
    db_dependency,
    supabase_dependency,
    llm_dependency,
    embedding_dependency,
)
from rag_engine.embeddings.vector_store import get_vector_store, SupabaseKeywordRetriever
from rag_engine.retrieval_and_answer.retrieve_chunks import retrieve_chunks, retrieve_chunks_multi
from rag_engine.retrieval_and_answer.reciprocal_rank_fusion import reciprocal_rank_fusion
from rag_engine.retrieval_and_answer.generate_answer import generate_final_answer
from rag_engine.agent.agent_runner import AgentContext, AgentResponse, run_agent

router = APIRouter(
    prefix="/rag",
    tags=["rag"],
)


def _build_filter_kwargs(
    document_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    ids = [str(d).strip() for d in (document_ids or []) if str(d).strip()]
    if document_id and str(document_id).strip() and str(document_id).strip() not in ids:
        ids.append(str(document_id).strip())

    if not ids:
        return {}
    return {"filter": {"document_id": ids[0]}} if len(ids) == 1 else {"filter": {"document_ids": ids}}


def _resolve_and_validate_scoped_doc_ids(
    db: Session,
    current_user: dict,
    document_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None,
) -> Optional[List[str]]:
    """
    Validates requested document IDs against RBAC and ownership:
    - Admin/Staff: Authorized to query any document; if unscoped, returns None (all docs).
    - Regular Users:
      * If specific document_ids / document_id are requested, ensures every requested
        document is public OR owned by current_user. Raises HTTP 403 if unauthorized.
      * If unscoped, returns the list of all document_ids accessible to this user
        (public docs + own private docs) to quarantine retrieval and prevent leaking
        other users' private vector data.
    """
    user_id = UUID(str(current_user["id"]))
    user_role = current_user.get("role", "User")

    raw_ids = [str(d).strip() for d in (document_ids or []) if str(d).strip()]
    if document_id and str(document_id).strip() and str(document_id).strip() not in raw_ids:
        raw_ids.append(str(document_id).strip())

    # 1. Admin and Staff can query any document or query globally
    if user_role in ("Admin", "Staff"):
        return raw_ids if raw_ids else None

    # 2. Regular User with specific requested document IDs
    if raw_ids:
        for doc_id_str in raw_ids:
            try:
                doc_uuid = UUID(doc_id_str)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid document UUID format: {doc_id_str}",
                )

            doc = db.query(DocumentModel).filter(DocumentModel.document_id == doc_uuid).first()
            if not doc:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {doc_id_str} not found",
                )

            # If document is private and not uploaded by this user -> FORBIDDEN
            if doc.private and doc.uploaded_by != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Document '{doc.file_name}' ({doc_id_str}) is in a private enclave and not accessible to your account.",
                )
        return raw_ids

    # 3. Regular User with unscoped / global query -> resolve accessible documents
    accessible_docs = (
        db.query(DocumentModel.document_id)
        .filter((DocumentModel.private == False) | (DocumentModel.uploaded_by == user_id))
        .all()
    )
    accessible_ids = [str(row[0]) for row in accessible_docs]
    return accessible_ids


class RAGQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Question or prompt to answer")
    document_id: Optional[str] = Field(
        default=None,
        description="Scope retrieval to a single uploaded document UUID (for backwards compatibility)",
    )
    document_ids: Optional[List[str]] = Field(
        default=None,
        description="Scope retrieval to one or multiple uploaded document UUIDs",
    )
    use_multi_query: bool = Field(
        default=True,
        description="Whether to generate query variations for multi-angle retrieval",
    )
    top_k: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Number of top source chunks to return in the response",
    )


class SourceChunk(BaseModel):
    content: str
    score: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[SourceChunk] = Field(default_factory=list)


class RAGSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query")
    document_id: Optional[str] = Field(
        default=None,
        description="Scope retrieval to a single uploaded document UUID (for backwards compatibility)",
    )
    document_ids: Optional[List[str]] = Field(
        default=None,
        description="Scope retrieval to one or multiple uploaded document UUIDs",
    )
    top_k: int = Field(default=5, ge=1, le=50, description="Max chunks to retrieve")


class RAGSearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SourceChunk] = Field(default_factory=list)



@router.post("/query", response_model=RAGQueryResponse, status_code=status.HTTP_200_OK)
async def query_rag(
    request: RAGQueryRequest,
    current_user: user_dependency,
    db: db_dependency,
    supabase_client: supabase_dependency,
    llm: llm_dependency,
    embeddings: embedding_dependency,
):
    """
    RAG QA endpoint:
    1. Validates requested document scopes against RBAC and isolates vector retrieval.
    2. Runs retrieval (multi-query MMR or standard single query) scoped only to authorized docs.
    3. Fuses & reranks retrieved chunks using Reciprocal Rank Fusion.
    4. Synthesizes a multimodal answer with the LLM.
    """
    try:
        # Enforce RBAC validation & isolation
        scoped_doc_ids = _resolve_and_validate_scoped_doc_ids(
            db=db,
            current_user=current_user,
            document_id=request.document_id,
            document_ids=request.document_ids,
        )

        # If user has no accessible documents in their knowledge enclave
        if scoped_doc_ids is not None and len(scoped_doc_ids) == 0:
            return RAGQueryResponse(
                query=request.query,
                answer="No accessible documents found in your knowledge base. Please upload documents or request access to public platform materials.",
                sources=[],
            )

        filter_kwargs = _build_filter_kwargs(document_ids=scoped_doc_ids)
        vector_store = get_vector_store(embeddings, client=supabase_client)

        if request.use_multi_query:
            keyword_retriever = SupabaseKeywordRetriever(
                client=supabase_client,
                k=15,
                filter_kwargs=filter_kwargs
            )
            chunk_lists = await asyncio.to_thread(
                retrieve_chunks_multi, llm, request.query, vector_store, filter_kwargs, bm25_retriever=keyword_retriever
            )
            ranked_chunks = reciprocal_rank_fusion(chunk_lists)
        else:
            chunks = await asyncio.to_thread(
                retrieve_chunks, request.query, vector_store, filter_kwargs
            )
            ranked_chunks = [(c, 1.0) for c in chunks]

        answer = await asyncio.to_thread(
            generate_final_answer, ranked_chunks, request.query, llm
        )

        sources = []
        for item in ranked_chunks[: request.top_k]:
            doc = item[0] if isinstance(item, tuple) else item
            score = item[1] if isinstance(item, tuple) else None
            sources.append(
                SourceChunk(
                    content=doc.page_content or "",
                    score=score,
                    metadata=doc.metadata if hasattr(doc, "metadata") else {},
                )
            )

        return RAGQueryResponse(
            query=request.query,
            answer=str(answer) if answer is not None else "",
            sources=sources,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {exc}",
        )


@router.post("/search", response_model=RAGSearchResponse, status_code=status.HTTP_200_OK)
async def search_chunks(
    request: RAGSearchRequest,
    current_user: user_dependency,
    db: db_dependency,
    supabase_client: supabase_dependency,
    embeddings: embedding_dependency,
):
    """
    Direct semantic chunk search without LLM answer generation.
    Enforces document ownership & access isolation.
    """
    try:
        scoped_doc_ids = _resolve_and_validate_scoped_doc_ids(
            db=db,
            current_user=current_user,
            document_id=request.document_id,
            document_ids=request.document_ids,
        )

        if scoped_doc_ids is not None and len(scoped_doc_ids) == 0:
            return RAGSearchResponse(
                query=request.query,
                total_results=0,
                results=[],
            )

        filter_kwargs = _build_filter_kwargs(document_ids=scoped_doc_ids)
        vector_store = get_vector_store(embeddings, client=supabase_client)
        docs = await asyncio.to_thread(
            retrieve_chunks, request.query, vector_store, filter_kwargs
        )

        results = [
            SourceChunk(
                content=doc.page_content or "",
                metadata=doc.metadata if hasattr(doc, "metadata") else {},
            )
            for doc in docs[: request.top_k]
        ]

        return RAGSearchResponse(
            query=request.query,
            total_results=len(results),
            results=results,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG search failed: {exc}",
        )


# =============================================================================
# AGENT ENDPOINT
# =============================================================================

class ConversationTurn(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class AgentQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="The user's question or request")
    document_ids: Optional[List[str]] = Field(
        default=None,
        description="Optional: restrict knowledge-base search to these document UUIDs",
    )
    conversation_history: Optional[List[ConversationTurn]] = Field(
        default=None,
        description="Recent conversation turns for multi-turn context (max last 6 turns used)",
    )


class AgentQueryResponse(BaseModel):
    query: str
    answer: str
    tools_used: List[str] = Field(default_factory=list)
    reasoning: Optional[str] = Field(
        default=None,
        description="Self-grading trace (tool selection rationale)",
    )
    sources: List[SourceChunk] = Field(
        default_factory=list,
        description="Source chunks from knowledge-base documents, if any were used",
    )


@router.post("/agent", response_model=AgentQueryResponse, status_code=status.HTTP_200_OK)
async def agent_query(
    request: AgentQueryRequest,
    current_user: user_dependency,
    db: db_dependency,
    supabase_client: supabase_dependency,
    llm: llm_dependency,
    embeddings: embedding_dependency,
):
    """
    AI Agent endpoint — combines live database queries with document RAG.

    The agent autonomously:
    1. Selects the appropriate tool(s) based on the user's question.
    2. Queries live DB data (products, inventory, orders) and/or uploaded documents.
    3. Self-grades its findings and optionally retrieves more data.
    4. Synthesizes a clear, grounded final answer.

    Role-based access:
    - All roles can search products, check stock, get recommendations, view own orders,
      and search knowledge-base documents.
    - Staff and Admin additionally see exact stock quantities and warehouse locations,
      and can query low-stock reports.
    """
    try:
        history = (
            [{"role": t.role, "content": t.content} for t in request.conversation_history]
            if request.conversation_history
            else None
        )

        ctx = AgentContext(
            query=request.query,
            user_id=str(current_user["id"]),
            user_role=current_user.get("role", "User"),
            db=db,
            llm=llm,
            embeddings=embeddings,
            supabase_client=supabase_client,
            document_ids=request.document_ids,
            conversation_history=history,
        )

        result: AgentResponse = await asyncio.to_thread(run_agent, ctx)

        rag_sources = [
            SourceChunk(
                content=s.get("content", ""),
                score=s.get("score"),
                metadata=s.get("metadata", {}),
            )
            for s in result.sources
        ]

        return AgentQueryResponse(
            query=result.query,
            answer=result.answer,
            tools_used=result.tools_used,
            reasoning=result.reasoning or None,
            sources=rag_sources,
        )

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent query failed: {exc}",
        )
