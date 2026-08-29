from typing import List, Optional, Dict, Any


def retrieve_chunks(query: str, vector_store, filter_kwargs: Optional[Dict[str, Any]] = None):
    search_kwargs: Dict[str, Any] = {"k": 3}
    if filter_kwargs:
        search_kwargs.update(filter_kwargs)
    retriever = vector_store.as_retriever(search_kwargs=search_kwargs)
    return retriever.invoke(query) or []


def retrieve_chunks_multi(
    llm,
    query: str,
    vector_store,
    filter_kwargs: Optional[Dict[str, Any]] = None,
    bm25_retriever=None,
):
    prompt = f"""Generate 3 different variations of this query that would help retrieve relevant documents:

Original query: {query}

Return 3 alternative queries that rephrase or approach the same question from different but similar angles.

Return only the 3 queries, one per line, with no numbering or extra text."""

    response = llm.invoke(prompt)
    text = response.content if hasattr(response, "content") else str(response)
    text = text or ""

    query_variations = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ][:3]
    # A provider can return an empty response. The original query is still a
    # valid retrieval query and avoids passing an empty result set downstream.
    if not query_variations:
        query_variations = [query]

    search_kwargs: Dict[str, Any] = {"k": 15, "fetch_k": 70, "lambda_mult": 0.55}
    if filter_kwargs:
        search_kwargs.update(filter_kwargs)
    retriever = vector_store.as_retriever(search_type="mmr", search_kwargs=search_kwargs)
    all_retrieval_results = []

    for query_var in query_variations:
        docs = retriever.invoke(query_var) or []
        all_retrieval_results.append(docs)

        if bm25_retriever:
            sparse_docs = bm25_retriever.invoke(query_var) or []
            all_retrieval_results.append(sparse_docs)

    return all_retrieval_results
