import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Admin nav */}
      <nav className="bg-gray-900 text-white px-4 h-12 flex items-center">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold text-brand-400">BiteBase Admin</span>
            <Link
              href="/admin"
              className="text-gray-400 hover:text-white transition-colors"
            >
              דשבורד
            </Link>
            <Link
              href="/admin/add"
              className="text-gray-400 hover:text-white transition-colors"
            >
              הוסף URL
            </Link>
            <Link
              href="/admin/import"
              className="text-gray-400 hover:text-white transition-colors"
            >
              ייבוא WhatsApp
            </Link>
          </div>
          <Link
            href="/"
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            → לאתר
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
}
