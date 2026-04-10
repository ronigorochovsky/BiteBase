"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

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
            aria-current={pathname.startsWith("/recipes") ? "page" : undefined}
            className={`transition-colors ${
              pathname.startsWith("/recipes")
                ? "text-gray-900 border-b-2 border-gray-900 pb-0.5"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            מתכונים
          </Link>
          <Link
            href="/restaurants"
            aria-current={pathname.startsWith("/restaurants") ? "page" : undefined}
            className={`transition-colors ${
              pathname.startsWith("/restaurants")
                ? "text-gray-900 border-b-2 border-gray-900 pb-0.5"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            מסעדות
          </Link>
        </div>
      </div>
    </nav>
  );
}
