-- Add new fields to challenges table
-- Run this in your Supabase SQL Editor

-- Create category enum type
DO $$ BEGIN
    CREATE TYPE challenge_category AS ENUM ('web', 'mobile', 'both');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to challenges table
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS result_image_url TEXT,
ADD COLUMN IF NOT EXISTS resources TEXT,
ADD COLUMN IF NOT EXISTS category challenge_category DEFAULT 'both';

-- Add comment for documentation
COMMENT ON COLUMN public.challenges.result_image_url IS 'URL of the expected result image (optional)';
COMMENT ON COLUMN public.challenges.resources IS 'Rich text resources with links (HTML/Markdown)';
COMMENT ON COLUMN public.challenges.category IS 'Challenge category: web, mobile, or both';
