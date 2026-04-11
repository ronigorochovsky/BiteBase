"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.userName) setUserName(d.userName); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

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
          {userName && (
            <div className="flex items-center gap-3 border-s border-gray-200 ps-4">
              <span className="text-gray-500 text-xs">{userName}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-400 hover:text-red-600 transition-colors"
              >
                יציאה
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
