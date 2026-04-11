import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/auth";

export async function getSession(): Promise<SessionData> {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function requireUser(): Promise<{ userId: string; userEmail: string; userName: string }> {
  const session = await getSession();
  if (!session.userId) {
    throw new Error("UNAUTHENTICATED");
  }
  return {
    userId: session.userId,
    userEmail: session.userEmail!,
    userName: session.userName!,
  };
}
