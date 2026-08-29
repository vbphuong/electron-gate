-- =============================================================================
-- Migration: match_keyword_chunks
-- Description: Keyword search function for hybrid RAG.
--              Assumes the 'fts' generated tsvector column already exists on chunks.
--              Supports optional filtering by document_id and arbitrary metadata.
-- Run this in the Supabase SQL Editor (or via psql).
-- =============================================================================

-- 1. Add the generated Full-Text Search column to the chunks table
alter table chunks add column if not exists fts tsvector generated always as (to_tsvector('english', content)) stored;

-- 2. Create GIN index for fast full-text search if it doesn't already exist
create index if not exists chunks_fts_idx on chunks using gin (fts);

-- Create the keyword search RPC
create or replace function match_keyword_chunks(
  query text,
  match_count int default 10,
  filter jsonb default '{}'
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
) language plpgsql as $$
declare
  query_tsquery tsquery;
begin
  -- Convert plainto_tsquery's ANDs (&) to ORs (|) for better recall on natural language queries
  query_tsquery := nullif(replace(plainto_tsquery('english', query)::text, '&', '|'), '')::tsquery;

  return query
  select
    c.chunk_id as id,
    c.content as content,
    c.metadata as metadata,
    ts_rank(c.fts, query_tsquery)::float as similarity
  from chunks c
  where
    c.fts @@ query_tsquery
    -- Optional document filter: supports single {"document_id": "<uuid>"} or multiple {"document_ids": ["<uuid1>", "<uuid2>"]}
    and (
      (filter->'document_ids' is null and filter->>'document_id' is null)
      or (filter->'document_ids' is not null and (filter->'document_ids' ? (c.metadata->>'document_id') or (c.document_id is not null and filter->'document_ids' ? c.document_id::text)))
      or (filter->>'document_id' is not null and (c.metadata->>'document_id' = filter->>'document_id' or c.document_id::text = filter->>'document_id'))
    )
    -- Generic JSONB containment for any other filters
    and c.metadata @> (filter - 'document_id' - 'document_ids')
  order by similarity desc
  limit match_count;
end;
$$;
