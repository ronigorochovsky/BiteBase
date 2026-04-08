---
description: Extracts a structured recipe from an Instagram or Facebook URL via Microlink + Claude Vision and appends it to recipes_output.json. Use when the user provides a social media URL and asks to extract or save a recipe.
allowed-tools: Bash(node:*)
---

Extract a recipe from the following URL: $ARGUMENTS

## Steps

1. Run the extraction via Node.js (Microlink + Claude Vision — no browser or cookies needed):

```
node --env-file=.env.local "g:/Claude Code working dir/BiteBase/scripts/extract-single.mjs" "$ARGUMENTS"
```

2. Read `single_recipe_output.json` and display the result to the user in a clean, readable format showing:
   - Name (שם המנה)
   - Category in Hebrew (קטגוריה)
   - Subcategory in Hebrew if present (תת-קטגוריה)
   - Ingredients (מצרכים) — as a bullet list
   - Instructions (הוראות הכנה) — as a numbered list
   - Source URL

3. Ask the user: "האם להוסיף את המתכון ל-recipes_output.json?" (Should I add this recipe to recipes_output.json?)

4. If the user confirms, append the recipe to `recipes_output.json`:
   - Read the existing `recipes_output.json` (if it exists, otherwise start with `[]`)
   - Append the new recipe object
   - Write back to `recipes_output.json`
   - Confirm: "המתכון נוסף בהצלחה!"

## Error handling

- If the script returns `{ failed: true }`: tell the user that Microlink could not retrieve the post content, and ask them to paste the caption manually.
- If `$ARGUMENTS` is empty or not a URL: ask the user to provide an Instagram or Facebook URL.
