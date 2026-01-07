-- Bubble Challenge Platform - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM types
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE submission_status AS ENUM ('pending', 'reviewed');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  total_points INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenges table
CREATE TABLE public.challenges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  time_limit INTEGER NOT NULL, -- in minutes
  criteria_design TEXT NOT NULL,
  criteria_functionality TEXT NOT NULL,
  criteria_completion TEXT NOT NULL,
  difficulty difficulty_level DEFAULT 'medium',
  points_base INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE public.submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  actions_json JSONB,
  duration INTEGER, -- in milliseconds
  status submission_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score_design INTEGER CHECK (score_design >= 0 AND score_design <= 5) NOT NULL,
  score_functionality INTEGER CHECK (score_functionality >= 0 AND score_functionality <= 5) NOT NULL,
  score_completion INTEGER CHECK (score_completion >= 0 AND score_completion <= 5) NOT NULL,
  feedback_video_url TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent self-review
  CONSTRAINT no_self_review CHECK (reviewer_id != (SELECT user_id FROM public.submissions WHERE id = submission_id))
);

-- Leaderboard view
CREATE VIEW public.leaderboard AS
SELECT
  p.id,
  p.username,
  p.avatar_url,
  p.total_points,
  p.submissions_count,
  p.reviews_count,
  RANK() OVER (ORDER BY p.total_points DESC) as rank
FROM public.profiles p
WHERE p.total_points > 0
ORDER BY p.total_points DESC;

-- Function to update user points after review
CREATE OR REPLACE FUNCTION update_user_points_after_review()
RETURNS TRIGGER AS $$
DECLARE
  submission_user_id UUID;
  total_score INTEGER;
  base_points INTEGER;
BEGIN
  -- Get the submission owner and challenge base points
  SELECT s.user_id, c.points_base
  INTO submission_user_id, base_points
  FROM public.submissions s
  JOIN public.challenges c ON s.challenge_id = c.id
  WHERE s.id = NEW.submission_id;

  -- Calculate total score
  total_score := base_points + NEW.score_design + NEW.score_functionality + NEW.score_completion;

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

-- Trigger for updating points
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_points_after_review();

-- Function to increment submissions count
CREATE OR REPLACE FUNCTION increment_submissions_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET submissions_count = submissions_count + 1,
      updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for submissions count
CREATE TRIGGER on_submission_created
  AFTER INSERT ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION increment_submissions_count();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Challenges policies
CREATE POLICY "Challenges are viewable by everyone" ON public.challenges
  FOR SELECT USING (true);

-- Submissions policies
CREATE POLICY "Submissions are viewable by everyone" ON public.submissions
  FOR SELECT USING (true);

CREATE POLICY "Users can create submissions" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions" ON public.submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

-- Sample challenges (optional)
INSERT INTO public.challenges (title, description, time_limit, criteria_design, criteria_functionality, criteria_completion, difficulty, points_base) VALUES
(
  'Créer un bouton animé',
  'Créez un bouton avec une animation au survol. Le bouton doit changer de couleur et avoir une transition fluide.',
  15,
  'Le bouton est esthétique et les couleurs sont harmonieuses',
  'L''animation fonctionne correctement au survol',
  'Toutes les étapes sont complétées',
  'easy',
  10
),
(
  'Formulaire de contact',
  'Créez un formulaire de contact avec validation. Champs: Nom, Email, Message. Affichez une confirmation après envoi.',
  30,
  'Le formulaire est bien présenté et responsive',
  'La validation fonctionne et les erreurs sont affichées',
  'Le formulaire envoie les données et affiche la confirmation',
  'medium',
  15
),
(
  'Liste dynamique avec filtres',
  'Créez une liste d''éléments avec un système de filtrage par catégorie et une barre de recherche.',
  45,
  'L''interface est intuitive et le design est soigné',
  'Les filtres et la recherche fonctionnent correctement',
  'Toutes les fonctionnalités demandées sont implémentées',
  'hard',
  20
);
