import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import MuxVideoPlayer from '@/components/MuxVideoPlayer';
import ExtensionLauncher from '@/components/ExtensionLauncher';
import SubmissionValidator from '@/components/SubmissionValidator';

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submission?: string }>;
}) {
  const { id } = await params;
  const { submission: submissionId } = await searchParams;
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

        </div>

        {/* Right Column - Submission Validator or Extension Launcher */}
        <div className="space-y-6">
          {submissionId ? (
            /* Show submission validator when returning from recording */
            <SubmissionValidator
              submissionId={submissionId}
              challengeId={id}
              challengeTitle={challenge.title}
            />
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Commencer le defi
                </h2>
                <ExtensionLauncher
                  challengeId={id}
                  challengeTitle={challenge.title}
                />
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-medium text-blue-900 mb-2">
                  Comment ca marche ?
                </h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Installez l&apos;extension Chrome si ce n&apos;est pas deja fait</li>
                  <li>Entrez l&apos;URL de votre application Bubble ci-dessus</li>
                  <li>Cliquez sur &quot;Lancer l&apos;enregistrement&quot; - votre app Bubble s&apos;ouvre</li>
                  <li><strong>Cliquez sur l&apos;icone de l&apos;extension</strong> (puzzle en haut a droite de Chrome)</li>
                  <li>Dans le popup, cliquez sur &quot;Demarrer l&apos;enregistrement&quot;</li>
                  <li>Realisez le defi en suivant les criteres</li>
                  <li>Cliquez sur l&apos;icone de l&apos;extension puis &quot;Arreter&quot;</li>
                  <li>Validez votre soumission</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
