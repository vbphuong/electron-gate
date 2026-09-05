"""
RAG document tool for the AI Agent.

Wraps the existing document RAG pipeline (vector retrieval + RRF + LLM answer)
so the Agent can call it as a named tool when the user's question is best answered
from uploaded knowledge-base documents rather than live database data.
"""

from __future__ import annotations

import asyncio
from typing import Any

from sqlalchemy.orm import Session

from api.models import Document as DocumentModel
from rag_engine.embeddings.vector_store import get_vector_store, SupabaseKeywordRetriever
from rag_engine.retrieval_and_answer.retrieve_chunks import retrieve_chunks_multi
from rag_engine.retrieval_and_answer.reciprocal_rank_fusion import reciprocal_rank_fusion
from rag_engine.retrieval_and_answer.generate_answer import generate_final_answer


# ---------------------------------------------------------------------------
# Tool: search_knowledge_base
# ---------------------------------------------------------------------------

def search_knowledge_base(
    db: Session,
    llm,
    embeddings,
    supabase_client,
    user_id: str,
    user_role: str,
    query: str,
    document_ids: list[str] | None = None,
    top_k: int = 5,
) -> dict[str, Any]:
    """
    Search uploaded knowledge-base documents and return an LLM-generated answer.

    Uses the full RAG pipeline: multi-query MMR retrieval → Reciprocal Rank Fusion
    → LLM answer synthesis.

    Role-aware scoping:
    - Admin/Staff: can search across all documents (or a specific subset).
    - Regular User: scoped to public documents + documents they uploaded.

    Args:
        db: SQLAlchemy session.
        llm: LangChain LLM instance.
        embeddings: LangChain embeddings instance.
        supabase_client: Supabase client for vector store.
        user_id: UUID string of the current user.
        user_role: Role of the current user.
        query: The question to answer from documents.
        document_ids: Optional list of document UUIDs to restrict the search.
        top_k: Number of source chunks to include in the response metadata.

    Returns:
        dict with 'answer' string and 'sources' list.
    """
    from uuid import UUID

    # Resolve accessible document IDs (same RBAC logic as existing /rag/query)
    if user_role in ("Admin", "Staff"):
        scoped_ids: list[str] | None = document_ids if document_ids else None
    else:
        try:
            uid = UUID(str(user_id))
        except ValueError:
            return {"error": "Invalid user ID"}

        if document_ids:
            # Validate requested IDs against ownership
            scoped_ids = []
            for doc_id_str in document_ids:
                try:
                    doc_uuid = UUID(doc_id_str)
                except ValueError:
                    continue
                doc = db.query(DocumentModel).filter(DocumentModel.document_id == doc_uuid).first()
                if doc and (not doc.private or doc.uploaded_by == uid):
                    scoped_ids.append(doc_id_str)
        else:
            # Unscoped: return all accessible docs for this user
            accessible = (
                db.query(DocumentModel.document_id)
                .filter(
                    (DocumentModel.private == False) | (DocumentModel.uploaded_by == uid)
                )
                .all()
            )
            scoped_ids = [str(row[0]) for row in accessible]

    if scoped_ids is not None and len(scoped_ids) == 0:
        return {
            "answer": "No accessible documents found in your knowledge base.",
            "sources": [],
        }

    # Build filter kwargs
    if scoped_ids is None:
        filter_kwargs: dict[str, Any] = {}
    elif len(scoped_ids) == 1:
        filter_kwargs = {"filter": {"document_id": scoped_ids[0]}}
    else:
        filter_kwargs = {"filter": {"document_ids": scoped_ids}}

    vector_store = get_vector_store(embeddings, client=supabase_client)

    keyword_retriever = SupabaseKeywordRetriever(
        client=supabase_client,
        k=15,
        filter_kwargs=filter_kwargs,
    )

    chunk_lists = retrieve_chunks_multi(
        llm, query, vector_store, filter_kwargs, bm25_retriever=keyword_retriever
    )
    ranked_chunks = reciprocal_rank_fusion(chunk_lists)

    answer = generate_final_answer(ranked_chunks, query, llm)

    sources = []
    for item in ranked_chunks[:top_k]:
        doc = item[0] if isinstance(item, tuple) else item
        score = item[1] if isinstance(item, tuple) else None
        sources.append(
            {
                "content": doc.page_content or "",
                "score": score,
                "metadata": doc.metadata if hasattr(doc, "metadata") else {},
            }
        )

    return {
        "answer": str(answer) if answer is not None else "",
        "sources": sources,
    }
