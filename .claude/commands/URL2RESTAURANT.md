---
description: Extracts structured restaurant info from an Instagram or Facebook URL via Microlink + Claude Vision and appends it to restaurants_output.json. Use when the user provides a social media URL and asks to extract or save a restaurant.
allowed-tools: Bash(node:*)
---

Extract restaurant info from the following URL: $ARGUMENTS

## Steps

1. Run the extraction via Node.js (Microlink + Claude Vision — no browser or cookies needed):

```
"/c/Program Files/nodejs/node.exe" --env-file=.env.local "g:/Claude Code working dir/BiteBase/scripts/extract-restaurant.mjs" "$ARGUMENTS"
```

2. Read `single_restaurant_output.json`. For each restaurant in the array, display it in a clean, readable format:
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

3. For each restaurant the user confirms:
   - Read the existing `restaurants_output.json` (if it exists, otherwise start with `[]`)
   - Append the restaurant object
   - Write back to `restaurants_output.json`
   - Confirm: "המסעדה נוספה בהצלחה!"

   If there are multiple restaurants, go through them one by one.

## Error handling

- If the script returns `{ failed: true }`: tell the user that Microlink could not retrieve the post content, and ask them to paste the caption or details manually.
- If `$ARGUMENTS` is empty or not a URL: ask the user to provide an Instagram or Facebook URL.
