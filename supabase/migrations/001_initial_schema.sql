-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users profile table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pptx', 'xlsx', 'docx', 'pdf')),
  upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
  uploader UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL CHECK (product_type IN (
    'autocallable', 'capital_protected_note', 'barrier_reverse_convertible',
    'worst_of_best_of', 'leverage_certificate', 'interest_rate_structured',
    'credit_linked_note', 'other'
  )),
  client_type TEXT NOT NULL CHECK (client_type IN (
    'institutional', 'private_bank_eam', 'family_office', 'internal'
  )),
  content_type TEXT NOT NULL CHECK (content_type IN (
    'pitch_deck', 'product_explanation', 'payoff_diagram', 'pricing_model',
    'term_sheet', 'legal_regulatory', 'market_commentary'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  storage_url TEXT NOT NULL,
  thumbnail_url TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks table (slide/paragraph/section level content)
CREATE TABLE public.chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('slide', 'paragraph', 'section')),
  content_text TEXT NOT NULL,
  slide_number INTEGER,
  page_number INTEGER,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector similarity index
CREATE INDEX ON public.chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Slide images table
CREATE TABLE public.slide_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chunk_id UUID REFERENCES public.chunks(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('institutional', 'private_bank_eam', 'family_office', 'internal')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client log table
CREATE TABLE public.client_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  document_ids UUID[] NOT NULL DEFAULT '{}',
  sender_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date_sent DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slide_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Documents: authenticated users can read, admins can write
CREATE POLICY "Documents viewable by authenticated users" ON public.documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert documents" ON public.documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update documents" ON public.documents
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Chunks: authenticated users can read and write
CREATE POLICY "Chunks viewable by authenticated users" ON public.chunks
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert chunks" ON public.chunks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Slide images: authenticated users can read and write
CREATE POLICY "Slide images viewable by authenticated users" ON public.slide_images
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert slide images" ON public.slide_images
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Clients: authenticated users can read and write
CREATE POLICY "Clients viewable by authenticated users" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clients" ON public.clients
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Client logs: authenticated users can read and write
CREATE POLICY "Client logs viewable by authenticated users" ON public.client_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert client logs" ON public.client_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_product_type TEXT DEFAULT NULL,
  filter_status TEXT DEFAULT NULL,
  filter_doc_type TEXT DEFAULT NULL,
  filter_date_from DATE DEFAULT NULL,
  filter_date_to DATE DEFAULT NULL
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
  product_type TEXT,
  client_type TEXT,
  content_type TEXT,
  status TEXT,
  upload_date DATE,
  storage_url TEXT,
  thumbnail_url TEXT
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
    d.product_type,
    d.client_type,
    d.content_type,
    d.status,
    d.upload_date,
    d.storage_url,
    d.thumbnail_url
  FROM public.chunks c
  JOIN public.documents d ON c.document_id = d.id
  WHERE
    1 - (c.embedding <=> query_embedding) > match_threshold
    AND (filter_product_type IS NULL OR d.product_type = filter_product_type)
    AND (filter_status IS NULL OR d.status = filter_status)
    AND (filter_doc_type IS NULL OR d.type = filter_doc_type)
    AND (filter_date_from IS NULL OR d.upload_date >= filter_date_from)
    AND (filter_date_to IS NULL OR d.upload_date <= filter_date_to)
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Storage bucket setup (run manually in Supabase dashboard or via CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true);
