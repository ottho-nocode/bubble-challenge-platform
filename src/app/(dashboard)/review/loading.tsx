export default function ReviewLoading() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="h-9 w-36 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-80 bg-gray-100 rounded mt-2 animate-pulse" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl animate-pulse" />
            <div>
              <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
              <div className="h-8 w-12 bg-gray-200 rounded mt-1 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Section Title */}
      <div className="h-7 w-52 bg-gray-200 rounded mb-4 animate-pulse" />

      {/* Submissions List */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-72 bg-gray-100 rounded mt-3 animate-pulse" />
                <div className="flex items-center gap-6 mt-4">
                  <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col gap-2 ml-6">
                <div className="h-12 w-28 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
