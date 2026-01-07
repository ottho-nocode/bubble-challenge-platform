import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single();

  const { count: pendingReviews } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .neq('user_id', user?.id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenue, {profile?.username || 'Élève'} !
        </h1>
        <p className="text-gray-600">
          Voici votre tableau de bord
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-blue-600">
            {profile?.total_points || 0}
          </div>
          <div className="text-gray-600">Points totaux</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-green-600">
            {profile?.submissions_count || 0}
          </div>
          <div className="text-gray-600">Soumissions</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-purple-600">
            {profile?.reviews_count || 0}
          </div>
          <div className="text-gray-600">Corrections</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-orange-600">
            {pendingReviews || 0}
          </div>
          <div className="text-gray-600">À corriger</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="flex gap-4">
          <a
            href="/challenges"
            className="flex-1 p-4 border-2 border-dashed border-gray-200 rounded-lg text-center hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-medium">Relever un défi</div>
          </a>
          <a
            href="/review"
            className="flex-1 p-4 border-2 border-dashed border-gray-200 rounded-lg text-center hover:border-green-300 hover:bg-green-50 transition-colors"
          >
            <div className="text-2xl mb-2">✏️</div>
            <div className="font-medium">Corriger un exercice</div>
          </a>
          <a
            href="/leaderboard"
            className="flex-1 p-4 border-2 border-dashed border-gray-200 rounded-lg text-center hover:border-purple-300 hover:bg-purple-50 transition-colors"
          >
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-medium">Voir le classement</div>
          </a>
        </div>
      </div>
    </div>
  );
}
