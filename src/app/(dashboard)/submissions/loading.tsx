export default function SubmissionsLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-9 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-5 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-[16px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-56 bg-gray-100 rounded mt-3 animate-pulse" />
              </div>
              <div className="flex flex-col gap-2 ml-6">
                <div className="h-10 w-28 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
