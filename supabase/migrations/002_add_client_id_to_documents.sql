-- Migration 002: Add client association + switch to Voyage AI embeddings (512-dim)
--
-- Run this in the Supabase SQL editor after migration 001.
-- If you have existing data with 1536-dim embeddings, you'll need to re-index documents.

-- 1. Add client_id foreign key to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);

-- 2. Add CRM fields to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 3. Update vector dimension from 1536 (OpenAI) to 512 (Voyage voyage-3-lite)
-- Drop old index and column, recreate with new dimension
-- WARNING: This deletes all existing embeddings. Re-index documents after running.
DROP INDEX IF EXISTS chunks_embedding_idx;
ALTER TABLE public.chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.chunks ADD COLUMN embedding vector(512);
CREATE INDEX ON public.chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Update the search_chunks function for client_id filter and new schema
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(512),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_status TEXT DEFAULT NULL,
  filter_doc_type TEXT DEFAULT NULL,
  filter_client_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  chunk_type TEXT,
  content_text TEXT,
  slide_number INTEGER,
  page_number INTEGER,
  similarity FLOAT,
  filename TEXT,
  doc_type TEXT,
  client_type TEXT,
  content_type TEXT,
  status TEXT,
  upload_date DATE,
  storage_url TEXT,
  thumbnail_url TEXT,
  client_name TEXT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    c.id AS chunk_id,
    d.id AS document_id,
    c.chunk_type,
    c.content_text,
    c.slide_number,
    c.page_number,
    1 - (c.embedding <=> query_embedding) AS similarity,
    d.filename,
    d.type AS doc_type,
    d.client_type,
    d.content_type,
    d.status,
    d.upload_date,
    d.storage_url,
    d.thumbnail_url,
    cl.name AS client_name
  FROM public.chunks c
  JOIN public.documents d ON c.document_id = d.id
  LEFT JOIN public.clients cl ON d.client_id = cl.id
  WHERE
    1 - (c.embedding <=> query_embedding) > match_threshold
    AND (filter_status IS NULL OR d.status = filter_status)
    AND (filter_doc_type IS NULL OR d.type = filter_doc_type)
    AND (filter_client_id IS NULL OR d.client_id::text = filter_client_id)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- 5. Allow authenticated users to delete documents (for admin functionality)
CREATE POLICY "Authenticated users can delete documents" ON public.documents
  FOR DELETE USING (auth.role() = 'authenticated');
