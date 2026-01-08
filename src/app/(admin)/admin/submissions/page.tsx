import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminSubmissionsPage() {
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      challenges (title, difficulty),
      profiles (username, email),
      reviews (
        id,
        reviewer_id,
        score_design,
        score_functionality,
        score_completion,
        profiles (username)
      )
    `)
    .order('created_at', { ascending: false });

  const difficultyLabels = {
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#101828]">Soumissions</h1>
        <p className="text-[#6a7282] mt-1">Consultez toutes les soumissions des eleves</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] mb-6">
        <div className="flex gap-4">
          <select className="px-4 py-2 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none">
            <option value="">Tous les defis</option>
          </select>
          <select className="px-4 py-2 border border-[#e5e7eb] rounded-xl text-sm focus:ring-2 focus:ring-[#4a90d9] focus:border-transparent outline-none">
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="reviewed">Corrige</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Eleve</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Defi</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Date</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Statut</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Correcteur</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Score</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-[#6a7282]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {submissions?.map((submission) => {
              const review = submission.reviews?.[0];
              const totalScore = review
                ? review.score_design + review.score_functionality + review.score_completion
                : null;

              return (
                <tr key={submission.id} className="hover:bg-[#f9fafb]">
                  <td className="px-6 py-4">
                    <p className="font-medium text-[#101828]">{submission.profiles?.username}</p>
                    <p className="text-xs text-[#6a7282]">{submission.profiles?.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[#101828]">{submission.challenges?.title}</p>
                    <p className="text-xs text-[#6a7282]">
                      {difficultyLabels[submission.challenges?.difficulty as keyof typeof difficultyLabels]}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#6a7282]">
                    {new Date(submission.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      submission.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {submission.status === 'pending' ? 'En attente' : 'Corrige'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[#6a7282]">
                    {review?.profiles?.username || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {totalScore !== null ? (
                      <span className="font-medium text-[#101828]">{totalScore}/15</span>
                    ) : (
                      <span className="text-[#6a7282]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {submission.video_url && (
                      <a
                        href={submission.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#4a90d9] hover:underline text-sm"
                      >
                        Voir video
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!submissions || submissions.length === 0) && (
          <div className="p-12 text-center text-[#6a7282]">
            Aucune soumission pour le moment
          </div>
        )}
      </div>
    </div>
  );
}
