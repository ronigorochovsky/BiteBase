import Anthropic from "@anthropic-ai/sdk";
import type { RecipeCategory, RecipeSubcategory } from "@/db/schema";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedRecipe {
  title: string;
  category: RecipeCategory;
  subcategory?: RecipeSubcategory | null;
  description?: string;
  ingredients?: string;
  steps?: string;
  tips?: string;
}

export interface ExtractedRestaurant {
  name: string;
  area: import("@/db/schema").RestaurantArea;
  concept?: string;
  description?: string;
  address?: string;
  price_range?: string;
}

export interface ExtractionResult {
  type: "recipe" | "restaurant" | "unknown";
  recipe?: ExtractedRecipe;
  restaurant?: ExtractedRestaurant;
}

// ── Microlink fetch ─────────────────────────────────────────────────────────

interface MicrolinkData {
  imageUrl?: string;
  title?: string;
  description?: string;
}

async function fetchViaLink(url: string): Promise<MicrolinkData> {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=false`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return {};
    const data = await res.json();
    return {
      imageUrl: data?.data?.image?.url ?? undefined,
      title: data?.data?.title ?? undefined,
      description: data?.data?.description ?? undefined,
    };
  } catch {
    return {};
  }
}

// ── Tool schema ─────────────────────────────────────────────────────────────

const extractionTool: Anthropic.Tool = {
  name: "save_food_entry",
  description: "Save the extracted recipe or restaurant information from the social media post",
  input_schema: {
    type: "object" as const,
    required: ["type"],
    properties: {
      type: {
        type: "string" as const,
        enum: ["recipe", "restaurant", "unknown"],
      },
      recipe: {
        type: "object" as const,
        required: ["title", "category"],
        properties: {
          title: { type: "string" as const, description: "Dish name in Hebrew" },
          category: {
            type: "string" as const,
            enum: ["starters", "soups", "salads", "beef", "chicken", "fish", "carbs_sides", "desserts", "drinks", "other"],
            description: [
              "Category rules (priority order):",
              "- Any red meat (beef/lamb/steak/asado/brisket) → beef",
              "- Any poultry (chicken/turkey/schnitzel) → chicken",
              "- Any fish/seafood → fish",
              "- Sweet dish (cake/cookie/ice cream) → desserts",
              "- Drink/juice/smoothie/cocktail → drinks",
              "- Soup/broth → soups",
              "- Cold salad side → salads",
              "- Small appetizer → starters",
              "- Meatless carb/side (pasta/rice/pizza/bread/vegetables/eggs/cheese) → carbs_sides",
              "- Anything else → other",
              "IMPORTANT: if dish contains meat AND carbs (rice/pasta), always use the meat category."
            ].join(" "),
          },
          subcategory: {
            type: "string" as const,
            enum: ["slow_cooking", "stir_fry", "oven", "rice_dishes", "pasta_pizza_dough", "cooked_vegetables", "alcoholic", "smoothies", "other"],
            description: "beef→(slow_cooking,stir_fry,other) | chicken→(stir_fry,oven,other) | carbs_sides→(rice_dishes,pasta_pizza_dough,cooked_vegetables,other) | drinks→(alcoholic,smoothies,other) | others→omit",
          },
          ingredients: { type: "string" as const, description: "Ingredient list in Hebrew, one per line" },
          steps: { type: "string" as const, description: "Preparation steps in Hebrew, one per line" },
          tips: { type: "string" as const, description: "Optional tips in Hebrew" },
        },
      },
      restaurant: {
        type: "object" as const,
        required: ["name", "area"],
        properties: {
          name: { type: "string" as const },
          area: {
            type: "string" as const,
            enum: ["jerusalem", "tel_aviv", "haifa", "binyamina", "north", "south", "center", "other"],
          },
          concept: { type: "string" as const, description: "Cuisine type in Hebrew" },
          description: { type: "string" as const, description: "1-2 sentences in Hebrew" },
          address: { type: "string" as const },
          price_range: { type: "string" as const, enum: ["₪", "₪₪", "₪₪₪"] },
        },
      },
    },
  },
};

// ── Main: extract from URL using Microlink + Claude Vision ──────────────────

export async function extractFromUrl(sourceUrl: string): Promise<ExtractionResult & { imageUrl?: string }> {
  // 1. Fetch metadata + image via Microlink (no cookies, no browser needed)
  const { imageUrl, title, description } = await fetchViaLink(sourceUrl);

  const textContext = [
    title ? `כותרת: ${title}` : "",
    description ? `תיאור: ${description}` : "",
    `קישור: ${sourceUrl}`,
  ].filter(Boolean).join("\n");

  const prompt = `אתה מחלץ מידע על אוכל מפוסטים ברשתות חברתיות עבור אתר מתכונים עברי.
${textContext}

${imageUrl ? "בחן את התמונה ואת הטקסט ו" : ""}קבע:
1. האם הפוסט עוסק במתכון, מסעדה, או לא רלוונטי
2. אם מתכון — חלץ את כל הפרטים בעברית (שם, קטגוריה, מצרכים, שלבי הכנה)
3. אם המתכון מכיל בשר — השתמש תמיד בקטגוריית הבשר המתאימה (beef/chicken/fish) ולא carbs_sides

כל הטקסט חייב להיות בעברית.`;

  // 2. Build content blocks — include image as base64 if available
  type ContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam;
  const content: ContentBlock[] = [];

  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
        const mediaType = (
          ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(contentType)
            ? contentType
            : "image/jpeg"
        ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        content.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64 },
        });
      }
    } catch {
      // Image fetch failed — proceed with text only
    }
  }

  content.push({ type: "text", text: prompt });

  // 3. Call Claude (with vision if image available)
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    tools: [extractionTool],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { type: "unknown", imageUrl };
  }

  return { ...(toolUse.input as ExtractionResult), imageUrl };
}

// ── Legacy: kept for /admin/add (requires auth) ─────────────────────────────

export async function extractFromPost(input: {
  source_url: string;
  og_title?: string;
  og_description?: string;
  manual_caption?: string;
}): Promise<ExtractionResult> {
  const caption = input.manual_caption || input.og_description || input.og_title || "";
  if (!caption.trim()) return { type: "unknown" };

  const prompt = `אתה מחלץ מידע על אוכל מפוסטים ברשתות חברתיות עבור אתר BiteBase.
קישור: ${input.source_url}
${input.og_title ? `כותרת: ${input.og_title}` : ""}
תוכן: ${caption}
כל הטקסט צריך להיות בעברית.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    tools: [extractionTool],
    tool_choice: { type: "any" },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return { type: "unknown" };
  return toolUse.input as ExtractionResult;
}
