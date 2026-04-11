import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, name, password } = body;

  if (!email || !name || !password) {
    return Response.json({ error: "כל השדות נדרשים" }, { status: 422 });
  }
  if (typeof email !== "string" || !email.includes("@")) {
    return Response.json({ error: "כתובת אימייל לא תקינה" }, { status: 422 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return Response.json({ error: "הסיסמה חייבת להכיל לפחות 6 תווים" }, { status: 422 });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    return Response.json({ error: "כתובת אימייל זו כבר רשומה" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    email: email.toLowerCase().trim(),
    name: name.trim(),
    password_hash,
    status: "pending",
  });

  return Response.json({ ok: true }, { status: 201 });
}
