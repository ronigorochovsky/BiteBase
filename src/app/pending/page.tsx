"use client";
import { useRouter } from "next/navigation";

export default function PendingPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" dir="rtl">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">⏳</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">החשבון ממתין לאישור</h1>
        <p className="text-gray-500 mb-2">
          הפרטים שלך התקבלו בהצלחה.
        </p>
        <p className="text-gray-500 mb-8">
          המנהל יאשר את הגישה שלך בקרוב — לאחר האישור תוכל להיכנס לאתר.
        </p>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          יציאה
        </button>
      </div>
    </div>
  );
}
