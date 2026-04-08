"use client";
import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const from = searchParams.get("from") ?? "/admin";
        router.push(from);
      } else {
        setError("סיסמה שגויה");
      }
    } catch {
      setError("שגיאה בהתחברות, נסה שוב");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        type="password"
        label="סיסמה"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="הכנס סיסמה..."
        autoFocus
        required
      />
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
      <Button type="submit" loading={loading} size="lg" className="w-full">
        כניסה
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🍽</div>
          <h1 className="text-2xl font-bold text-gray-900">BiteBase Admin</h1>
          <p className="text-gray-500 text-sm mt-1">הכנס סיסמה להמשך</p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
