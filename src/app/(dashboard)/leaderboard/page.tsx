import { createClient } from '@/lib/supabase/server';

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // Parallelize user auth and leaderboard fetch
  const [{ data: { user } }, { data: leaderboard }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('leaderboard').select('*').limit(50),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Classement</h1>
        <p className="text-gray-600">Les meilleurs élèves de la plateforme</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Rang</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Utilisateur</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">Points</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">Soumissions</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">Corrections</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {leaderboard?.map((entry, index) => {
              const isCurrentUser = entry.id === user?.id;
              const rankDisplay = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : entry.rank;

              return (
                <tr
                  key={entry.id}
                  className={isCurrentUser ? 'bg-blue-50' : 'hover:bg-gray-50'}
                >
                  <td className="px-6 py-4 text-2xl">
                    {rankDisplay}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt={entry.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <span className="text-gray-500 font-medium">
                            {entry.username?.[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {entry.username}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                              Vous
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-blue-600">{entry.total_points}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {entry.submissions_count}
                  </td>
                  <td className="px-6 py-4 text-center text-gray-600">
                    {entry.reviews_count}
                  </td>
                </tr>
              );
            })}

            {(!leaderboard || leaderboard.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Aucun classement disponible. Soyez le premier à soumettre un défi !
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
