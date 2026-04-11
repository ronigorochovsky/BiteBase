import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }
  return Response.json({
    userId: session.userId,
    userEmail: session.userEmail,
    userName: session.userName,
  });
}
