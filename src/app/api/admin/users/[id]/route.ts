import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await request.json();
  if (status !== "approved" && status !== "rejected") {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  await db
    .update(users)
    .set({
      status,
      approved_at: status === "approved" ? new Date() : null,
    })
    .where(eq(users.id, params.id));

  return Response.json({ ok: true });
}
