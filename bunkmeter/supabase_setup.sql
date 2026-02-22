-- Run this in your Supabase SQL Editor
-- Go to: https://supabase.com → Your Project → SQL Editor → New Query

CREATE TABLE IF NOT EXISTS bunkmeter_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  attendance JSONB NOT NULL DEFAULT '{}',
  logs JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow only one row (your personal data)
-- No auth needed for now — it's just you using this

-- Enable Row Level Security (optional but recommended)
ALTER TABLE bunkmeter_data ENABLE ROW LEVEL SECURITY;

-- Allow all operations (since this is personal use only)
CREATE POLICY "Allow all" ON bunkmeter_data FOR ALL USING (true) WITH CHECK (true);
