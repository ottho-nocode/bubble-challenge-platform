import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDateShort } from '@/lib/utils/date';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get counts
  const { count: challengesCount } = await supabase
    .from('challenges')
    .select('*', { count: 'exact', head: true });

  const { count: activeCount } = await supabase
    .from('challenges')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: submissionsCount } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true });

  const { count: pendingCount } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: reviewsCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true });

  // Get recent submissions
  const { data: recentSubmissions } = await supabase
    .from('submissions')
    .select(`
      *,
      challenges (title),
      profiles (username)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#101828]">Administration</h1>
        <p className="text-[#6a7282] mt-1">Gérez les défis et suivez les soumissions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
          <p className="text-sm text-[#6a7282] mb-1">Défis totaux</p>
          <p className="text-3xl font-bold text-[#101828]">{challengesCount || 0}</p>
          <p className="text-xs text-[#6a7282] mt-2">{activeCount || 0} actifs</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
          <p className="text-sm text-[#6a7282] mb-1">Soumissions</p>
          <p className="text-3xl font-bold text-[#101828]">{submissionsCount || 0}</p>
          <p className="text-xs text-[#f59e0b] mt-2">{pendingCount || 0} en attente</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
          <p className="text-sm text-[#6a7282] mb-1">Utilisateurs</p>
          <p className="text-3xl font-bold text-[#101828]">{usersCount || 0}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
          <p className="text-sm text-[#6a7282] mb-1">Corrections</p>
          <p className="text-3xl font-bold text-[#101828]">{reviewsCount || 0}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <Link
          href="/admin/challenges/new"
          className="bg-[#001354] text-white rounded-2xl p-6 hover:bg-[#001354]/90 transition-colors"
        >
          <h3 className="text-lg font-semibold mb-2">Créer un nouveau défi</h3>
          <p className="text-white/70 text-sm">Ajoutez un nouveau défi pour les élèves</p>
        </Link>

        <Link
          href="/admin/submissions"
          className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold text-[#101828] mb-2">Voir les soumissions</h3>
          <p className="text-[#6a7282] text-sm">Consultez les soumissions des élèves</p>
        </Link>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
        <div className="p-6 border-b border-[#e5e7eb] flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#101828]">Soumissions récentes</h2>
          <Link href="/admin/submissions" className="text-sm text-[#4a90d9] hover:underline">
            Voir tout
          </Link>
        </div>
        <div className="divide-y divide-[#e5e7eb]">
          {recentSubmissions?.map((submission) => (
            <div key={submission.id} className="p-6 flex items-center justify-between">
              <div>
                <p className="font-medium text-[#101828]">{submission.challenges?.title}</p>
                <p className="text-sm text-[#6a7282]">
                  Par {submission.profiles?.username} - {formatDateShort(submission.created_at)}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                submission.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}>
                {submission.status === 'pending' ? 'En attente' : 'Corrigé'}
              </span>
            </div>
          ))}
          {(!recentSubmissions || recentSubmissions.length === 0) && (
            <div className="p-6 text-center text-[#6a7282]">
              Aucune soumission pour le moment
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
