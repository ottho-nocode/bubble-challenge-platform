import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import WebRecorderWrapper from '@/components/WebRecorderWrapper';
import MuxVideoPlayer from '@/components/MuxVideoPlayer';

const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
};

const difficultyLabels = {
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: challenge } = await supabase
    .from('challenges')
    .select('*')
    .eq('id', id)
    .single();

  if (!challenge) {
    notFound();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link
        href="/challenges"
        className="text-blue-600 hover:underline mb-4 inline-block"
      >
        &larr; Retour aux defis
      </Link>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Challenge Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                {challenge.title}
              </h1>
              <div className="flex gap-3 flex-wrap">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    difficultyColors[challenge.difficulty as keyof typeof difficultyColors]
                  }`}
                >
                  {difficultyLabels[challenge.difficulty as keyof typeof difficultyLabels]}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {challenge.time_limit} minutes
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  {challenge.points_base} points
                </span>
              </div>
            </div>

            <p className="text-gray-600 mb-6">{challenge.description}</p>

            <div className="border-t pt-4">
              <h2 className="font-semibold text-gray-900 mb-3">
                Criteres de notation
              </h2>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span>🎨</span>
                    <span className="font-medium">Design (0-5 pts)</span>
                  </div>
                  <p className="text-sm text-gray-600">{challenge.criteria_design}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span>⚙️</span>
                    <span className="font-medium">Fonctionnalites (0-5 pts)</span>
                  </div>
                  <p className="text-sm text-gray-600">{challenge.criteria_functionality}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span>✅</span>
                    <span className="font-medium">Realisation (0-5 pts)</span>
                  </div>
                  <p className="text-sm text-gray-600">{challenge.criteria_completion}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reference Video */}
          {challenge.reference_video_playback_id && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>🎬</span>
                Video de reference
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Regardez cette video pour comprendre le resultat attendu.
              </p>
              <MuxVideoPlayer
                playbackId={challenge.reference_video_playback_id}
                title={`Reference - ${challenge.title}`}
              />
            </div>
          )}

          {/* Chrome Extension Alternative */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-2">
              Alternative : Extension Chrome
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Pour un tracking plus precis de vos actions, utilisez notre extension Chrome
              (capture automatique des clics, saisies, etc.)
            </p>
            <a
              href="https://github.com/ottho-nocode/bubble-recorder-plugin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Telecharger l'extension &rarr;
            </a>
          </div>
        </div>

        {/* Right Column - Recorder */}
        <div>
          <WebRecorderWrapper
            challengeId={id}
            challengeTitle={challenge.title}
            timeLimit={challenge.time_limit}
          />
        </div>
      </div>
    </div>
  );
}
