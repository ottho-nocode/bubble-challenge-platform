-- Add Mux video columns to challenges table (for reference videos)
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS reference_video_asset_id TEXT,
ADD COLUMN IF NOT EXISTS reference_video_playback_id TEXT,
ADD COLUMN IF NOT EXISTS reference_video_duration INTEGER;

-- Add Mux video columns to submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS mux_asset_id TEXT,
ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_submissions_mux_asset_id ON submissions(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_challenges_reference_video ON challenges(reference_video_playback_id);

-- Comment for documentation
COMMENT ON COLUMN challenges.reference_video_asset_id IS 'Mux asset ID for reference video';
COMMENT ON COLUMN challenges.reference_video_playback_id IS 'Mux playback ID for reference video streaming';
COMMENT ON COLUMN challenges.reference_video_duration IS 'Duration of reference video in milliseconds';
COMMENT ON COLUMN submissions.mux_asset_id IS 'Mux asset ID for submission video';
COMMENT ON COLUMN submissions.mux_playback_id IS 'Mux playback ID for submission video streaming';
