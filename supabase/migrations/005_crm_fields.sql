-- CRM enhancements to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS expected_aum NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_aum NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'Engaged' CHECK (stage IN ('Lost Interest', 'Engaged', 'Expression of Interest', 'Unconfirmed Win', 'Won Funded')),
  ADD COLUMN IF NOT EXISTS win_probability INTEGER DEFAULT 50 CHECK (win_probability >= 0 AND win_probability <= 100),
  ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.clients.industry IS 'Client industry/sector';
COMMENT ON COLUMN public.clients.expected_aum IS 'Expected AUM in USD';
COMMENT ON COLUMN public.clients.actual_aum IS 'Actual AUM in USD (typically 0 unless Won Funded)';
COMMENT ON COLUMN public.clients.stage IS 'Current pipeline stage';
COMMENT ON COLUMN public.clients.win_probability IS 'Win probability 0-100%';
COMMENT ON COLUMN public.clients.contacts IS 'Array of contact objects [{name, email, phone, role}]';

-- Allow updates
CREATE POLICY "Authenticated users can update clients" ON public.clients
  FOR UPDATE USING (auth.role() = 'authenticated');
