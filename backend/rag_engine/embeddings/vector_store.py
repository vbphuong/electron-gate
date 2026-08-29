from math import sqrt
from typing import Any, Dict, List, Optional

from pydantic import Field
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever


def _cosine_similarity(left: List[float], right: List[float]) -> float:
    """Return cosine similarity, treating malformed or zero vectors as unrelated."""
    if len(left) != len(right) or not left:
        return 0.0

    numerator = sum(a * b for a, b in zip(left, right))
    left_norm = sqrt(sum(a * a for a in left))
    right_norm = sqrt(sum(b * b for b in right))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def _select_mmr_documents(
    documents: List[Document],
    query_embedding: List[float],
    k: int,
    lambda_mult: float,
) -> List[Document]:
    """Select diverse documents when the RPC returns their stored embeddings."""
    vectors = [doc.metadata.pop("_embedding", None) for doc in documents]
    if not documents or any(not isinstance(vector, list) for vector in vectors):
        return documents[:k]

    query_scores = [_cosine_similarity(query_embedding, vector) for vector in vectors]
    selected_indices: List[int] = []
    remaining_indices = list(range(len(documents)))

    while remaining_indices and len(selected_indices) < k:
        if not selected_indices:
            selected = max(remaining_indices, key=lambda index: query_scores[index])
        else:
            def mmr_score(index: int) -> float:
                redundancy = max(
                    _cosine_similarity(vectors[index], vectors[chosen])
                    for chosen in selected_indices
                )
                return lambda_mult * query_scores[index] - (1 - lambda_mult) * redundancy

            selected = max(remaining_indices, key=mmr_score)

        selected_indices.append(selected)
        remaining_indices.remove(selected)

    return [documents[index] for index in selected_indices]


class SupabaseSemanticRetriever(BaseRetriever):
    """Retriever using the supported supabase-py RPC call interface directly."""

    client: Any = Field(exclude=True)
    embeddings: Any = Field(exclude=True)
    k: int = 3
    fetch_k: int = 20
    filter_kwargs: Dict[str, Any] = Field(default_factory=dict)
    use_mmr: bool = False
    lambda_mult: float = 0.5

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager=None,
    ) -> List[Document]:
        query_embedding = self.embeddings.embed_query(query)
        response = self.client.rpc(
            "match_document_chunks",
            {
                "query_embedding": query_embedding,
                "match_count": self.fetch_k if self.use_mmr else self.k,
                "filter": self.filter_kwargs.get("filter", {}),
            },
        ).execute()
        rows = response.data or []

        documents = []
        for row in rows:
            metadata = dict(row.get("metadata") or {})
            if self.use_mmr:
                metadata["_embedding"] = row.get("embedding")
            documents.append(
                Document(
                    page_content=row.get("content") or "",
                    metadata=metadata,
                )
            )

        if not self.use_mmr:
            return documents[: self.k]
        return _select_mmr_documents(
            documents,
            query_embedding,
            self.k,
            self.lambda_mult,
        )


class SupabaseVectorStore:
    """A vector-store facade for the existing retrieval functions.

    ``langchain-community==0.2.5`` accesses old private PostgREST builder APIs
    that are incompatible with current ``supabase-py`` releases. This facade
    keeps LangChain's retriever interface while using the public RPC API.
    """

    def __init__(self, embeddings: Any, client: Any):
        self._embeddings = embeddings
        self._client = client

    def as_retriever(
        self,
        search_type: str = "similarity",
        search_kwargs: Optional[Dict[str, Any]] = None,
    ) -> SupabaseSemanticRetriever:
        options = search_kwargs or {}
        return SupabaseSemanticRetriever(
            client=self._client,
            embeddings=self._embeddings,
            k=options.get("k", 3),
            fetch_k=options.get("fetch_k", options.get("k", 3)),
            filter_kwargs={"filter": options.get("filter", {})},
            use_mmr=search_type == "mmr",
            lambda_mult=options.get("lambda_mult", 0.5),
        )


def get_vector_store(embeddings, client) -> SupabaseVectorStore:
    return SupabaseVectorStore(embeddings=embeddings, client=client)


class SupabaseKeywordRetriever(BaseRetriever):
    client: Any = Field(exclude=True)
    k: int = 10
    filter_kwargs: Dict[str, Any] = Field(default_factory=dict)

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager=None,
    ) -> List[Document]:
        res = self.client.rpc(
            "match_keyword_chunks",
            {
                "query": query,
                "match_count": self.k,
                "filter": self.filter_kwargs.get("filter", {}),
            },
        ).execute()
        rows = res.data or []

        return [
            Document(
                page_content=row.get("content") or "",
                metadata=row.get("metadata") or {},
            )
            for row in rows
        ]
