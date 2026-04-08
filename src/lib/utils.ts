import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a URL-safe slug from a title.
 * For Hebrew titles, falls back to a UUID-based slug since Hebrew characters
 * don't transliterate well automatically.
 */
export function generateSlug(title: string, id: string): string {
  // Try ASCII-safe slug first (works for English titles)
  const ascii = title
    .toLowerCase()
    .replace(/[^\x00-\x7F]/g, "") // remove non-ASCII (Hebrew etc.)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Use ID prefix as the slug base (6 chars) with optional ascii suffix
  const idPrefix = id.replace(/-/g, "").slice(0, 8);
  return ascii ? `${ascii}-${idPrefix}` : idPrefix;
}

/**
 * Normalizes an Instagram/Facebook URL by stripping tracking parameters.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove common tracking params
    const paramsToRemove = [
      "igshid",
      "igsh",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "s",
    ];
    paramsToRemove.forEach((p) => parsed.searchParams.delete(p));
    // Normalize trailing slash
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/**
 * Extracts Instagram and Facebook URLs from a block of text.
 */
export function extractSocialUrls(text: string): string[] {
  const urlRegex =
    /https?:\/\/(www\.)?(instagram\.com|facebook\.com|fb\.com|fb\.watch)\S+/gi;
  const matches = text.match(urlRegex) ?? [];
  return matches.map((url) => {
    // Remove trailing punctuation that WhatsApp sometimes appends
    return url.replace(/[.,;!?)]+$/, "");
  });
}
