import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const statusLabels = {
  pending: 'En attente',
  reviewed: 'Corrige',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  reviewed: 'bg-green-100 text-green-700',
};

export default async function SubmissionsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      challenges (
        title,
        difficulty,
        points_base,
        ai_correction_enabled
      ),
      reviews (
        score_design,
        score_functionality,
        score_completion,
        comment,
        feedback_video_url,
        is_ai_review
      )
    `)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#101828]">Mes soumissions</h1>
        <p className="text-[#6a7282] mt-1">Historique de vos defis realises</p>
      </div>

      <div className="space-y-4">
        {submissions?.map((submission) => {
          const review = submission.reviews?.[0];
          const totalScore = review
            ? review.score_design + review.score_functionality + review.score_completion
            : null;
          const isAiReview = review?.is_ai_review;
          const isPendingAi = submission.status === 'pending' && submission.challenges?.ai_correction_enabled;

          return (
            <div key={submission.id} className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold text-[#101828]">
                      {submission.challenges?.title || 'Defi inconnu'}
                    </h2>
                    {isPendingAi ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#faf5ff] text-[#6d28d9] flex items-center gap-2">
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Correction IA en cours...
                      </span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statusColors[submission.status as keyof typeof statusColors]
                      }`}>
                        {statusLabels[submission.status as keyof typeof statusLabels]}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[#6a7282] mb-3">
                    Soumis le {new Date(submission.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {submission.duration && (
                      <span className="ml-2">
                        - Duree: {Math.round(submission.duration / 1000 / 60)} min
                      </span>
                    )}
                  </p>

                  {review && (
                    <div className="bg-[#f9fafb] border border-[#f3f4f6] rounded-[14px] p-4 mt-3">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-[#101828]">Evaluation</h3>
                        {isAiReview && (
                          <span className="px-2 py-1 bg-[#faf5ff] text-[#6d28d9] text-xs font-medium rounded-full flex items-center gap-1">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                            Corrige par IA
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <span className="text-sm text-[#6a7282]">Design</span>
                          <div className="font-bold text-[#101828]">{review.score_design}/5</div>
                        </div>
                        <div>
                          <span className="text-sm text-[#6a7282]">Fonctionnalites</span>
                          <div className="font-bold text-[#101828]">{review.score_functionality}/5</div>
                        </div>
                        <div>
                          <span className="text-sm text-[#6a7282]">Realisation</span>
                          <div className="font-bold text-[#101828]">{review.score_completion}/5</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="text-[#6d28d9]">Score total: {totalScore}/15</span>
                        <span className="text-[#6a7282]">+</span>
                        <span className="text-[#6a7282]">{submission.challenges?.points_base} pts base</span>
                        <span className="text-[#6a7282]">=</span>
                        <span className="text-[#22c55e]">
                          {(totalScore || 0) + (submission.challenges?.points_base || 0)} pts
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-3 text-sm text-[#4a5565] bg-white rounded-lg p-3 border border-[#e5e7eb]">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-6 shrink-0">
                  {(submission.mux_playback_id || submission.video_url) && (
                    <Link
                      href={`/submissions/${submission.id}`}
                      className="px-4 py-2 bg-[#f3f4f6] text-[#4b5563] rounded-xl text-sm font-medium hover:bg-[#e5e7eb] transition-colors text-center"
                    >
                      Voir ma video
                    </Link>
                  )}
                  {!submission.mux_playback_id && !submission.video_url && submission.status === 'pending' && (
                    <span className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-sm text-center">
                      Video en traitement...
                    </span>
                  )}
                  {review?.feedback_video_url && (
                    <a
                      href={review.feedback_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#faf5ff] text-[#6d28d9] rounded-xl text-sm font-medium hover:bg-[#f3e8ff] transition-colors text-center"
                    >
                      Voir le feedback
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {(!submissions || submissions.length === 0) && (
          <div className="text-center py-16 bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
            <div className="w-16 h-16 bg-[#f3f4f6] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#9ca3af]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[#101828] mb-2">
              Aucune soumission
            </h3>
            <p className="text-[#6a7282] mb-6">
              Vous n&apos;avez pas encore soumis de defi.
            </p>
            <Link
              href="/challenges"
              className="inline-flex items-center gap-2 bg-[#001354] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#001354]/90 transition-colors"
            >
              Voir les defis
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
