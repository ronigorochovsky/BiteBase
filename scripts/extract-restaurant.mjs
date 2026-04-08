/**
 * extract-restaurant.mjs
 *
 * Extracts restaurant info from a single Instagram/Facebook URL using
 * Microlink (for caption + image + video) + Claude Vision (for extraction).
 * No browser, no cookies needed.
 *
 * Usage:
 *   node --env-file=.env.local scripts/extract-restaurant.mjs <URL> [output.json]
 */

import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const AREA_LABELS = {
  jerusalem: "ירושלים וסביבה",
  tel_aviv:  "תל אביב וסביבה",
  hasharon:  "השרון",
  haifa:     "חיפה וסביבה",
  binyamina: "בנימינה וסביבה",
  north:     "צפון",
  south:     "דרום",
  shfela:    "השפלה",
  center:    "מרכז",
  eilat:     "אילת",
  other:     "אחר",
};

async function fetchViaLink(url) {
  const res = await fetch(
    `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
    { signal: AbortSignal.timeout(10_000) }
  );
  if (!res.ok) return {};
  const data = await res.json();
  return {
    imageUrl:    data?.data?.image?.url ?? null,
    title:       data?.data?.title ?? null,
    description: data?.data?.description ?? null,
    publisher:   data?.data?.publisher ?? null,
  };
}

function extractAllJsonObjects(text) {
  // Find all complete top-level '{...}' objects, respecting quoted strings
  const results = [];
  let start = -1;
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === '"') inStr = false;
    } else {
      if (c === '"') { inStr = true; continue; }
      if (c === "{") {
        if (depth === 0) start = i;
        depth++;
      } else if (c === "}") {
        depth--;
        if (depth === 0 && start !== -1) {
          try { results.push(JSON.parse(text.slice(start, i + 1))); } catch { /* skip malformed */ }
          start = -1;
        }
      }
    }
  }
  return results;
}

async function extractRestaurant(sourceUrl, apiKey, extraCaption = null) {
  const client = new Anthropic({ apiKey });

  const { imageUrl, title, description, publisher } = await fetchViaLink(sourceUrl);
  console.log(`  Microlink: title="${title?.slice(0, 60)}", image=${imageUrl ? "✓" : "✗"}`);

  // If a full caption was provided manually, use it instead of Microlink's truncated description
  const captionText = extraCaption ?? description;

  const textContext = [
    title         ? `כותרת: ${title}` : "",
    publisher     ? `מפרסם: ${publisher}` : "",
    captionText   ? `כיתוב הפוסט:\n${captionText}` : "",
    `קישור מקור: ${sourceUrl}`,
  ].filter(Boolean).join("\n");

  const prompt = `אתה מחלץ מידע על מסעדות מפוסטים ברשתות חברתיות.
${textContext}

${imageUrl ? "בחן את התמונה ואת הטקסט ו" : ""}חלץ את פרטי המסעדה.

חוקי סיווג אזור (לפי מרחק מרכז העיר עד 15 ק"מ):
- ירושלים ובית שמש, בית לחם → jerusalem
- תל אביב, רמת גן, גבעתיים, בני ברק, חולון, בת ים, אור יהודה → tel_aviv
- הרצליה, רעננה, כפר סבא, הוד השרון, רמת השרון, נתניה (דרום), אלקנה → hasharon
- חיפה, קריות, עכו, נשר, טירת כרמל → haifa
- בנימינה, זכרון יעקב, פרדס חנה, עתלית, קיסריה → binyamina
- נהריה, נצרת, טבריה, צפת, מיעוטי הגליל → north
- באר שבע, אשדוד, אשקלון, קריית גת, נגב → south
- רחובות, נס ציונה, ראשון לציון, לוד, רמלה, מודיעין → shfela
- פתח תקווה, ראש העין, שוהם, יהוד, אלעד → center
- אילת → eilat
- אם לא ברור → other

חלץ את כל המסעדות המוזכרות בפוסט. החזר JSON בלבד (ללא markdown וללא טקסט נוסף) — מערך של אובייקטים, אחד לכל מסעדה:
[
  {
    "name": "שם המסעדה בעברית (או בשפת המקור אם אין שם עברי)",
    "address": "כתובת מדויקת כולל עיר כפי שמופיעה בפוסט, או null",
    "area": "one of: jerusalem|tel_aviv|hasharon|haifa|binyamina|north|south|shfela|center|eilat|other",
    "style": "סגנון האוכל (לדוגמה: בשרייה, פיצה, תאילנדי, המבורגר, ים תיכוני)",
    "notes": "כל הטקסט שנכתב בפוסט על המסעדה הזו — תיאור, המלצות, מה לנסות, ציון, הערות — כמו שכתוב, או null",
    "website_url": "כתובת האתר הרשמי או null",
    "maps_url": "קישור גוגל מפות או null",
    "opening_hours": "שעות פתיחה כפי שמופיעות בפוסט, או null",
    "phone": "מספר טלפון או null",
    "google_score": "ציון גוגל (מספר בין 1-5) או null"
  }
]`;

  const content = [];

  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8_000) });
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const ct = imgRes.headers.get("content-type") ?? "image/jpeg";
        const mediaType = ["image/jpeg","image/png","image/gif","image/webp"].includes(ct) ? ct : "image/jpeg";
        content.push({ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } });
      }
    } catch { /* skip image, use text only */ }
  }

  content.push({ type: "text", text: prompt });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    messages: [{ role: "user", content }],
  });

  const raw = response.content.find(b => b.type === "text")?.text?.trim() ?? "";

  // Extract all complete JSON objects (handles preamble, markdown fences, truncated arrays)
  const objects = extractAllJsonObjects(raw).filter(o => o?.name);
  if (!objects.length) {
    console.error("  JSON parse failed:", raw.slice(0, 300));
    return [];
  }
  return objects.map(o => ({ ...o, source_url: sourceUrl, image_url: imageUrl }));
}

async function enrichFromSerper(restaurant, serperKey) {
  const query = [restaurant.name, restaurant.address].filter(Boolean).join(" ");
  console.log(`  Serper (Google Maps): searching "${query}"...`);

  const res = await fetch("https://google.serper.dev/maps", {
    method: "POST",
    headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, gl: "il", hl: "iw" }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) { console.log(`  Serper: failed (${res.status})`); return restaurant; }
  const data = await res.json();
  const place = data?.places?.[0];
  if (!place) { console.log("  Serper: no results found"); return restaurant; }

  console.log(`  Serper: found "${place.title}" — rating=${place.rating}`);

  if (place.rating != null && !restaurant.google_score)
    restaurant.google_score = place.rating;
  if (place.ratingCount != null && !restaurant.google_reviews_count)
    restaurant.google_reviews_count = place.ratingCount;
  if (!restaurant.phone && place.phoneNumber)
    restaurant.phone = place.phoneNumber;
  if (!restaurant.website_url && place.website)
    restaurant.website_url = place.website;
  if (!restaurant.maps_url && place.cid)
    restaurant.maps_url = `https://www.google.com/maps/place/?q=place_id:${place.cid}`;
  if (!restaurant.address && place.address)
    restaurant.address = place.address;
  if (!restaurant.opening_hours && place.openingHours)
    restaurant.opening_hours = place.openingHours;

  return restaurant;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error("Usage: node extract-restaurant.mjs <URL> [output.json] [--caption=\"...\"]");
    process.exit(1);
  }

  let url = args[0];
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  // Find optional --caption="..." argument
  const captionArg = args.find(a => a.startsWith("--caption="));
  const extraCaption = captionArg ? captionArg.slice("--caption=".length) : null;
  if (extraCaption) console.log(`  Using provided caption (${extraCaption.length} chars)`);

  const outFile = args.find(a => !a.startsWith("--") && a !== args[0]) ?? join(ROOT, "single_restaurant_output.json");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }

  console.log(`Extracting restaurant: ${url}`);
  const restaurants = await extractRestaurant(url, apiKey, extraCaption);

  if (!restaurants.length) {
    const result = [{ source_url: url, failed: true, error: "Could not extract restaurant info" }];
    writeFileSync(outFile, JSON.stringify(result, null, 2), "utf8");
    console.log("✗ Extraction failed");
    process.exit(0);
  }

  const serperKey = process.env.SERPER_API_KEY;
  const enriched = [];
  for (let restaurant of restaurants) {
    if (serperKey) {
      try { restaurant = await enrichFromSerper(restaurant, serperKey); }
      catch (err) { console.warn("  Serper enrichment failed:", err.message); }
    } else {
      const q = encodeURIComponent([restaurant.name, restaurant.address].filter(Boolean).join(" "));
      restaurant.maps_url = restaurant.maps_url ?? `https://www.google.com/maps/search/${q}`;
    }
    restaurant.area_he = AREA_LABELS[restaurant.area] ?? "";
    enriched.push(restaurant);
    console.log(`✓ Extracted: ${restaurant.name} [${restaurant.area_he}] — ${restaurant.style ?? "לא ידוע"} — score: ${restaurant.google_score ?? "N/A"}`);
  }

  if (!serperKey) console.log("  Google enrichment: skipped (add SERPER_API_KEY to .env.local for auto score/phone/hours)");

  writeFileSync(outFile, JSON.stringify(enriched, null, 2), "utf8");
}

main().catch(err => { console.error(err); process.exit(1); });
