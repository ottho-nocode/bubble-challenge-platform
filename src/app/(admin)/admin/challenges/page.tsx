import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ChallengeActions from './ChallengeActions';

export default async function AdminChallengesPage() {
  const supabase = await createClient();

  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });

  // Get submission counts per challenge
  const { data: submissionCounts } = await supabase
    .from('submissions')
    .select('challenge_id')
    .then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((s) => {
        counts[s.challenge_id] = (counts[s.challenge_id] || 0) + 1;
      });
      return { data: counts };
    });

  const difficultyLabels = {
    easy: 'Facile',
    medium: 'Moyen',
    hard: 'Difficile',
  };

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#101828]">Gestion des defis</h1>
          <p className="text-[#6a7282] mt-1">Creez, modifiez et publiez vos defis</p>
        </div>
        <Link
          href="/admin/challenges/new"
          className="bg-[#001354] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#001354]/90 transition-colors"
        >
          + Nouveau defi
        </Link>
      </div>

      {/* Challenges Table */}
      <div className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Defi</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Difficulte</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Points</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Soumissions</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Statut</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-[#6a7282]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {challenges?.map((challenge) => (
              <tr key={challenge.id} className="hover:bg-[#f9fafb]">
                <td className="px-6 py-4">
                  <p className="font-medium text-[#101828]">{challenge.title}</p>
                  <p className="text-sm text-[#6a7282] truncate max-w-md">{challenge.description}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColors[challenge.difficulty as keyof typeof difficultyColors]}`}>
                    {difficultyLabels[challenge.difficulty as keyof typeof difficultyLabels]}
                  </span>
                </td>
                <td className="px-6 py-4 text-[#101828]">{challenge.points_base} pts</td>
                <td className="px-6 py-4 text-[#101828]">{submissionCounts?.[challenge.id] || 0}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    challenge.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {challenge.is_active ? 'Publie' : 'Brouillon'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <ChallengeActions challenge={challenge} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!challenges || challenges.length === 0) && (
          <div className="p-12 text-center">
            <p className="text-[#6a7282] mb-4">Aucun defi pour le moment</p>
            <Link
              href="/admin/challenges/new"
              className="inline-block bg-[#001354] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#001354]/90 transition-colors"
            >
              Creer votre premier defi
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
