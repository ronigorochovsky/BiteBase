import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { generateSlug } from "@/lib/utils";
import { RESTAURANT_AREA_LABELS } from "@/lib/constants";
import { extractFromUrl } from "@/lib/claude-extractor";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const JSON_PATH = join(process.cwd(), "restaurants_output.json");

function readJson(): object[] {
  try {
    return JSON.parse(readFileSync(JSON_PATH, "utf8"));
  } catch {
    return [];
  }
}

async function saveRestaurant(entry: {
  name: string;
  area: string;
  concept?: string | null;
  description?: string | null;
  address?: string | null;
  price_range?: string | null;
  source_url: string;
  image_url?: string | null;
  website_url?: string | null;
  maps_url?: string | null;
  opening_hours?: string | null;
  phone?: string | null;
  google_score?: string | null;
}): Promise<string> {
  const id = randomUUID();
  const slug = generateSlug(entry.name, id);

  await db.insert(restaurants).values({
    id,
    slug,
    name: entry.name,
    area: (entry.area ?? "other") as never,
    concept: entry.concept ?? null,
    description: entry.description ?? null,
    address: entry.address ?? null,
    price_range: entry.price_range ?? null,
    source_url: entry.source_url,
    image_url: entry.image_url ?? null,
    website_url: entry.website_url ?? null,
    maps_url: entry.maps_url ?? null,
    opening_hours: entry.opening_hours ?? null,
    phone: entry.phone ?? null,
    google_score: entry.google_score ?? null,
    status: "published",
  });

  // Append to JSON file
  const existing = readJson();
  const areaKey = entry.area as keyof typeof RESTAURANT_AREA_LABELS;
  writeFileSync(
    JSON_PATH,
    JSON.stringify(
      [
        ...existing,
        {
          name: entry.name,
          area: entry.area,
          area_he: RESTAURANT_AREA_LABELS[areaKey] ?? "",
          style: entry.concept ?? null,
          address: entry.address ?? null,
          description: entry.description ?? null,
          website_url: entry.website_url ?? null,
          maps_url: entry.maps_url ?? null,
          opening_hours: entry.opening_hours ?? null,
          phone: entry.phone ?? null,
          google_score: entry.google_score ?? null,
          source_url: entry.source_url,
          image_url: entry.image_url ?? null,
          sentAt: new Date().toLocaleString("he-IL"),
        },
      ],
      null,
      2
    ),
    "utf8"
  );

  return slug;
}

// POST /api/add-restaurant
// Auto mode: { url } → Microlink + Claude Vision extracts everything
// Manual mode: { manual: true, name, area, ... }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    // ── Manual save ──
    if (body.manual) {
      const { name, area, concept, description, address } = body;
      if (!name) return Response.json({ error: "Name required" }, { status: 400 });

      const slug = await saveRestaurant({
        name,
        area: area ?? "other",
        concept: concept || null,
        description: description || null,
        address: address || null,
        source_url: url || "",
      });
      return Response.json({ ok: true, slug });
    }

    if (!url) return Response.json({ error: "URL required" }, { status: 400 });

    // ── Auto extract via Microlink + Claude Vision ──
    const result = await extractFromUrl(url);

    if (result.type !== "restaurant" || !result.restaurant?.name) {
      return Response.json({ ok: false, failed: true });
    }

    const { restaurant, imageUrl } = result;

    const slug = await saveRestaurant({
      name: restaurant.name,
      area: restaurant.area ?? "other",
      concept: restaurant.concept ?? null,
      description: restaurant.description ?? null,
      address: restaurant.address ?? null,
      price_range: restaurant.price_range ?? null,
      source_url: url,
      image_url: imageUrl ?? null,
    });

    return Response.json({ ok: true, slug, name: restaurant.name });
  } catch (err) {
    console.error("add-restaurant error:", err);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
}
