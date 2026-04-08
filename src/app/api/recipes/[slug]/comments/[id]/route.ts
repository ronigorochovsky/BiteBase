import { db } from "@/db";
import { comments } from "@/db/schema";
import { eq } from "drizzle-orm";

// DELETE /api/recipes/[slug]/comments/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await db.delete(comments).where(eq(comments.id, params.id));
  return Response.json({ ok: true });
}
