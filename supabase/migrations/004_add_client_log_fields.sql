-- Add folder link, contacts, and custom documents to client_logs
ALTER TABLE public.client_logs
  ADD COLUMN IF NOT EXISTS folder_link TEXT,
  ADD COLUMN IF NOT EXISTS contacts TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS custom_documents TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.client_logs.folder_link IS 'Optional link to shared folder (e.g. SharePoint, Google Drive)';
COMMENT ON COLUMN public.client_logs.contacts IS 'Names of client contacts the materials were sent to';
COMMENT ON COLUMN public.client_logs.custom_documents IS 'Free-text document/file type entries not in the system';
