'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Submission {
  id: string;
  video_url: string;
  duration: number;
  created_at: string;
  challenges: {
    title: string;
    description: string;
    criteria_design: string;
    criteria_functionality: string;
    criteria_completion: string;
    points_base: number;
  };
  profiles: {
    username: string;
  };
}

export default function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [scoreDesign, setScoreDesign] = useState(3);
  const [scoreFunctionality, setScoreFunctionality] = useState(3);
  const [scoreCompletion, setScoreCompletion] = useState(3);
  const [comment, setComment] = useState('');

  useEffect(() => {
    async function loadSubmission() {
      const { id } = await params;
      const supabase = createClient();

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          challenges (
            title,
            description,
            criteria_design,
            criteria_functionality,
            criteria_completion,
            points_base
          ),
          profiles (
            username
          )
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        setError('Soumission introuvable');
      } else {
        setSubmission(data);
      }
      setLoading(false);
    }

    loadSubmission();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !submission) {
      setError('Erreur d\'authentification');
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('reviews')
      .insert({
        submission_id: submission.id,
        reviewer_id: user.id,
        score_design: scoreDesign,
        score_functionality: scoreFunctionality,
        score_completion: scoreCompletion,
        comment: comment || null,
      });

    if (error) {
      setError('Erreur lors de l\'envoi de l\'evaluation');
      setSubmitting(false);
    } else {
      router.push('/review?success=1');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => router.back()}
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Retour
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {submission?.challenges?.title}
        </h1>
        <p className="text-gray-500 mb-4">
          Soumis par <span className="font-medium">{submission?.profiles?.username}</span>
        </p>
        <p className="text-gray-600">{submission?.challenges?.description}</p>
      </div>

      {submission?.video_url && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Video de la soumission</h2>
          <video
            src={submission.video_url}
            controls
            className="w-full rounded-lg bg-black"
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-6">Votre evaluation</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Design Score */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Design ({scoreDesign}/5)
            </label>
            <p className="text-sm text-gray-500 mb-2">
              {submission?.challenges?.criteria_design}
            </p>
            <input
              type="range"
              min="0"
              max="5"
              value={scoreDesign}
              onChange={(e) => setScoreDesign(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          {/* Functionality Score */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Fonctionnalites ({scoreFunctionality}/5)
            </label>
            <p className="text-sm text-gray-500 mb-2">
              {submission?.challenges?.criteria_functionality}
            </p>
            <input
              type="range"
              min="0"
              max="5"
              value={scoreFunctionality}
              onChange={(e) => setScoreFunctionality(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          {/* Completion Score */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Realisation ({scoreCompletion}/5)
            </label>
            <p className="text-sm text-gray-500 mb-2">
              {submission?.challenges?.criteria_completion}
            </p>
            <input
              type="range"
              min="0"
              max="5"
              value={scoreCompletion}
              onChange={(e) => setScoreCompletion(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block font-medium text-gray-900 mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Donnez des conseils constructifs..."
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex justify-between items-center">
          <div className="text-gray-600">
            Score total: <span className="font-bold text-blue-600">
              {scoreDesign + scoreFunctionality + scoreCompletion}/15
            </span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Envoi...' : 'Soumettre l\'evaluation'}
          </button>
        </div>
      </form>
    </div>
  );
}
