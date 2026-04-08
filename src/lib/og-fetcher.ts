export interface OgData {
  title?: string;
  description?: string;
  image?: string;
  status: "ok" | "blocked" | "error";
  error?: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Fetches Open Graph metadata from a URL.
 * Instagram often blocks server-side requests, so we gracefully degrade.
 */
export async function fetchOgData(url: string): Promise<OgData> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return { status: "blocked", error: `HTTP ${res.status}` };
    }

    const html = await res.text();

    // Check for Instagram login wall
    if (
      html.includes("login") &&
      html.includes("instagram") &&
      !html.includes('property="og:description"')
    ) {
      return { status: "blocked", error: "Instagram requires login" };
    }

    const title = extractMetaContent(html, "og:title") ?? extractTitle(html);
    const description = extractMetaContent(html, "og:description");
    const image = extractMetaContent(html, "og:image");

    if (!description && !title) {
      return { status: "blocked", error: "No OG data found" };
    }

    return { title, description, image, status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { status: "error", error: message };
  }
}

function extractMetaContent(
  html: string,
  property: string
): string | undefined {
  // Match both property= and name= variants
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i"
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
}
