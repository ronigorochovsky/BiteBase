import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type SessionData } from "@/lib/auth";
import { extractFromPost } from "@/lib/claude-extractor";

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { source_url, og_title, og_description, manual_caption } = body;

    if (!source_url) {
      return Response.json({ error: "source_url required" }, { status: 400 });
    }

    const result = await extractFromPost({
      source_url,
      og_title,
      og_description,
      manual_caption,
    });

    return Response.json(result);
  } catch (err) {
    console.error("Extraction error:", err);
    return Response.json({ error: "Extraction failed" }, { status: 500 });
  }
}
