-- Add reference solution fields to challenges for AI comparison
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS reference_video_url TEXT,
ADD COLUMN IF NOT EXISTS reference_actions_json JSONB;

-- Comments for documentation
COMMENT ON COLUMN public.challenges.reference_video_url IS 'URL of the reference video showing the expected solution (recorded by admin via Chrome extension)';
COMMENT ON COLUMN public.challenges.reference_actions_json IS 'JSON of expected actions extracted from the reference video (clicks, inputs, navigation)';
