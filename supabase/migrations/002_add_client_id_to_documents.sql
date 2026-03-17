-- Add client_id foreign key to documents table
-- This allows associating documents with specific clients for CRM functionality
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- Create index for efficient client-based queries
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);

-- Add contact_email and notes to clients table for CRM features
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS notes text;
