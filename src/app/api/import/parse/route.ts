import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/auth";
import { parseWhatsAppChat } from "@/lib/whatsapp-parser";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "File required" }, { status: 400 });
    }

    const content = await file.text();
    const urls = parseWhatsAppChat(content);

    return Response.json({ urls, total: urls.length });
  } catch (err) {
    console.error("Parse error:", err);
    return Response.json({ error: "Failed to parse file" }, { status: 500 });
  }
}
