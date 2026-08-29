from collections import defaultdict


def reciprocal_rank_fusion(chunk_lists, k=60, verbose=False):
    rrf_scores = defaultdict(float)
    all_unique_chunks = {}
    chunk_id_map = {}
    chunk_counter = 1

    for query_idx, chunks in enumerate(chunk_lists or [], 1):
        if verbose:
            print(f"Processing Query {query_idx} results:")

        for position, chunk in enumerate(chunks or [], 1):
            chunk_content = chunk.page_content

            if chunk_content not in chunk_id_map:
                chunk_id_map[chunk_content] = f"Chunk_{chunk_counter}"
                chunk_counter += 1

            chunk_id = chunk_id_map[chunk_content]
            all_unique_chunks[chunk_content] = chunk
            position_score = 1 / (k + position)
            rrf_scores[chunk_content] += position_score

            if verbose:
                print(f"  Position {position}: {chunk_id} +{position_score:.4f} (running total: {rrf_scores[chunk_content]:.4f})")

    return sorted(
        [(all_unique_chunks[content], score) for content, score in rrf_scores.items()],
        key=lambda x: x[1],
        reverse=True,
    )


