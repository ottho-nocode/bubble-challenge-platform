import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function ReviewPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Get pending submissions from other users
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      challenges (
        title,
        description,
        difficulty,
        points_base,
        criteria_design,
        criteria_functionality,
        criteria_completion
      ),
      profiles (
        username
      )
    `)
    .eq('status', 'pending')
    .neq('user_id', user?.id)
    .order('created_at', { ascending: true })
    .limit(10);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">A corriger</h1>
        <p className="text-gray-600">Evaluez les soumissions des autres eleves et gagnez 5 points par correction</p>
      </div>

      <div className="space-y-4">
        {submissions?.map((submission) => (
          <div key={submission.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {submission.challenges?.title}
                  </h2>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                    En attente
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-3">
                  Soumis par <span className="font-medium">{submission.profiles?.username}</span>
                  {' le '}
                  {new Date(submission.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>

                <p className="text-gray-600 text-sm mb-4">
                  {submission.challenges?.description}
                </p>

                <div className="grid md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="font-medium">Design:</span>
                    <p className="text-gray-600 text-xs mt-1">{submission.challenges?.criteria_design}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="font-medium">Fonctionnalites:</span>
                    <p className="text-gray-600 text-xs mt-1">{submission.challenges?.criteria_functionality}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <span className="font-medium">Realisation:</span>
                    <p className="text-gray-600 text-xs mt-1">{submission.challenges?.criteria_completion}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Link
                  href={`/review/${submission.id}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Corriger
                </Link>
                {submission.video_url && (
                  <a
                    href={submission.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 text-center"
                  >
                    Voir video
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}

        {(!submissions || submissions.length === 0) && (
          <div className="text-center py-12 bg-white rounded-xl">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune soumission a corriger
            </h3>
            <p className="text-gray-500 mb-4">
              Toutes les soumissions ont ete evaluees ou il n'y a pas encore de soumissions d'autres eleves.
            </p>
            <Link
              href="/challenges"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Relever un defi
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
