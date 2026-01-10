export default function LeaderboardLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-8 w-36 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-5 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
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
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="h-8 w-8 bg-gray-100 rounded animate-pulse" />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="h-5 w-12 bg-gray-100 rounded animate-pulse mx-auto" />
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="h-5 w-8 bg-gray-100 rounded animate-pulse mx-auto" />
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="h-5 w-8 bg-gray-100 rounded animate-pulse mx-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
