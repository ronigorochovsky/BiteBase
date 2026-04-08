import Link from "next/link";
import { Navbar } from "@/components/Navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="text-6xl mb-4">🍽</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">הדף לא נמצא</h1>
        <p className="text-gray-500 mb-8">
          נראה שהקישור שגוי או שהדף הוסר.
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-brand-500 text-white rounded-xl font-medium hover:bg-brand-600 transition-colors"
        >
          חזרה לדף הבית
        </Link>
      </main>
    </>
  );
}
