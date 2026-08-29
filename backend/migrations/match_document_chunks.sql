-- =============================================================================
-- Migration: match_document_chunks
-- Description: pgvector similarity search function for LangChain SupabaseVectorStore.
--              Includes 'embedding' column in the return table required for MMR search.
--              Supports optional filtering by document_id and arbitrary metadata.
-- Run this in the Supabase SQL Editor (or via psql).
-- =============================================================================

-- 1. Enable pgvector extension (safe to re-run)
create extension if not exists vector;

-- 2. Table definition (matches SQLAlchemy ORM models in backend/api/models.py)
create table if not exists chunks (
  chunk_id    uuid primary key default gen_random_uuid(),
  document_id uuid references documents(document_id) on delete cascade,
  chunk_index integer not null default 0,
  content     text not null,
  metadata    jsonb not null default '{}',
  embedding   vector(1536)
);

-- 3. If table was previously created with json type, convert to jsonb (required for GIN index & @>)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'chunks'
      and column_name = 'metadata'
      and data_type = 'json'
  ) then
    alter table chunks alter column metadata type jsonb using metadata::jsonb;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Indexes
-- -----------------------------------------------------------------------------

-- ANN index for vector cosine similarity search.
-- HNSW provides superior recall/latency without needing retraining as table grows.
create index if not exists chunks_embedding_hnsw_idx
  on chunks
  using hnsw (embedding vector_cosine_ops);

-- Dedicated index for filtering by document_id.
create index if not exists chunks_metadata_document_id_idx
  on chunks ((metadata ->> 'document_id'));

-- General-purpose GIN index for arbitrary metadata containment filters (@>).
create index if not exists chunks_metadata_gin_idx
  on chunks using gin (metadata);

-- -----------------------------------------------------------------------------
-- 5. Function for LangChain SupabaseVectorStore (with embedding for MMR)
-- -----------------------------------------------------------------------------

-- Drop existing function if the signature or return type changed
drop function if exists match_document_chunks(vector, int, jsonb);

-- Create the match function
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_count     int     default 10,
  filter          jsonb   default '{}'
)
returns table (
  id          uuid,
  content     text,
  metadata    jsonb,
  embedding   vector(1536),
  similarity  float
)
language plpgsql
as $$
begin
  return query
  select
    c.chunk_id                             as id,
    c.content                              as content,
    c.metadata                             as metadata,
    c.embedding                            as embedding,
    1 - (c.embedding <=> query_embedding)  as similarity
  from chunks c
  where
    -- Optional document filter: supports single {"document_id": "<uuid>"} or multiple {"document_ids": ["<uuid1>", "<uuid2>"]}
    (
      (filter->'document_ids' is null and filter->>'document_id' is null)
      or (filter->'document_ids' is not null and (filter->'document_ids' ? (c.metadata->>'document_id') or (c.document_id is not null and filter->'document_ids' ? c.document_id::text)))
      or (filter->>'document_id' is not null and (c.metadata->>'document_id' = filter->>'document_id' or c.document_id::text = filter->>'document_id'))
    )
    -- Generic JSONB containment for any other filters
    and c.metadata @> (filter - 'document_id' - 'document_ids')
  order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;
