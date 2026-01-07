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
        points_base
      ),
      reviews (
        score_design,
        score_functionality,
        score_completion,
        comment,
        feedback_video_url
      )
    `)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mes soumissions</h1>
        <p className="text-gray-600">Historique de vos defis realises</p>
      </div>

      <div className="space-y-4">
        {submissions?.map((submission) => {
          const review = submission.reviews?.[0];
          const totalScore = review
            ? review.score_design + review.score_functionality + review.score_completion
            : null;

          return (
            <div key={submission.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {submission.challenges?.title || 'Defi inconnu'}
                    </h2>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      statusColors[submission.status as keyof typeof statusColors]
                    }`}>
                      {statusLabels[submission.status as keyof typeof statusLabels]}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mb-3">
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
                    <div className="bg-gray-50 rounded-lg p-4 mt-3">
                      <h3 className="font-medium text-gray-900 mb-2">Evaluation</h3>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <span className="text-sm text-gray-500">Design</span>
                          <div className="font-semibold">{review.score_design}/5</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Fonctionnalites</span>
                          <div className="font-semibold">{review.score_functionality}/5</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Realisation</span>
                          <div className="font-semibold">{review.score_completion}/5</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-blue-600 font-semibold">
                        Score total: {totalScore}/15
                        <span className="text-gray-400">+</span>
                        <span>{submission.challenges?.points_base} pts base</span>
                        <span className="text-gray-400">=</span>
                        <span className="text-green-600">
                          {(totalScore || 0) + (submission.challenges?.points_base || 0)} pts
                        </span>
                      </div>
                      {review.comment && (
                        <p className="mt-3 text-sm text-gray-600 italic">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {submission.video_url && (
                    <a
                      href={submission.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                    >
                      Voir la video
                    </a>
                  )}
                  {review?.feedback_video_url && (
                    <a
                      href={review.feedback_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200"
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
          <div className="text-center py-12 bg-white rounded-xl">
            <div className="text-4xl mb-4">📹</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune soumission
            </h3>
            <p className="text-gray-500 mb-4">
              Vous n'avez pas encore soumis de defi.
            </p>
            <Link
              href="/challenges"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Voir les defis
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
