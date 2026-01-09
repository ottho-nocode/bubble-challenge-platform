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
    <div className="p-8">
      <Link
        href="/challenges"
        className="text-blue-600 hover:underline mb-6 inline-block"
      >
        &larr; Retour aux defis
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#101828] mb-3">
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Challenge Info (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
            <h2 className="font-semibold text-[#101828] mb-3">Description</h2>
            <p className="text-[#6a7282]">{challenge.description}</p>
          </div>

          {/* Criteria */}
          <div className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
            <h2 className="font-semibold text-[#101828] mb-4">
              Criteres de notation
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-[#f9fafb] p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span>🎨</span>
                  <span className="font-medium text-[#101828]">Design</span>
                  <span className="text-sm text-[#6a7282]">(0-5 pts)</span>
                </div>
                <p className="text-sm text-[#6a7282]">{challenge.criteria_design}</p>
              </div>
              <div className="bg-[#f9fafb] p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span>⚙️</span>
                  <span className="font-medium text-[#101828]">Fonctionnalites</span>
                  <span className="text-sm text-[#6a7282]">(0-5 pts)</span>
                </div>
                <p className="text-sm text-[#6a7282]">{challenge.criteria_functionality}</p>
              </div>
              <div className="bg-[#f9fafb] p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span>✅</span>
                  <span className="font-medium text-[#101828]">Realisation</span>
                  <span className="text-sm text-[#6a7282]">(0-5 pts)</span>
                </div>
                <p className="text-sm text-[#6a7282]">{challenge.criteria_completion}</p>
              </div>
            </div>
          </div>

          {/* Reference Video */}
          {challenge.reference_video_playback_id && (
            <div className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
              <h3 className="font-semibold text-[#101828] mb-3 flex items-center gap-2">
                <span>🎬</span>
                Video de reference
              </h3>
              <p className="text-sm text-[#6a7282] mb-4">
                Regardez cette video pour comprendre le resultat attendu.
              </p>
              <MuxVideoPlayer
                playbackId={challenge.reference_video_playback_id}
                title={`Reference - ${challenge.title}`}
              />
            </div>
          )}
        </div>

        {/* Right Column - Submission Validator or Extension Launcher (1/3 width) */}
        <div className="space-y-6">
          {submissionId ? (
            <SubmissionValidator
              submissionId={submissionId}
              challengeId={id}
              challengeTitle={challenge.title}
            />
          ) : (
            <>
              <div className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
                <h2 className="text-lg font-semibold text-[#101828] mb-4">
                  Commencer le defi
                </h2>
                <ExtensionLauncher
                  challengeId={id}
                  challengeTitle={challenge.title}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-[16px] p-5">
                <h3 className="font-medium text-blue-900 mb-3">
                  Comment ca marche ?
                </h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Installez l&apos;extension Chrome</li>
                  <li>Entrez l&apos;URL de votre app Bubble</li>
                  <li>Cliquez sur &quot;Lancer l&apos;enregistrement&quot;</li>
                  <li><strong>Cliquez sur l&apos;icone de l&apos;extension</strong></li>
                  <li>Cliquez sur &quot;Demarrer&quot;</li>
                  <li>Realisez le defi</li>
                  <li>Cliquez sur le bouton Stop</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
