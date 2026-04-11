import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/auth";

const BBU_COOKIE = `bbu=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
const BBU_COOKIE_SECURE = `bbu=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}; Secure`;

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (!email || !password) {
    return Response.json({ error: "אימייל וסיסמה נדרשים" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    return Response.json({ error: "אימייל או סיסמה שגויים" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return Response.json({ error: "אימייל או סיסמה שגויים" }, { status: 401 });
  }

  if (user.status === "pending") {
    return Response.json({ error: "PENDING", message: "החשבון ממתין לאישור מנהל" }, { status: 403 });
  }
  if (user.status === "rejected") {
    return Response.json({ error: "REJECTED", message: "הגישה לחשבון זה נדחתה" }, { status: 403 });
  }

  // Set iron-session
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.userId = user.id;
  session.userEmail = user.email;
  session.userName = user.name;
  await session.save();

  // Also set the bbu indicator cookie (readable by Edge middleware)
  const isProduction = process.env.NODE_ENV === "production";
  const bbCookieHeader = isProduction ? BBU_COOKIE_SECURE : BBU_COOKIE;

  return new Response(JSON.stringify({ ok: true, name: user.name }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": bbCookieHeader,
    },
  });
}
