'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Play, Info, Trophy } from '@phosphor-icons/react';

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
  const [isPlaying, setIsPlaying] = useState(false);

  const [scoreDesign, setScoreDesign] = useState(2.5);
  const [scoreFunctionality, setScoreFunctionality] = useState(2.5);
  const [scoreCompletion, setScoreCompletion] = useState(2.5);
  const [comment, setComment] = useState('');

  const totalScore = scoreDesign + scoreFunctionality + scoreCompletion;

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
        score_design: Math.round(scoreDesign),
        score_functionality: Math.round(scoreFunctionality),
        score_completion: Math.round(scoreCompletion),
        comment: comment || null,
      });

    if (error) {
      setError('Erreur lors de l\'envoi de l\'evaluation');
      setSubmitting(false);
    } else {
      router.push('/review?success=1');
    }
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayVideo = () => {
    const video = document.getElementById('submission-video') as HTMLVideoElement;
    if (video) {
      video.play();
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6d28d9]"></div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back Link */}
      <Link
        href="/review"
        className="inline-flex items-center gap-2 text-[#6a7282] hover:text-[#101828] mb-6 text-sm font-medium transition-colors"
      >
        <ArrowLeft size={16} />
        Retour a la liste
      </Link>

      {/* Main Content - Two Columns */}
      <div className="flex gap-8">
        {/* Left Column - Video + Criteria */}
        <div className="flex-1 space-y-6">
          {/* Video Player */}
          <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-[#1e2939]">
            {submission?.video_url ? (
              <>
                <video
                  id="submission-video"
                  src={submission.video_url}
                  className="w-full aspect-video"
                  controls={isPlaying}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                {/* Play Button Overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={handlePlayVideo}
                      className="w-20 h-20 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                      <Play size={32} weight="fill" className="text-white ml-1" />
                    </button>
                  </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                {/* Video Info */}
                <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between pointer-events-none">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Soumission par {submission?.profiles?.username}
                    </h2>
                    <p className="text-[#d1d5dc] font-medium">
                      Defi: {submission?.challenges?.title}
                    </p>
                  </div>
                  {submission?.duration && (
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-1.5">
                      <span className="text-white font-medium text-sm">
                        {formatDuration(submission.duration)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <p className="text-gray-400">Aucune video disponible</p>
              </div>
            )}
          </div>

          {/* Criteria Reminder Card */}
          <div className="bg-white rounded-2xl shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info size={20} className="text-[#6d28d9]" />
              <h3 className="text-lg font-semibold text-[#020618] tracking-tight">
                Rappel des criteres
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#f9fafb] border border-[#f3f4f6] rounded-[14px] p-4">
                <p className="font-bold text-[#101828] text-sm mb-2">Design</p>
                <p className="text-[#4a5565] text-sm leading-relaxed">
                  {submission?.challenges?.criteria_design || "L'interface doit etre claire, responsive et respecter les conventions UX."}
                </p>
              </div>
              <div className="bg-[#f9fafb] border border-[#f3f4f6] rounded-[14px] p-4">
                <p className="font-bold text-[#101828] text-sm mb-2">Fonctionnalites</p>
                <p className="text-[#4a5565] text-sm leading-relaxed">
                  {submission?.challenges?.criteria_functionality || "La recherche doit fonctionner, ainsi que le filtrage par categorie."}
                </p>
              </div>
              <div className="bg-[#f9fafb] border border-[#f3f4f6] rounded-[14px] p-4">
                <p className="font-bold text-[#101828] text-sm mb-2">Realisation</p>
                <p className="text-[#4a5565] text-sm leading-relaxed">
                  {submission?.challenges?.criteria_completion || "Toutes les pages demandees doivent etre presentes."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Evaluation Panel */}
        <div className="w-[400px] shrink-0">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] overflow-hidden">
            {/* Purple Header */}
            <div className="bg-[#6d28d9] p-6">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h2 className="text-xl font-bold text-white">Evaluation</h2>
              </div>
              <p className="text-[#e9d4ff] text-sm">
                Notez objectivement le travail realise.
              </p>
            </div>

            {/* Sliders Section */}
            <div className="p-8 space-y-10">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Design Slider */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="font-bold text-[#364153]">Design & UX</label>
                  <span className="bg-[#faf5ff] text-[#6d28d9] font-bold px-3 py-1 rounded-xl text-sm">
                    {scoreDesign.toFixed(1)}/5
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={scoreDesign}
                    onChange={(e) => setScoreDesign(Number(e.target.value))}
                    className="w-full h-2 bg-[#f1f5f9] rounded-full appearance-none cursor-pointer slider-thumb"
                    style={{
                      background: `linear-gradient(to right, #0f172b 0%, #0f172b ${(scoreDesign / 5) * 100}%, #f1f5f9 ${(scoreDesign / 5) * 100}%, #f1f5f9 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Functionality Slider */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="font-bold text-[#364153]">Fonctionnalites</label>
                  <span className="bg-[#faf5ff] text-[#6d28d9] font-bold px-3 py-1 rounded-xl text-sm">
                    {scoreFunctionality.toFixed(1)}/5
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={scoreFunctionality}
                    onChange={(e) => setScoreFunctionality(Number(e.target.value))}
                    className="w-full h-2 bg-[#f1f5f9] rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #0f172b 0%, #0f172b ${(scoreFunctionality / 5) * 100}%, #f1f5f9 ${(scoreFunctionality / 5) * 100}%, #f1f5f9 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Completion Slider */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="font-bold text-[#364153]">Realisation</label>
                  <span className="bg-[#faf5ff] text-[#6d28d9] font-bold px-3 py-1 rounded-xl text-sm">
                    {scoreCompletion.toFixed(1)}/5
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={scoreCompletion}
                    onChange={(e) => setScoreCompletion(Number(e.target.value))}
                    className="w-full h-2 bg-[#f1f5f9] rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #0f172b 0%, #0f172b ${(scoreCompletion / 5) * 100}%, #f1f5f9 ${(scoreCompletion / 5) * 100}%, #f1f5f9 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-[#f3f4f6]" />

              {/* Total Score */}
              <div className="bg-gradient-to-r from-[#f9fafb] to-white border border-[#f3f4f6] rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-[#f0b100]" />
                  <span className="font-bold text-[#364153]">Note Totale</span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-[#6d28d9]">{totalScore.toFixed(1)}</span>
                  <span className="text-lg font-bold text-[#99a1af] ml-1">/15</span>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block font-bold text-[#364153] mb-3">
                  Commentaire
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-[14px] text-sm focus:ring-2 focus:ring-[#6d28d9] focus:border-transparent outline-none resize-none"
                  placeholder="Donnez un feedback constructif et bienveillant..."
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="p-6 border-t border-[#f3f4f6]">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#6d28d9] text-white py-4 rounded-[14px] font-medium text-lg hover:bg-[#5b21b6] disabled:opacity-50 transition-colors shadow-lg"
              >
                {submitting ? 'Envoi en cours...' : "Soumettre l'evaluation"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Custom Slider Styles */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: white;
          border: 2px solid #0f172b;
          border-radius: 50%;
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: white;
          border: 2px solid #0f172b;
          border-radius: 50%;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
