---
description: Receives a URL or free-text (pasted recipe or restaurant description), classifies it, and extracts structured data into the appropriate JSON file.
allowed-tools: Bash(node:*)
---

Classify and extract content from the following input: $ARGUMENTS

## Free-text input (no URL)

If `$ARGUMENTS` is plain text (not a URL — i.e. does not start with `http`), run the text extractor directly:

```
"/c/Program Files/nodejs/node.exe" --env-file=.env.local "g:/Claude Code working dir/BiteBase/scripts/extract-from-text.mjs" --text="$ARGUMENTS"
```

Then read `single_recipe_output.json` or `single_restaurant_output.json` (whichever was written) and display the results using the same format as below. Then ask to save — for a recipe: "האם להוסיף את המתכון ל-recipes_output.json?", for each restaurant: "האם להוסיף את **[name]** ל-restaurants_output.json?".

Skip the remaining steps below — they apply only to URLs.

---

## URL input

1. Run the classifier to determine whether the URL is a recipe or a restaurant:

```
"/c/Program Files/nodejs/node.exe" --env-file=.env.local "g:/Claude Code working dir/BiteBase/scripts/classify-url.mjs" "$ARGUMENTS"
```

2. Read the output (one word: `recipe` or `restaurant`) and tell the user:
   - "זוהה כמתכון — מחלץ..." if `recipe`
   - "זוהה כמסעדה — מחלץ..." if `restaurant`

3a. If the result is `recipe` — run the recipe extractor:

```
"/c/Program Files/nodejs/node.exe" --env-file=.env.local "g:/Claude Code working dir/BiteBase/scripts/extract-single.mjs" "$ARGUMENTS"
```

Then read `single_recipe_output.json` and display:
- **שם המנה** (Name)
- **קטגוריה** (Category in Hebrew)
- **תת-קטגוריה** (Subcategory in Hebrew, if present)
- **מצרכים** (Ingredients) — bullet list
- **הוראות הכנה** (Instructions) — numbered list
- **קישור מקור** (Source URL)

Then ask: "האם להוסיף את המתכון ל-recipes_output.json?"

If confirmed:
- Read `recipes_output.json` (or start with `[]`)
- Append the recipe object
- Write back to `recipes_output.json`
- Confirm: "המתכון נוסף בהצלחה!"

3b. If the result is `restaurant` — run the restaurant extractor:

```
"/c/Program Files/nodejs/node.exe" --env-file=.env.local "g:/Claude Code working dir/BiteBase/scripts/extract-restaurant.mjs" "$ARGUMENTS"
```

Then read `single_restaurant_output.json`. For each restaurant in the array, display it:
- **שם** (Name)
- **כתובת** (Address, if found)
- **אזור** (Area in Hebrew)
- **סגנון** (Style/cuisine)
- **הערות** (Notes from post, if found)
- **אתר** (Website URL, if found)
- **גוגל מפות** (Maps URL, if found)
- **שעות פתיחה** (Opening hours, if found)
- **טלפון** (Phone, if found)
- **ציון גוגל** (Google score, if found)
- **קישור מקור** (Source URL)

After displaying all restaurants: if more than half are missing an address (`address: null`), tell the user:
> "Instagram מחזיר רק חלק מהכיתוב. כדי לקבל כתובות לכל המסעדות — הדבק את הכיתוב המלא מהפוסט ואחלץ מחדש."
If the user pastes a full caption, re-run with it before asking to save:
```
"/c/Program Files/nodejs/node.exe" --env-file=.env.local "g:/Claude Code working dir/BiteBase/scripts/extract-restaurant.mjs" "$ARGUMENTS" --caption="<pasted text>"
```

Then (whether or not a caption was provided), ask per restaurant: "האם להוסיף את **[name]** ל-restaurants_output.json?"

For each restaurant the user confirms:
- Read `restaurants_output.json` (or start with `[]`)
- Append the restaurant object
- Write back to `restaurants_output.json`
- Confirm: "המסעדה נוספה בהצלחה!"

If there are multiple restaurants, go through them one by one.

## Error handling

- If the classifier fails or returns an unexpected value: default to asking the user "האם זה מתכון או מסעדה?" and proceed accordingly.
- If the extractor returns `{ failed: true }`: tell the user Microlink could not retrieve the content and ask them to paste the details manually.
- If `$ARGUMENTS` is empty or not a URL: ask the user to provide a URL.
