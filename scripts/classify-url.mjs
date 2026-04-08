/**
 * classify-url.mjs
 *
 * Fetches a URL via Microlink + Claude Haiku and classifies it as
 * "recipe" or "restaurant". Prints one word to stdout.
 *
 * Usage:
 *   node --env-file=.env.local scripts/classify-url.mjs <URL>
 *
 * Exit codes: 0 = success, 1 = error
 */

import Anthropic from "@anthropic-ai/sdk";

async function fetchViaLink(url) {
  const res = await fetch(
    `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
    { signal: AbortSignal.timeout(10_000) }
  );
  if (!res.ok) return {};
  const data = await res.json();
  return {
    title:       data?.data?.title ?? "",
    description: data?.data?.description ?? "",
    publisher:   data?.data?.publisher ?? "",
  };
}

async function main() {
  let url = process.argv[2];
  if (!url) { console.error("Usage: classify-url.mjs <URL>"); process.exit(1); }
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

  const { title, description, publisher } = await fetchViaLink(url);

  const context = [
    title       ? `כותרת: ${title}` : "",
    publisher   ? `מפרסם: ${publisher}` : "",
    description ? `תיאור: ${description}` : "",
    `קישור: ${url}`,
  ].filter(Boolean).join("\n");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 10,
    messages: [{
      role: "user",
      content: `בהתבסס על התוכן הבא, האם הפוסט הזה עוסק במתכון לבישול או בהמלצה על מסעדה?
${context}

ענה במילה אחת בלבד: "recipe" אם זה מתכון, "restaurant" אם זו מסעדה.`,
    }],
  });

  const answer = response.content.find(b => b.type === "text")?.text?.trim().toLowerCase() ?? "";
  if (answer.includes("restaurant")) {
    process.stdout.write("restaurant");
  } else {
    process.stdout.write("recipe");
  }
}

main().catch(err => { console.error(err); process.exit(1); });
