// Database types for Supabase

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type SubmissionStatus = 'pending' | 'reviewed';

export interface Profile {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  submissions_count: number;
  reviews_count: number;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  time_limit: number; // minutes
  criteria_design: string;
  criteria_functionality: string;
  criteria_completion: string;
  difficulty: DifficultyLevel;
  points_base: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  challenge_id: string;
  video_url: string;
  actions_json: Record<string, unknown> | null;
  duration: number | null; // milliseconds
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  profile?: Profile;
  challenge?: Challenge;
  review?: Review;
}

export interface Review {
  id: string;
  submission_id: string;
  reviewer_id: string;
  score_design: number; // 0-5
  score_functionality: number; // 0-5
  score_completion: number; // 0-5
  feedback_video_url: string | null;
  comment: string | null;
  created_at: string;
  // Joined data
  reviewer?: Profile;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  submissions_count: number;
  reviews_count: number;
  rank: number;
}

// API types
export interface SubmissionUpload {
  challenge_id: string;
  video_file: File;
  actions_json: Record<string, unknown>;
  duration: number;
}

export interface ReviewCreate {
  submission_id: string;
  score_design: number;
  score_functionality: number;
  score_completion: number;
  feedback_video_url?: string;
  comment?: string;
}
