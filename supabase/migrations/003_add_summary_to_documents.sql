-- Migration 003: Add AI-generated summary column to documents
-- Run this in the Supabase SQL editor after migration 002.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary text;
