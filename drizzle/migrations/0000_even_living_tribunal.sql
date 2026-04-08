DO $$ BEGIN
 CREATE TYPE "public"."entry_status" AS ENUM('pending', 'published', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."recipe_category" AS ENUM('desserts', 'breakfast', 'chicken', 'slow_meat', 'salads', 'pasta', 'soups', 'baking', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."restaurant_area" AS ENUM('jerusalem', 'tel_aviv', 'haifa', 'binyamina', 'north', 'south', 'center', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" "recipe_category" DEFAULT 'other' NOT NULL,
	"description" text,
	"ingredients" text,
	"steps" text,
	"tips" text,
	"source_url" text NOT NULL,
	"image_url" text,
	"status" "entry_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"area" "restaurant_area" DEFAULT 'other' NOT NULL,
	"concept" text,
	"description" text,
	"address" text,
	"price_range" text,
	"source_url" text NOT NULL,
	"image_url" text,
	"status" "entry_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_slug_unique" UNIQUE("slug")
);
