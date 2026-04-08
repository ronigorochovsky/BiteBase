import Link from "next/link";

export function Navbar() {
  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold text-brand-600 hover:text-brand-700 transition-colors"
        >
          🍽 BiteBase
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/recipes"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            מתכונים
          </Link>
          <Link
            href="/restaurants"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            מסעדות
          </Link>
        </div>
      </div>
    </nav>
  );
}
