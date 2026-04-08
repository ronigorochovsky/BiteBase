import { extractSocialUrls, normalizeUrl } from "@/lib/utils";

export interface ParsedUrl {
  url: string;
  sentBy: string;
  sentAt: string;
  rawMessage: string;
}

/**
 * Parses a WhatsApp chat export (.txt file) and extracts all
 * Instagram/Facebook URLs with their context.
 *
 * Handles both Android and iOS WhatsApp export formats:
 * - [4/1/26, 10:30:00 AM] Name: message
 * - [01/04/2026, 10:30:00] Name: message
 * - 4/1/26, 10:30 AM - Name: message
 */
export function parseWhatsAppChat(content: string): ParsedUrl[] {
  const lines = content.split("\n");
  const results: ParsedUrl[] = [];
  const seenUrls = new Set<string>();

  // Regex for WhatsApp message line:
  // Matches: [date, time] Author: message  OR  date, time - Author: message
  const messageRegex =
    /^(?:\[([^\]]+)\]|([\d/,. ]+)) ?[-–] ?([^:]+): (.+)$/;

  let currentMessage: {
    author: string;
    timestamp: string;
    text: string;
  } | null = null;

  const processMessage = () => {
    if (!currentMessage) return;
    const urls = extractSocialUrls(currentMessage.text);
    for (const rawUrl of urls) {
      const normalized = normalizeUrl(rawUrl);
      if (!seenUrls.has(normalized)) {
        seenUrls.add(normalized);
        results.push({
          url: normalized,
          sentBy: currentMessage.author,
          sentAt: currentMessage.timestamp,
          rawMessage: currentMessage.text,
        });
      }
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(messageRegex);
    if (match) {
      // Save previous message before starting a new one
      processMessage();

      const timestamp = (match[1] ?? match[2] ?? "").trim();
      const author = match[3].trim();
      const text = match[4].trim();
      currentMessage = { author, timestamp, text };
    } else if (currentMessage) {
      // Multi-line message continuation
      currentMessage.text += "\n" + trimmed;
    }
  }

  // Process last message
  processMessage();

  return results;
}
