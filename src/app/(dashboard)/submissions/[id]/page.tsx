'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Trophy, Robot, User } from '@phosphor-icons/react';
import MuxVideoPlayer from '@/components/MuxVideoPlayer';

interface Submission {
  id: string;
  status: string;
  created_at: string;
  duration: number | null;
  bubble_url: string | null;
  mux_playback_id: string | null;
  video_url: string | null;
  challenges: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    points_base: number;
    criteria_design: string;
    criteria_functionality: string;
    criteria_completion: string;
  } | null;
  reviews: Array<{
    id: string;
    score_design: number;
    score_functionality: number;
    score_completion: number;
    comment: string | null;
    is_ai_review: boolean;
    created_at: string;
  }>;
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmission = async () => {
      const { id } = await params;
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          challenges (
            id,
            title,
            description,
            difficulty,
            points_base,
            criteria_design,
            criteria_functionality,
            criteria_completion
          ),
          reviews (
            id,
            score_design,
            score_functionality,
            score_completion,
            comment,
            is_ai_review,
            created_at
          )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setSubmission(data);
      }
      setLoading(false);
    };

    fetchSubmission();
  }, [params]);

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6d28d9]"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl">
          Soumission introuvable
        </div>
      </div>
    );
  }

  const review = submission.reviews?.[0];
  const totalScore = review
    ? review.score_design + review.score_functionality + review.score_completion
    : null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back link */}
      <Link
        href="/submissions"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
      >
        <ArrowLeft size={16} />
        Retour a mes soumissions
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {submission.challenges?.title || 'Soumission'}
        </h1>
        <p className="text-gray-500 mt-1">
          Soumis le {new Date(submission.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Video Player */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="p-4 bg-gray-900">
          {submission.mux_playback_id ? (
            <MuxVideoPlayer
              playbackId={submission.mux_playback_id}
              title={submission.challenges?.title || 'Ma soumission'}
            />
          ) : submission.video_url ? (
            <video
              src={submission.video_url}
              controls
              className="w-full rounded-lg"
              style={{ aspectRatio: '16/9' }}
            />
          ) : (
            <div className="aspect-video flex items-center justify-center bg-gray-800 rounded-lg">
              <p className="text-gray-400">Video en cours de traitement...</p>
            </div>
          )}
        </div>

        {/* Info bar */}
        <div className="px-4 py-3 bg-gray-50 flex items-center justify-between border-t">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {submission.duration && (
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {formatDuration(submission.duration)}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              submission.status === 'reviewed'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {submission.status === 'reviewed' ? 'Corrige' : 'En attente'}
            </span>
          </div>
        </div>
      </div>

      {/* Review Results */}
      {review && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            {review.is_ai_review ? (
              <Robot size={20} className="text-purple-600" />
            ) : (
              <User size={20} className="text-blue-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {review.is_ai_review ? 'Correction par IA' : 'Correction'}
            </h2>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Design</p>
              <p className="text-2xl font-bold text-gray-900">{review.score_design}/5</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Fonctionnalites</p>
              <p className="text-2xl font-bold text-gray-900">{review.score_functionality}/5</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500 mb-1">Realisation</p>
              <p className="text-2xl font-bold text-gray-900">{review.score_completion}/5</p>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-center gap-2 py-3 bg-purple-50 rounded-xl mb-4">
            <Trophy size={20} className="text-purple-600" />
            <span className="text-lg font-bold text-purple-700">
              Score total: {totalScore}/15
            </span>
          </div>

          {/* Comment */}
          {review.comment && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Commentaire:</p>
              <p className="text-gray-600 whitespace-pre-wrap">{review.comment}</p>
            </div>
          )}
        </div>
      )}

      {/* Challenge Info */}
      {submission.challenges && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Criteres du defi
          </h2>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Design (0-5)</p>
              <p className="text-sm text-gray-600">{submission.challenges.criteria_design}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Fonctionnalites (0-5)</p>
              <p className="text-sm text-gray-600">{submission.challenges.criteria_functionality}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Realisation (0-5)</p>
              <p className="text-sm text-gray-600">{submission.challenges.criteria_completion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
