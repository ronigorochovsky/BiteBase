import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  doublePrecision,
  integer,
} from "drizzle-orm/pg-core";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const recipeCategoryEnum = pgEnum("recipe_category", [
  "starters",
  "soups",
  "salads",
  "beef",
  "chicken",
  "fish",
  "carbs_sides",
  "desserts",
  "drinks",
  "other",
]);

export const recipeSubcategoryEnum = pgEnum("recipe_subcategory", [
  "slow_cooking",
  "stir_fry",
  "oven",
  "rice_dishes",
  "pasta_pizza_dough",
  "cooked_vegetables",
  "alcoholic",
  "smoothies",
  "other",
]);

export const restaurantAreaEnum = pgEnum("restaurant_area", [
  "jerusalem",
  "tel_aviv",
  "hasharon",
  "haifa",
  "binyamina",
  "north",
  "south",
  "shfela",
  "center",
  "eilat",
  "other",
]);

export const entryStatusEnum = pgEnum("entry_status", [
  "pending",
  "published",
  "rejected",
]);

// ── Recipes ───────────────────────────────────────────────────────────────────

export const recipes = pgTable("recipes", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: recipeCategoryEnum("category").notNull().default("other"),
  subcategory: recipeSubcategoryEnum("subcategory"),
  description: text("description"),
  ingredients: text("ingredients"), // newline-separated list
  steps: text("steps"),             // newline-separated numbered steps
  tips: text("tips"),
  source_url: text("source_url").notNull(),
  image_url: text("image_url"),
  status: entryStatusEnum("status").notNull().default("published"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ── Restaurants ───────────────────────────────────────────────────────────────

export const restaurants = pgTable("restaurants", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  area: restaurantAreaEnum("area").notNull().default("other"),
  concept: text("concept"),
  description: text("description"),
  address: text("address"),
  price_range: text("price_range"), // "₪", "₪₪", "₪₪₪"
  source_url: text("source_url").notNull(),
  image_url: text("image_url"),
  website_url: text("website_url"),
  maps_url: text("maps_url"),
  opening_hours: text("opening_hours"),
  phone: text("phone"),
  google_score: text("google_score"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  user_rating: integer("user_rating"),
  status: entryStatusEnum("status").notNull().default("published"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// ── Comments ──────────────────────────────────────────────────────────────────

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipe_id: uuid("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  author_name: text("author_name").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;

export type RecipeCategory = (typeof recipeCategoryEnum.enumValues)[number];
export type RecipeSubcategory = (typeof recipeSubcategoryEnum.enumValues)[number];
export type RestaurantArea = (typeof restaurantAreaEnum.enumValues)[number];
export type EntryStatus = (typeof entryStatusEnum.enumValues)[number];
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
