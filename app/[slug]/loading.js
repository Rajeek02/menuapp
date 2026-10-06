export default function PublicMenuLoading() {
  return (
    <main className="min-h-screen bg-[#f4f1eb] px-3 py-4 sm:px-6 sm:py-8" aria-label="Loading cafe menu">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="rounded-[28px] bg-[#31251d] px-5 py-8 text-center sm:px-10 sm:py-10">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white/15 sm:h-20 sm:w-20" />
          <div className="mx-auto mt-5 h-8 w-2/3 max-w-sm rounded-lg bg-white/15" />
          <div className="mx-auto mt-3 h-4 w-1/2 max-w-xs rounded bg-white/10" />
          <div className="mx-auto mt-6 h-10 w-40 rounded-full bg-white/10" />
        </div>
        <div className="mt-5 flex gap-2 overflow-hidden rounded-2xl bg-[#fbfaf7] p-2">
          <div className="h-10 w-24 shrink-0 rounded-full bg-[#e8e2d9]" />
          <div className="h-10 w-28 shrink-0 rounded-full bg-[#e8e2d9]" />
          <div className="h-10 w-20 shrink-0 rounded-full bg-[#e8e2d9]" />
        </div>
        <div className="mt-4 grid gap-3 rounded-3xl bg-[#fbfaf7] p-3 sm:grid-cols-2 sm:p-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex gap-3 rounded-[18px] border border-[#e9e3da] bg-white p-4">
              <div className="h-16 w-16 shrink-0 rounded-[14px] bg-[#eeeae4]" />
              <div className="flex-1 pt-1">
                <div className="h-4 w-3/4 rounded bg-[#eeeae4]" />
                <div className="mt-3 h-3 w-full rounded bg-[#f2eee8]" />
                <div className="mt-2 h-3 w-2/3 rounded bg-[#f2eee8]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
