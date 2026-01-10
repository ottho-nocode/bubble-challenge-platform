import { createClient } from '@/lib/supabase/server';
import { formatDateShort } from '@/lib/utils/date';

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('total_points', { ascending: false });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#101828]">Utilisateurs</h1>
        <p className="text-[#6a7282] mt-1">Gérez les utilisateurs de la plateforme</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
          <p className="text-sm text-[#6a7282] mb-1">Total utilisateurs</p>
          <p className="text-3xl font-bold text-[#101828]">{users?.length || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
          <p className="text-sm text-[#6a7282] mb-1">Administrateurs</p>
          <p className="text-3xl font-bold text-[#101828]">
            {users?.filter(u => u.is_admin).length || 0}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
          <p className="text-sm text-[#6a7282] mb-1">Ont soumis</p>
          <p className="text-3xl font-bold text-[#101828]">
            {users?.filter(u => u.submissions_count > 0).length || 0}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
          <p className="text-sm text-[#6a7282] mb-1">Ont corrigé</p>
          <p className="text-3xl font-bold text-[#101828]">
            {users?.filter(u => u.reviews_count > 0).length || 0}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Utilisateur</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Points</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Soumissions</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Corrections</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Inscription</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-[#6a7282]">Rôle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb]">
            {users?.map((user) => (
              <tr key={user.id} className="hover:bg-[#f9fafb]">
                <td className="px-6 py-4">
                  <p className="font-medium text-[#101828]">{user.username}</p>
                  <p className="text-xs text-[#6a7282]">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-[#f0b100]">{user.total_points} pts</span>
                </td>
                <td className="px-6 py-4 text-[#101828]">{user.submissions_count}</td>
                <td className="px-6 py-4 text-[#101828]">{user.reviews_count}</td>
                <td className="px-6 py-4 text-sm text-[#6a7282]">
                  {formatDateShort(user.created_at)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user.is_admin
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {user.is_admin ? 'Admin' : 'Élève'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!users || users.length === 0) && (
          <div className="p-12 text-center text-[#6a7282]">
            Aucun utilisateur pour le moment
          </div>
        )}
      </div>
    </div>
  );
}
