/**
 * Geocodes restaurants using Nominatim (OpenStreetMap).
 * Rate-limited to 1 req/sec per Nominatim policy.
 *
 * Usage:
 *   node --env-file=.env.local scripts/geocode-restaurants.mjs
 *          → only restaurants with missing lat/lng
 *
 *   node --env-file=.env.local scripts/geocode-restaurants.mjs --force
 *          → re-geocode ALL restaurants (overwrites existing coordinates)
 *
 *   node --env-file=.env.local scripts/geocode-restaurants.mjs --slug=la-atara
 *          → re-geocode one specific restaurant by slug
 */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const UA = "BiteBase/1.0";

const FORCE = process.argv.includes("--force");
const SLUG_ARG = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Hebrew city names → English transliterations that Nominatim handles well
const CITY_EN = {
  "תל אביב": "Tel Aviv",
  "תל-אביב": "Tel Aviv",
  "תל אביב-יפו": "Tel Aviv",
  "תל-אביב-יפו": "Tel Aviv",
  "ירושלים": "Jerusalem",
  "חיפה": "Haifa",
  "בנימינה": "Binyamina",
  "רמת גן": "Ramat Gan",
  "הרצליה": "Herzliya",
  "הרצליה פיתוח": "Herzliya Pituah",
  "רעננה": "Ra'anana",
  "פתח תקווה": "Petah Tikva",
  "גבעתיים": "Givatayim",
  "כפר סבא": "Kfar Saba",
  "נתניה": "Netanya",
  "ראשון לציון": "Rishon LeZion",
  "אשדוד": "Ashdod",
  "אשקלון": "Ashkelon",
  "באר שבע": "Beer Sheva",
  "עכו": "Acre",
  "נהריה": "Nahariya",
  "כרמיאל": "Karmiel",
  "טבריה": "Tiberias",
  "צפת": "Safed",
  "יפו": "Jaffa",
  "רמת השרון": "Ramat HaSharon",
  "הוד השרון": "Hod HaSharon",
  "כפר יונה": "Kfar Yona",
  "זכרון יעקב": "Zichron Yaakov",
  "עיר ימים": "Ir Yamim",
  "קיסריה": "Caesarea",
  "חדרה": "Hadera",
  "רחובות": "Rehovot",
  "מודיעין": "Modi'in",
  "אילת": "Eilat",
};

/**
 * Split "הירקון 66, תל אביב-יפו" into { street, cityHe, cityEn, isCityOnly }.
 * When there is NO comma the entire string is a city/area name — isCityOnly=true.
 * We must NOT pass city-name-only addresses as the `street` param to Nominatim;
 * that would match a street *named* after the city in a completely different city.
 */
function parseAddress(address) {
  const commaIdx = address.lastIndexOf(",");

  if (commaIdx < 0) {
    // e.g. "זכרון יעקב", "גבעתיים", "תל אביב"
    const cityHe = address.trim();
    const cityEn = CITY_EN[cityHe] ?? cityHe;
    return { street: "", cityHe, cityEn, isCityOnly: true };
  }

  const street = address.slice(0, commaIdx).trim();
  const cityRaw = address.slice(commaIdx + 1).trim();
  // Strip sub-city suffix: "תל אביב-יפו" → "תל אביב"
  const cityHe = cityRaw.split(/\s*[-–]\s*/)[0].trim();
  const cityEn = CITY_EN[cityRaw] ?? CITY_EN[cityHe] ?? cityHe;

  return { street, cityHe, cityEn, isCityOnly: false };
}

async function nominatim(url) {
  await sleep(1100); // Nominatim: ≤ 1 req/sec
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept-Language": "en,he" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Try multiple Nominatim strategies in order; return first hit.
 * Strategy order (most → least specific):
 *  1. Structured: street + English city + country
 *  2. Free-text:  "{street}, {English city}, Israel"
 *  3. Free-text:  original address + ", Israel"
 *  4. Free-text:  restaurant name + English city + "Israel"
 */
async function geocode(name, address) {
  const { street, cityEn, isCityOnly } = parseAddress(address);
  const base = "https://nominatim.openstreetmap.org/search";

  const strategies = [
    // 1. Structured query — only when we have a real street (not city-only addresses)
    ...(!isCityOnly && street ? [`${base}?${new URLSearchParams({
      street,
      city: cityEn,
      country: "Israel",
      format: "json",
      limit: "1",
    })}`] : []),

    // 2. Free-text with English city substituted
    `${base}?${new URLSearchParams({
      q: isCityOnly ? `${cityEn}, Israel` : `${street}, ${cityEn}, Israel`,
      format: "json",
      limit: "1",
      countrycodes: "il",
    })}`,

    // 3. Free-text with the raw stored address
    `${base}?${new URLSearchParams({
      q: `${address}, Israel`,
      format: "json",
      limit: "1",
      countrycodes: "il",
    })}`,

    // 4. Restaurant name + city (last resort — approximate)
    `${base}?${new URLSearchParams({
      q: `${name}, ${cityEn}, Israel`,
      format: "json",
      limit: "1",
      countrycodes: "il",
    })}`,
  ];

  for (const [i, url] of strategies.entries()) {
    const coords = await nominatim(url);
    if (coords) {
      process.stdout.write(` [strategy ${i + 1}]`);
      return coords;
    }
  }
  return null;
}

async function main() {
  let rows;

  if (SLUG_ARG) {
    rows = await sql`
      SELECT id, slug, name, address FROM restaurants
      WHERE slug = ${SLUG_ARG} AND address IS NOT NULL
    `;
  } else if (FORCE) {
    rows = await sql`
      SELECT id, slug, name, address FROM restaurants
      WHERE address IS NOT NULL ORDER BY created_at
    `;
  } else {
    rows = await sql`
      SELECT id, slug, name, address FROM restaurants
      WHERE address IS NOT NULL AND (lat IS NULL OR lng IS NULL)
      ORDER BY created_at
    `;
  }

  const mode = SLUG_ARG ? `slug=${SLUG_ARG}` : FORCE ? "force (all)" : "missing only";
  console.log(`Mode: ${mode} — ${rows.length} restaurant(s) to geocode\n`);

  let success = 0;
  let failed = 0;

  for (const [i, row] of rows.entries()) {
    process.stdout.write(`[${i + 1}/${rows.length}] ${row.name} (${row.address})...`);
    const coords = await geocode(row.name, row.address);
    if (coords) {
      await sql`UPDATE restaurants SET lat = ${coords.lat}, lng = ${coords.lng} WHERE id = ${row.id}`;
      console.log(` ✓ (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`);
      success++;
    } else {
      console.log(" ✗ not found");
      failed++;
    }
  }

  console.log(`\nDone! ✓ ${success}  ✗ ${failed}`);
}

main().catch(console.error);
