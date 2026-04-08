/**
 * batch-extract-whatsapp.mjs
 *
 * Processes all Instagram/Facebook URLs from a WhatsApp chat export.
 * Combines classify + extract into a SINGLE Microlink call + SINGLE Claude call per URL.
 * Saves to recipes_output_2.json and restaurant_output.json.
 * Progress is saved to batch_progress.json so runs can be resumed.
 *
 * Usage:
 *   node --env-file=.env.local scripts/batch-extract-whatsapp.mjs [--limit=50] [--reset-progress]
 *
 * Options:
 *   --limit=N         Stop after processing N URLs (default: all)
 *   --reset-progress  Clear saved progress and start from scratch
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CHAT_FILE     = join(ROOT, "WhatsApp Chat with מסעדות/WhatsApp Chat with נשנשנים שמנמנים - מסעדות.txt");
const RECIPES_OUT   = join(ROOT, "recipes_output_2.json");
const REST_OUT      = join(ROOT, "restaurant_output.json");
const PROGRESS_FILE = join(ROOT, "batch_progress.json");

// ── Label maps ───────────────────────────────────────────────────────────────

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

const CATEGORY_LABELS = {
  starters:    "מנות פתיחה",
  soups:       "מרקים",
  salads:      "סלטים",
  beef:        "מנות בשר בקר",
  chicken:     "מנות עוף",
  fish:        "דגים",
  carbs_sides: "פחמימות ותוספות",
  desserts:    "קינוחים",
  drinks:      "משקאות",
  other:       "אחר",
};

const SUBCATEGORY_LABELS = {
  slow_cooking:      "בישול ארוך",
  stir_fry:          "מוקפצים",
  oven:              "בתנור",
  rice_dishes:       "תבשילי אורז",
  pasta_pizza_dough: "פסטות, פיצות ובצקים",
  cooked_vegetables: "ירקות מבושלים",
  alcoholic:         "אלכוהוליים",
  smoothies:         "שייקים",
  other:             "אחרים",
};

// ── URL extraction ────────────────────────────────────────────────────────────

function extractUrls(text) {
  const seen = new Set();
  const urls = [];
  // Match Instagram and Facebook URLs
  const re = /https?:\/\/www\.(instagram\.com\/(reel|p)\/[^/?\s]+|facebook\.com\/share\/[rvp]\/[^/?\s]+)/g;
  for (const [raw] of text.matchAll(re)) {
    // Normalize: strip query string, trailing punctuation
    const clean = raw.replace(/[).,]+$/, "");
    try {
      const u = new URL(clean);
      const key = u.origin + u.pathname;
      if (!seen.has(key)) {
        seen.add(key);
        urls.push(key); // Use canonical URL (no tracking params)
      }
    } catch { /* skip malformed */ }
  }
  return urls;
}

// ── Microlink fetch ───────────────────────────────────────────────────────────

async function fetchViaLink(url) {
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(12_000) }
    );
    if (res.status === 429) return { rateLimited: true };
    if (!res.ok) return {};
    const data = await res.json();
    return {
      imageUrl:    data?.data?.image?.url   ?? null,
      title:       data?.data?.title        ?? null,
      description: data?.data?.description  ?? null,
      publisher:   data?.data?.publisher    ?? null,
    };
  } catch {
    return {};
  }
}

// ── JSON extraction (handles preamble, markdown fences, both {} and []) ───────

function extractFirstJson(text) {
  let start = -1;
  let openChar = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" || text[i] === "[") { start = i; openChar = text[i]; break; }
  }
  if (start === -1) return null;

  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === '"') inStr = false;
    } else {
      if (c === '"') { inStr = true; continue; }
      if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
        }
      }
    }
  }
  return null;
}

// ── Serper enrichment ─────────────────────────────────────────────────────────

async function enrichFromSerper(restaurant, serperKey) {
  const query = [restaurant.name, restaurant.address].filter(Boolean).join(" ");
  try {
    const res = await fetch("https://google.serper.dev/maps", {
      method: "POST",
      headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl: "il", hl: "iw" }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return restaurant;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return restaurant;

    if (place.rating != null && !restaurant.google_score)      restaurant.google_score = place.rating;
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
  } catch { /* skip enrichment */ }
  return restaurant;
}

// ── Combined classify + extract ───────────────────────────────────────────────

async function extractCombined(sourceUrl, apiKey, serperKey) {
  const { imageUrl, title, description, publisher, rateLimited } = await fetchViaLink(sourceUrl);

  if (rateLimited) return [{ type: "failed", source_url: sourceUrl, error: "Microlink rate limit" }];
  if (!title && !description) return [{ type: "failed", source_url: sourceUrl, error: "No content from Microlink" }];

  const textContext = [
    title       ? `כותרת: ${title}` : "",
    publisher   ? `מפרסם: ${publisher}` : "",
    description ? `כיתוב הפוסט:\n${description}` : "",
    `קישור מקור: ${sourceUrl}`,
  ].filter(Boolean).join("\n");

  const prompt = `אתה מחלץ מידע מפוסטים ברשתות חברתיות.
${textContext}

${imageUrl ? "בחן את התמונה ואת הטקסט ו" : ""}קבע האם הפוסט הוא מתכון לבישול או המלצה על מסעדה/מסעדות, ואז חלץ את המידע.

אם זה מתכון — החזר אובייקט JSON אחד:
{
  "type": "recipe",
  "name": "שם המנה בעברית",
  "category": "one of: starters|soups|salads|beef|chicken|fish|carbs_sides|desserts|drinks|other",
  "subcategory": "beef→(slow_cooking|stir_fry|other) | chicken→(stir_fry|oven|other) | carbs_sides→(rice_dishes|pasta_pizza_dough|cooked_vegetables|other) | drinks→(alcoholic|smoothies|other) | שאר→null",
  "ingredients": ["מצרך 1", "מצרך 2"],
  "instructions": ["שלב 1", "שלב 2"]
}
חוקי קטגוריה: בשר אדום→beef | עוף/הודו→chicken | דג/פירות ים→fish | מתוק→desserts | שתייה→drinks | מרק→soups | סלט→salads | מנה ראשונה קטנה→starters | פחמימה ללא בשר→carbs_sides | אחר→other. בשר+פחמימה = תמיד קטגוריית הבשר.

אם זו מסעדה/מסעדות — החזר מערך JSON (אחד לכל מסעדה):
[
  {
    "type": "restaurant",
    "name": "שם המסעדה",
    "address": "כתובת מדויקת כולל עיר, או null",
    "area": "one of: jerusalem|tel_aviv|hasharon|haifa|binyamina|north|south|shfela|center|eilat|other",
    "style": "סגנון האוכל",
    "notes": "כל הטקסט מהפוסט על מסעדה זו (תיאור, מה לנסות, ציון וכו') או null",
    "website_url": null,
    "maps_url": null,
    "opening_hours": null,
    "phone": null,
    "google_score": null
  }
]
חוקי אזור: ירושלים/בית שמש→jerusalem | תל אביב/רמת גן/גבעתיים/בני ברק/חולון/בת ים/אור יהודה→tel_aviv | הרצליה/רעננה/כפר סבא/הוד השרון/רמת השרון/נתניה דרום/אלקנה→hasharon | חיפה/קריות/עכו/נשר→haifa | בנימינה/זכרון/פרדס חנה/קיסריה/עתלית→binyamina | נהריה/נצרת/טבריה/צפת/גליל→north | באר שבע/אשדוד/אשקלון/קריית גת/נגב→south | רחובות/נס ציונה/ראשון לציון/לוד/רמלה/מודיעין→shfela | פתח תקווה/ראש העין/שוהם/יהוד/אלעד→center | אילת→eilat | לא ברור→other.

החזר JSON בלבד (ללא markdown ללא טקסט נוסף).`;

  const client = new Anthropic({ apiKey });
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
    } catch { /* skip image */ }
  }
  content.push({ type: "text", text: prompt });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content }],
  });

  const raw = response.content.find(b => b.type === "text")?.text?.trim() ?? "";
  const parsed = extractFirstJson(raw);

  if (!parsed) {
    return [{ type: "failed", source_url: sourceUrl, error: "JSON parse failed", raw: raw.slice(0, 300) }];
  }

  // Normalize to array
  const items = Array.isArray(parsed) ? parsed : [parsed];

  const results = [];
  for (const item of items) {
    // Detect type if missing
    let t = item.type;
    if (!t) {
      t = item.ingredients ? "recipe" : (item.area !== undefined ? "restaurant" : "unknown");
    }

    if (t === "recipe") {
      const recipe = {
        ...item,
        type: "recipe",
        source_url: sourceUrl,
        image_url: imageUrl,
        category_he:    CATEGORY_LABELS[item.category]    ?? "",
        subcategory_he: item.subcategory ? (SUBCATEGORY_LABELS[item.subcategory] ?? "") : "",
      };
      results.push(recipe);

    } else if (t === "restaurant") {
      let restaurant = {
        ...item,
        type: "restaurant",
        source_url: sourceUrl,
        image_url: imageUrl,
        area_he: AREA_LABELS[item.area] ?? "",
      };
      // Add fallback Maps URL
      if (!restaurant.maps_url) {
        const q = encodeURIComponent([restaurant.name, restaurant.address].filter(Boolean).join(" "));
        restaurant.maps_url = `https://www.google.com/maps/search/${q}`;
      }
      // Serper enrichment
      if (serperKey && item.name) {
        try { restaurant = await enrichFromSerper(restaurant, serperKey); } catch { /* skip */ }
      }
      results.push(restaurant);

    } else {
      results.push({ type: "failed", source_url: sourceUrl, error: `Unknown type: ${t}`, raw: raw.slice(0, 200) });
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error("ANTHROPIC_API_KEY not set"); process.exit(1); }
  const serperKey = process.env.SERPER_API_KEY ?? null;

  const args = process.argv.slice(2);
  const limitArg  = args.find(a => a.startsWith("--limit="));
  const resetProg = args.includes("--reset-progress");
  const limit     = limitArg ? parseInt(limitArg.slice("--limit=".length), 10) : Infinity;

  // Load/init progress
  let progress = { processed: {} };
  if (!resetProg && existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(readFileSync(PROGRESS_FILE, "utf8"));
    console.log(`Resuming: ${Object.keys(progress.processed).length} already done`);
  } else if (resetProg) {
    console.log("Progress reset.");
  }

  // Extract unique URLs from chat
  const chatText = readFileSync(CHAT_FILE, "utf8");
  const allUrls = extractUrls(chatText);
  console.log(`Total unique URLs in chat: ${allUrls.length}`);

  const toProcess = allUrls.filter(u => !progress.processed[u]);
  const batch = toProcess.slice(0, limit === Infinity ? toProcess.length : limit);
  console.log(`Processing ${batch.length} URLs this run (${toProcess.length - batch.length} will remain)`);
  if (!serperKey) console.log("  Serper: skipped (add SERPER_API_KEY to .env.local for auto-enrichment)");

  // Load or init output files
  const recipes     = existsSync(RECIPES_OUT) ? JSON.parse(readFileSync(RECIPES_OUT, "utf8")) : [];
  const restaurants = existsSync(REST_OUT)    ? JSON.parse(readFileSync(REST_OUT,    "utf8")) : [];

  let done = 0, recipeCount = 0, restaurantCount = 0, failedCount = 0;

  function saveAll() {
    writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), "utf8");
    writeFileSync(RECIPES_OUT,   JSON.stringify(recipes,     null, 2), "utf8");
    writeFileSync(REST_OUT,      JSON.stringify(restaurants, null, 2), "utf8");
  }

  // Process with concurrency of 3
  const CONCURRENCY = 3;
  let idx = 0;

  async function worker() {
    while (idx < batch.length) {
      const url = batch[idx++];
      const num = done + 1;
      process.stdout.write(`[${num}/${batch.length}] ${url.slice(0, 75)}...\n`);

      let results;
      try {
        results = await extractCombined(url, apiKey, serperKey);
      } catch (err) {
        results = [{ type: "failed", source_url: url, error: err.message }];
      }

      // Check for rate limit
      const rateLimited = results.some(r => r.error === "Microlink rate limit");
      if (rateLimited) {
        console.error("  ⚠️  Microlink rate limit hit. Saving progress and stopping.");
        saveAll();
        process.exit(0);
      }

      for (const item of results) {
        if (item.type === "recipe") {
          recipes.push(item);
          recipeCount++;
          process.stdout.write(`  ✓ מתכון: ${item.name} [${item.category_he}]\n`);
        } else if (item.type === "restaurant") {
          restaurants.push(item);
          restaurantCount++;
          process.stdout.write(`  ✓ מסעדה: ${item.name} [${item.area_he ?? ""}]\n`);
        } else {
          failedCount++;
          process.stdout.write(`  ✗ נכשל: ${item.error}\n`);
        }
      }

      progress.processed[url] = true;
      done++;

      // Save every 10 URLs
      if (done % 10 === 0) saveAll();

      // Small delay to be polite to Microlink
      await new Promise(r => setTimeout(r, 150));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  saveAll();

  const remaining = toProcess.length - batch.length;
  console.log(`\n=== Batch complete ===`);
  console.log(`  Recipes:     ${recipeCount}`);
  console.log(`  Restaurants: ${restaurantCount}`);
  console.log(`  Failed:      ${failedCount}`);
  console.log(`  Remaining:   ${remaining}`);
  if (remaining > 0) {
    console.log(`\n  Run again to continue: node --env-file=.env.local scripts/batch-extract-whatsapp.mjs --limit=${limit}`);
  } else {
    console.log(`\n  ✓ All URLs processed!`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
