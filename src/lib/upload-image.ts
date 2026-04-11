import { put } from "@vercel/blob";

/**
 * Downloads an image from a URL and uploads it to Vercel Blob.
 * Returns the permanent Blob URL, or null if anything fails.
 */
export async function uploadImageToBlob(
  imageUrl: string,
  filename: string
): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    const { url } = await put(filename, buffer, {
      access: "public",
      contentType,
    });

    return url;
  } catch {
    return null;
  }
}

/** Returns true if the URL is already a Vercel Blob URL (permanent). */
export function isBlobUrl(url: string): boolean {
  return url.includes(".public.blob.vercel-storage.com");
}
