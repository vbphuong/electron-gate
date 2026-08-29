-- Migration: Add document_id column to conversations table with cascade delete
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(document_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conversations_document_id ON conversations(document_id);
