export default function Loading() {
  return (
    <>
      <div className="h-14 bg-white border-b border-stone-200" />
      <main className="max-w-7xl mx-auto px-4 py-10 flex-1">
        <div className="h-9 bg-stone-200 rounded w-40 mb-2 animate-pulse" />
        <div className="h-4 bg-stone-100 rounded w-56 mb-8 animate-pulse" />
        <div className="flex gap-8 items-start">
          <aside className="w-60 flex-shrink-0 hidden lg:block">
            <div className="flex flex-col gap-5">
              {[...Array(3)].map((_, s) => (
                <div key={s} className="flex flex-col gap-2">
                  <div className="h-3 bg-stone-200 rounded w-20 animate-pulse" />
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 bg-stone-200 rounded-full animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          </aside>
          <div className="flex-1 min-w-0">
            <div className="h-10 bg-stone-200 rounded-xl mb-6 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-stone-200 overflow-hidden animate-pulse">
                  <div className="h-48 bg-stone-200" />
                  <div className="p-4 flex flex-col gap-2">
                    <div className="h-3 bg-stone-200 rounded w-1/3" />
                    <div className="h-5 bg-stone-200 rounded w-3/4" />
                    <div className="h-3 bg-stone-200 rounded w-full" />
                    <div className="h-3 bg-stone-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
