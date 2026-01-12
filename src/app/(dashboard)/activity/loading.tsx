export default function ActivityLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-9 w-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-5 w-48 bg-gray-100 rounded mt-2 animate-pulse" />
      </div>

      <div className="bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]">
        <div className="divide-y divide-[#e5e7eb]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse shrink-0" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 w-56 bg-gray-100 rounded mt-2 animate-pulse" />
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-gray-100 rounded mt-2 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
