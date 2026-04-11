import type { SessionOptions } from "iron-session";

export interface SessionData {
  isLoggedIn: boolean;  // admin flag — keep as-is
  userId?: string;      // approved user UUID
  userEmail?: string;
  userName?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "bitebase_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};
