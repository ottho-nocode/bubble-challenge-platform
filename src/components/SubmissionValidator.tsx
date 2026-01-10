'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MuxVideoPlayer from './MuxVideoPlayer';
import { CheckCircle, XCircle, Clock, VideoCamera } from '@phosphor-icons/react';

interface Submission {
  id: string;
  mux_playback_id: string | null;
  status: string;
  created_at: string;
  duration: number | null;
}

interface SubmissionValidatorProps {
  submissionId: string;
  challengeId: string;
  challengeTitle: string;
}

export default function SubmissionValidator({
  submissionId,
  challengeId,
  challengeTitle,
}: SubmissionValidatorProps) {
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch submission data once
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        console.log('Fetching submission:', submissionId);
        const response = await fetch(`/api/submissions/${submissionId}`);
        const data = await response.json();

        console.log('Submission response:', response.status, data);

        if (response.ok && data.submission) {
          setSubmission(data.submission);
          setError(null);
        } else {
          console.error('Submission fetch error:', data);
          setError(data.error || 'Soumission introuvable');
        }
      } catch (err) {
        console.error('Error fetching submission:', err);
        setError('Erreur de connexion au serveur');
      }
      setLoading(false);
    };

    fetchSubmission();
  }, [submissionId]);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const response = await fetch(`/api/submissions/${submissionId}/validate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/submissions');
      } else {
        console.error('Validation error:', data);
        setError(data.error || 'Erreur lors de la validation');
      }
    } catch (err) {
      console.error('Validation connection error:', err);
      setError('Erreur de connexion');
    }
    setValidating(false);
  };

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette soumission ?')) return;

    try {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push(`/challenges/${challengeId}`);
        router.refresh();
      } else {
        const data = await response.json();
        setError(data.error || 'Erreur lors de l\'annulation');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#6d28d9]"></div>
          <span className="text-gray-600">Chargement de la soumission...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-3">
          <XCircle size={24} className="text-red-600" />
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <VideoCamera size={24} className="text-[#6d28d9]" />
        Valider votre soumission
      </h2>

      {/* Video Player or Processing State */}
      <div className="mb-6">
        {submission?.mux_playback_id ? (
          <MuxVideoPlayer
            playbackId={submission.mux_playback_id}
            title={`Soumission - ${challengeTitle}`}
          />
        ) : (
          <div className="bg-gray-100 rounded-xl py-8 px-4 flex flex-col items-center justify-center">
            <CheckCircle size={48} className="text-green-500 mb-3" />
            <p className="text-gray-700 font-medium">Enregistrement terminé</p>
            <p className="text-gray-500 text-sm mt-1 text-center">
              Vos actions ont été capturées. Cliquez sur Valider pour soumettre.
            </p>
          </div>
        )}
      </div>

      {/* Duration info */}
      {submission?.duration && (
        <p className="text-sm text-gray-500 mb-4">
          Durée: {Math.floor(submission.duration / 60000)}:{String(Math.floor((submission.duration % 60000) / 1000)).padStart(2, '0')}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleValidate}
          disabled={validating}
          className="flex-1 px-4 py-3 bg-[#6d28d9] text-white rounded-xl font-medium hover:bg-[#5b21b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {validating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Validation...
            </>
          ) : (
            'Valider'
          )}
        </button>
      </div>
    </div>
  );
}
