import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/auth";
import { fetchOgData } from "@/lib/og-fetcher";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return Response.json({ error: "URL required" }, { status: 400 });
    }

    const ogData = await fetchOgData(url);
    return Response.json(ogData);
  } catch {
    return Response.json({ error: "Failed to fetch OG data" }, { status: 500 });
  }
}
