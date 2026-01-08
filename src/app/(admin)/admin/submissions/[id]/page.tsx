'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Robot, User, Clock, CheckCircle, XCircle, CaretDown, CaretRight, Image as ImageIcon, VideoCamera } from '@phosphor-icons/react';
import MuxVideoPlayer from '@/components/MuxVideoPlayer';

interface ActionData {
  t: number;
  type: string;
  text?: string;
  element?: string;
  context?: string;
  value?: string;
  label?: string;
  key?: string;
  url?: string;
  x?: number;
  y?: number;
  [key: string]: unknown;
}

interface SubmissionData {
  actions?: ActionData[];
  screenshots?: Array<{ t: number; data: string }>;
  metadata?: Record<string, unknown>;
}

interface Submission {
  id: string;
  status: string;
  created_at: string;
  duration: number | null;
  bubble_url: string | null;
  actions_json: SubmissionData | ActionData[] | null;
  mux_playback_id: string | null;
  mux_asset_id: string | null;
  video_url: string | null;
  challenges: {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    criteria_design: string;
    criteria_functionality: string;
    criteria_completion: string;
    ai_correction_enabled: boolean;
    reference_actions_json: SubmissionData | ActionData[] | null;
    reference_video_playback_id: string | null;
  } | null;
  profiles: {
    username: string;
    email: string;
  } | null;
  reviews: Array<{
    id: string;
    score_design: number;
    score_functionality: number;
    score_completion: number;
    comment: string | null;
    is_ai_review: boolean;
    created_at: string;
    profiles: {
      username: string;
    } | null;
  }>;
}

// Extract actions from data (handles both old and new format)
function extractActions(data: SubmissionData | ActionData[] | null): ActionData[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'object' && 'actions' in data) {
    return (data.actions as ActionData[]) || [];
  }
  return [];
}

// Extract screenshots
function extractScreenshots(data: SubmissionData | ActionData[] | null): Array<{ t: number; data: string }> {
  if (!data || Array.isArray(data)) return [];
  if (typeof data === 'object' && 'screenshots' in data) {
    return (data.screenshots as Array<{ t: number; data: string }>) || [];
  }
  return [];
}

// Format timestamp
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Action type badge
function ActionBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    click: 'bg-blue-100 text-blue-700',
    input: 'bg-green-100 text-green-700',
    keypress: 'bg-yellow-100 text-yellow-700',
    scroll: 'bg-gray-100 text-gray-700',
    drag: 'bg-purple-100 text-purple-700',
    navigate: 'bg-orange-100 text-orange-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
      {type}
    </span>
  );
}

// Action row component
function ActionRow({ action, index }: { action: ActionData; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const getDescription = () => {
    switch (action.type) {
      case 'click':
        return action.text || action.element || 'Element';
      case 'input':
        return `${action.label || action.element || 'Champ'}: "${action.value || ''}"`;
      case 'keypress':
        return action.key || '';
      case 'navigate':
        return action.url || '';
      case 'drag':
        return `${action.text || action.element || 'Element'} deplace`;
      case 'scroll':
        return `Position Y: ${action.y || 0}`;
      default:
        return '';
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs text-gray-400 w-8">{index + 1}</span>
        <span className="text-xs text-gray-500 w-12 font-mono">{formatTime(action.t)}</span>
        <ActionBadge type={action.type} />
        <span className="flex-1 text-sm text-gray-700 truncate">{getDescription()}</span>
        {action.context && (
          <span className="text-xs text-gray-400 truncate max-w-[200px]">{action.context}</span>
        )}
        {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
      </div>
      {expanded && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(action, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// Actions panel component
function ActionsPanel({
  title,
  actions,
  screenshots,
  icon,
  color,
}: {
  title: string;
  actions: ActionData[];
  screenshots: Array<{ t: number; data: string }>;
  icon: React.ReactNode;
  color: string;
}) {
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-4 py-3 ${color} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-white">{title}</h3>
          <span className="bg-white/20 px-2 py-0.5 rounded text-xs text-white">
            {actions.length} actions
          </span>
        </div>
        {screenshots.length > 0 && (
          <button
            onClick={() => setShowScreenshots(!showScreenshots)}
            className="flex items-center gap-1 text-white/80 hover:text-white text-xs"
          >
            <ImageIcon size={14} />
            {screenshots.length} captures
          </button>
        )}
      </div>

      {/* Screenshots gallery */}
      {showScreenshots && screenshots.length > 0 && (
        <div className="p-4 bg-gray-900 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {screenshots.map((ss, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedScreenshot(selectedScreenshot === idx ? null : idx)}
                className={`flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
                  selectedScreenshot === idx ? 'border-white' : 'border-transparent'
                }`}
              >
                <img
                  src={ss.data}
                  alt={`Capture ${idx + 1}`}
                  className="h-16 w-auto object-cover"
                />
                <div className="text-xs text-gray-400 text-center py-1">
                  {formatTime(ss.t)}
                </div>
              </button>
            ))}
          </div>
          {selectedScreenshot !== null && (
            <div className="mt-4">
              <img
                src={screenshots[selectedScreenshot].data}
                alt={`Capture ${selectedScreenshot + 1}`}
                className="max-w-full rounded-lg border border-gray-700"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions list */}
      <div className="max-h-[400px] overflow-y-auto">
        {actions.length > 0 ? (
          actions.map((action, idx) => (
            <ActionRow key={idx} action={action} index={idx} />
          ))
        ) : (
          <div className="p-8 text-center text-gray-400">
            Aucune action enregistree
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminSubmissionDetailPage({
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

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          challenges (
            id,
            title,
            description,
            difficulty,
            criteria_design,
            criteria_functionality,
            criteria_completion,
            ai_correction_enabled,
            reference_actions_json,
            reference_video_playback_id
          ),
          profiles (username, email),
          reviews (
            id,
            score_design,
            score_functionality,
            score_completion,
            comment,
            is_ai_review,
            created_at,
            profiles (username)
          )
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        setSubmission(data);
      }
      setLoading(false);
    };

    fetchSubmission();
  }, [params]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#001354]"></div>
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

  const studentActions = extractActions(submission.actions_json);
  const studentScreenshots = extractScreenshots(submission.actions_json);
  const referenceActions = extractActions(submission.challenges?.reference_actions_json || null);
  const referenceScreenshots = extractScreenshots(submission.challenges?.reference_actions_json || null);
  const review = submission.reviews?.[0];
  const totalScore = review
    ? review.score_design + review.score_functionality + review.score_completion
    : null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/submissions"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
        >
          <ArrowLeft size={16} />
          Retour aux soumissions
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Detail de la soumission
            </h1>
            <p className="text-gray-500 mt-1">
              {submission.challenges?.title} - par {submission.profiles?.username}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            submission.status === 'reviewed'
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {submission.status === 'reviewed' ? 'Corrige' : 'En attente'}
          </span>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Date</p>
          <p className="font-medium text-gray-900">
            {new Date(submission.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Duree</p>
          <p className="font-medium text-gray-900 flex items-center gap-1">
            <Clock size={16} />
            {submission.duration ? formatTime(submission.duration) : '-'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Correction IA</p>
          <p className="font-medium text-gray-900 flex items-center gap-1">
            {submission.challenges?.ai_correction_enabled ? (
              <>
                <CheckCircle size={16} className="text-green-500" />
                Activee
              </>
            ) : (
              <>
                <XCircle size={16} className="text-gray-400" />
                Desactivee
              </>
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Score</p>
          <p className="font-medium text-gray-900">
            {totalScore !== null ? `${totalScore}/15` : '-'}
          </p>
        </div>
      </div>

      {/* Review result */}
      {review && (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6">
          <div className="flex items-center gap-2 mb-4">
            {review.is_ai_review ? (
              <Robot size={20} className="text-purple-600" />
            ) : (
              <User size={20} className="text-blue-600" />
            )}
            <h3 className="font-semibold text-gray-900">
              Correction {review.is_ai_review ? 'par IA' : `par ${review.profiles?.username}`}
            </h3>
            <span className="text-xs text-gray-400">
              {new Date(review.created_at).toLocaleDateString('fr-FR')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Design</p>
              <p className="text-2xl font-bold text-gray-900">{review.score_design}/5</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Fonctionnalites</p>
              <p className="text-2xl font-bold text-gray-900">{review.score_functionality}/5</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Realisation</p>
              <p className="text-2xl font-bold text-gray-900">{review.score_completion}/5</p>
            </div>
          </div>

          {review.comment && (
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.comment}</p>
            </div>
          )}
        </div>
      )}

      {/* Video comparison */}
      {(submission.mux_playback_id || submission.challenges?.reference_video_playback_id) && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Reference video */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-emerald-600 flex items-center gap-2">
              <VideoCamera size={18} className="text-white" />
              <h3 className="font-semibold text-white">Video de reference</h3>
            </div>
            <div className="p-4">
              {submission.challenges?.reference_video_playback_id ? (
                <MuxVideoPlayer
                  playbackId={submission.challenges.reference_video_playback_id}
                  title="Video de reference"
                />
              ) : (
                <div className="bg-gray-100 rounded-xl flex items-center justify-center aspect-video">
                  <p className="text-gray-400">Aucune video de reference</p>
                </div>
              )}
            </div>
          </div>

          {/* Student video */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-blue-600 flex items-center gap-2">
              <VideoCamera size={18} className="text-white" />
              <h3 className="font-semibold text-white">Video de l'eleve</h3>
            </div>
            <div className="p-4">
              {submission.mux_playback_id ? (
                <MuxVideoPlayer
                  playbackId={submission.mux_playback_id}
                  title="Video de l'eleve"
                />
              ) : (
                <div className="bg-gray-100 rounded-xl flex items-center justify-center aspect-video">
                  <p className="text-gray-400">Aucune video disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions comparison */}
      <div className="grid grid-cols-2 gap-6">
        <ActionsPanel
          title="Actions de reference"
          actions={referenceActions}
          screenshots={referenceScreenshots}
          icon={<CheckCircle size={18} className="text-white" />}
          color="bg-emerald-600"
        />
        <ActionsPanel
          title="Actions de l'eleve"
          actions={studentActions}
          screenshots={studentScreenshots}
          icon={<User size={18} className="text-white" />}
          color="bg-blue-600"
        />
      </div>

      {/* Raw JSON debug */}
      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
          Afficher les donnees brutes (debug)
        </summary>
        <div className="mt-2 bg-gray-900 rounded-xl p-4 overflow-x-auto">
          <pre className="text-xs text-gray-300">
            {JSON.stringify({
              student_actions_count: studentActions.length,
              reference_actions_count: referenceActions.length,
              student_screenshots_count: studentScreenshots.length,
              reference_screenshots_count: referenceScreenshots.length,
              student_actions_sample: studentActions.slice(0, 5),
              reference_actions_sample: referenceActions.slice(0, 5),
            }, null, 2)}
          </pre>
        </div>
      </details>
    </div>
  );
}
