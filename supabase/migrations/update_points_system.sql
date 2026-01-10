-- Update points system: points = sum of scores only (max 15)
-- No base points for submitting

-- Drop and recreate the trigger function
CREATE OR REPLACE FUNCTION update_user_points_after_review()
RETURNS TRIGGER AS $$
DECLARE
  submission_user_id UUID;
  total_score INTEGER;
BEGIN
  -- Get the submission owner
  SELECT s.user_id
  INTO submission_user_id
  FROM public.submissions s
  WHERE s.id = NEW.submission_id;

  -- Calculate total score (sum of 3 criteria, max 15)
  total_score := NEW.score_design + NEW.score_functionality + NEW.score_completion;

  -- Update submission owner points
  UPDATE public.profiles
  SET total_points = total_points + total_score,
      updated_at = NOW()
  WHERE id = submission_user_id;

  -- Update reviewer points (bonus for reviewing)
  UPDATE public.profiles
  SET total_points = total_points + 5,
      reviews_count = reviews_count + 1,
      updated_at = NOW()
  WHERE id = NEW.reviewer_id;

  -- Update submission status
  UPDATE public.submissions
  SET status = 'reviewed',
      updated_at = NOW()
  WHERE id = NEW.submission_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
