export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="h-8 w-40 bg-stone-200 rounded-lg animate-pulse mb-2" />
      <div className="h-4 w-56 bg-stone-100 rounded animate-pulse mb-8" />
      <div className="flex gap-2 mb-8">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-stone-200 rounded-full animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-stone-200 rounded-2xl h-56 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
