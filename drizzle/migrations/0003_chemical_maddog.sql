ALTER TYPE "restaurant_area" ADD VALUE 'hasharon';--> statement-breakpoint
ALTER TYPE "restaurant_area" ADD VALUE 'shfela';--> statement-breakpoint
ALTER TYPE "restaurant_area" ADD VALUE 'eilat';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "website_url" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "maps_url" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "opening_hours" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "google_score" text;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "user_rating" integer;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "extra_locations" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
