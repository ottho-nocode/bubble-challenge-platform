'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface Submission {
  id: string;
  status: string;
  created_at: string;
  video_url: string | null;
  challenges: {
    title: string;
    difficulty: string;
  } | null;
  profiles: {
    username: string;
    email: string;
  } | null;
  reviews: Array<{
    id: string;
    reviewer_id: string;
    score_design: number;
    score_functionality: number;
    score_completion: number;
    is_ai_review: boolean;
    profiles: {
      username: string;
    } | null;
  }>;
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      const supabase = createClient();
      const { data } = await supabase
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
            is_ai_review,
            profiles (username)
          )
        `)
        .order('created_at', { ascending: false });

      setSubmissions(data || []);
      setLoading(false);
    };

    fetchSubmissions();
  }, []);

  const difficultyLabels = {
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#001354]"></div>
      </div>
    );
  }

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
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">ID</th>
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
                    <code className="text-xs text-[#6a7282] bg-[#f3f4f6] px-2 py-1 rounded">
                      {submission.id.slice(0, 8)}...
                    </code>
                    <button
                      onClick={() => copyToClipboard(submission.id)}
                      className="ml-2 text-xs text-[#4a90d9] hover:underline"
                    >
                      Copier
                    </button>
                  </td>
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
                  <td className="px-6 py-4 text-sm">
                    {review?.is_ai_review ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#faf5ff] text-[#6d28d9] text-xs font-medium rounded-full">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                        </svg>
                        IA
                      </span>
                    ) : (
                      <span className="text-[#6a7282]">{review?.profiles?.username || '-'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {totalScore !== null ? (
                      <span className="font-medium text-[#101828]">{totalScore}/15</span>
                    ) : (
                      <span className="text-[#6a7282]">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <a
                      href={`/admin/submissions/${submission.id}`}
                      className="text-[#4a90d9] hover:underline text-sm font-medium"
                    >
                      Voir details
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {submissions.length === 0 && (
          <div className="p-12 text-center text-[#6a7282]">
            Aucune soumission pour le moment
          </div>
        )}
      </div>
    </div>
  );
}
