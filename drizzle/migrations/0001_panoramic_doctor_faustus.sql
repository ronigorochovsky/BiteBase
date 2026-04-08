DO $$ BEGIN
 CREATE TYPE "public"."recipe_subcategory" AS ENUM('slow_cooking', 'stir_fry', 'oven', 'rice_dishes', 'pasta_pizza_dough', 'cooked_vegetables', 'alcoholic', 'smoothies', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "recipe_category" ADD VALUE IF NOT EXISTS 'starters';--> statement-breakpoint
ALTER TYPE "recipe_category" ADD VALUE IF NOT EXISTS 'soups';--> statement-breakpoint
ALTER TYPE "recipe_category" ADD VALUE IF NOT EXISTS 'salads';--> statement-breakpoint
ALTER TYPE "recipe_category" ADD VALUE IF NOT EXISTS 'beef';--> statement-breakpoint
ALTER TYPE "recipe_category" ADD VALUE IF NOT EXISTS 'chicken';--> statement-breakpoint
ALTER TYPE "recipe_category" ADD VALUE IF NOT EXISTS 'fish';--> statement-breakpoint
ALTER TYPE "recipe_category" ADD VALUE IF NOT EXISTS 'carbs_sides';--> statement-breakpoint
ALTER TYPE "recipe_category" ADD VALUE IF NOT EXISTS 'drinks';--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "subcategory" "recipe_subcategory";