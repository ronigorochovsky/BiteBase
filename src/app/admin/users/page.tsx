import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { UserActionButtons } from "@/components/admin/UserActionButtons";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "ממתין", className: "bg-yellow-100 text-yellow-700" },
  approved: { label: "מאושר", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "נדחה", className: "bg-red-100 text-red-700" },
};

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect("/admin/login");
  }

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
      created_at: users.created_at,
      approved_at: users.approved_at,
    })
    .from(users)
    .orderBy(desc(users.created_at));

  const pending = allUsers.filter((u) => u.status === "pending").length;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול משתמשים</h1>
          {pending > 0 && (
            <p className="text-sm text-yellow-600 mt-1">
              {pending} משתמש{pending > 1 ? "ים" : ""} ממתין{pending > 1 ? "ים" : ""} לאישור
            </p>
          )}
        </div>
        <span className="text-sm text-gray-500">{allUsers.length} משתמשים סה&quot;כ</span>
      </div>

      {allUsers.length === 0 ? (
        <p className="text-gray-400 text-center py-20">אין משתמשים רשומים עדיין</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm" dir="rtl">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">אימייל</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">נרשם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allUsers.map((user) => {
                const statusInfo = STATUS_LABELS[user.status] ?? { label: user.status, className: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString("he-IL")}
                    </td>
                    <td className="px-4 py-3">
                      <UserActionButtons userId={user.id} currentStatus={user.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
