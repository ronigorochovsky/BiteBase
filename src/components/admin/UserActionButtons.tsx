"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  currentStatus: "pending" | "approved" | "rejected";
}

export function UserActionButtons({ userId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approved" | "rejected" | null>(null);

  async function updateStatus(status: "approved" | "rejected") {
    setLoading(status);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => updateStatus("approved")}
        disabled={currentStatus === "approved" || loading !== null}
        className="text-xs px-3 py-1.5 rounded-md font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading === "approved" ? "..." : "אשר"}
      </button>
      <button
        onClick={() => updateStatus("rejected")}
        disabled={currentStatus === "rejected" || loading !== null}
        className="text-xs px-3 py-1.5 rounded-md font-medium bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {loading === "rejected" ? "..." : "דחה"}
      </button>
    </div>
  );
}
