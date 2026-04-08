# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server — kills port 3000, clears .next cache, starts fresh at http://localhost:3000
npm run dev

# Database — run after changing src/db/schema.ts
npm run db:generate   # generate migration SQL
npm run db:migrate    # apply migrations to Neon
npm run db:studio     # inspect DB visually

# Build for production
npm run build

# Seed restaurants from restaurant_output.json (safe to re-run — ON CONFLICT DO NOTHING)
node --env-file=.env.local scripts/seed-restaurants.mjs

# Geocode all restaurants that have an address but no lat/lng (Nominatim, ~1s/restaurant)
node --env-file=.env.local scripts/geocode-restaurants.mjs

# Re-seed DB from recipes_output.json (clears existing recipes first)
node --env-file=.env.local -e "const {neon}=require('@neondatabase/serverless');const sql=neon(process.env.DATABASE_URL);sql\`DELETE FROM recipes\`.then(()=>console.log('done'))"
node --env-file=.env.local scripts/seed-recipes.mjs

# Fetch missing dish images via Microlink (50 req/day free tier — safe to re-run)
node --env-file=.env.local scripts/fetch-images.mjs

# Extract a single recipe from a URL (Microlink + Claude Vision, no browser needed)
node --env-file=.env.local scripts/extract-single.mjs <instagram_or_facebook_url>
```

All `db:*` and script commands load `.env.local` automatically.

## Architecture

**Framework:** Next.js 14 App Router, TypeScript, Tailwind CSS  
**Database:** Neon PostgreSQL via Drizzle ORM (`@neondatabase/serverless`)  
**AI extraction:** Claude Haiku (`claude-haiku-4-5-20251001`) via `@anthropic-ai/sdk`  
**Auth:** `iron-session` single-password admin panel  
**Deployment target:** Vercel

### Adding a recipe — two paths

**Homepage URL box** (`/` → `AddRecipeSection` component → `POST /api/add-recipe`):
1. User pastes Instagram/Facebook URL on the homepage
2. Server calls `extractFromUrl()` in `src/lib/claude-extractor.ts`
3. Microlink API fetches post caption + image (no browser/cookies required)
4. Claude Haiku receives image (as base64) + text caption → returns structured recipe JSON via `tool_use`
5. Recipe saved to Neon DB + appended to `recipes_output.json`
6. User redirected to the new recipe page
7. If extraction fails → manual form shown as fallback

**Admin panel** (`/admin/add` → `/api/import/fetch-og` → `/api/import/extract` → `/api/import/confirm`):
- Requires iron-session auth
- Same Claude extraction, but with a review/edit step before saving

### Key files

| File | Purpose |
|---|---|
| `src/db/schema.ts` | Drizzle table definitions and enums. Change categories here. |
| `src/lib/claude-extractor.ts` | `extractFromUrl()` — Microlink fetch + Claude Vision extraction. `extractFromPost()` — legacy text-only path for `/admin` |
| `src/lib/constants.ts` | Hebrew display labels + `CATEGORY_COLORS` (hex palette per category) + `CATEGORY_SUBCATEGORIES` |
| `src/components/RecipeTabs.tsx` | Client component — category + subcategory pill tabs, uses inline `style={}` for colors (Tailwind purges dynamic class names) |
| `src/components/AddRecipeSection.tsx` | Homepage URL input → auto-extract → save flow |
| `src/middleware.ts` | Protects `/admin/*` routes (cookie presence check only) |
| `scripts/extract-single.mjs` | Standalone Node.js extractor used by `/URL2RECIPE` skill |
| `scripts/seed-recipes.mjs` | Bulk-seeds DB from `recipes_output.json` |
| `scripts/fetch-images.mjs` | Fills `image_url` for DB rows via Microlink |

### Database schema

Two tables: `recipes` and `restaurants`. Both have `slug`, `source_url`, `image_url`, `status` (`published | pending | rejected`).

**`recipes` category enum:** `starters | soups | salads | beef | chicken | fish | carbs_sides | desserts | drinks | other`  
**`recipes` subcategory enum:** `slow_cooking | stir_fry | oven | rice_dishes | pasta_pizza_dough | cooked_vegetables | alcoholic | smoothies | other`  
**`restaurants` area enum:** `jerusalem | tel_aviv | haifa | binyamina | north | south | center | other`

Adding a new enum value requires an `ALTER TYPE` migration — edit `schema.ts`, run `db:generate` + `db:migrate`.

### Category color system

All category colors are defined as hex values in `CATEGORY_COLORS` in `src/lib/constants.ts` (keys: `main`, `mainText`, `light`, `lightText`, `lighter`, `lighterText`). **Never use Tailwind class strings for dynamic category colors** — Tailwind purges them. Always use `style={{ backgroundColor: ..., color: ... }}` with the hex values.

### RTL / Hebrew conventions

- Root layout sets `<html lang="he" dir="rtl">`
- **Always use Tailwind logical properties** (`ms-*`, `me-*`, `ps-*`, `pe-*`, `text-start`, `text-end`) — never `ml-*`/`mr-*`/`pl-*`/`pr-*`
- All recipe data (name, ingredients, steps) stored and displayed in Hebrew

### Category classification rules (enforced in Claude prompts)

Meat takes priority over everything: beef/lamb/steak → `beef`, chicken/turkey → `chicken`, fish/seafood → `fish`. `carbs_sides` is **only** for dishes with no meat/fish at all. A dish served on rice or pasta is still categorized by its protein.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ADMIN_PASSWORD` | Password for `/admin` panel |
| `SESSION_SECRET` | 32+ char secret for iron-session cookie encryption |
| `ANTHROPIC_API_KEY` | Claude Haiku API key — needed for extraction on both homepage and `/admin` |
| `NEXT_PUBLIC_BASE_URL` | Production URL (used by sitemap and metadata) |
