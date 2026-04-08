#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
extract_recipes.py

Parses a WhatsApp chat export, extracts all Instagram/Facebook URLs,
fetches each post's caption via yt-dlp (Firefox session), then uses
Claude to extract structured recipe data and saves it as JSON.

Usage:
    python extract_recipes.py <whatsapp_chat.txt> [output.json]

Requirements:
    - Firefox closed (so yt-dlp can read its cookie database)
    - ANTHROPIC_API_KEY set in .env.local or as an environment variable
    - C:/Users/Roni Gorochovsky/yt-dlp.exe present (already downloaded)
"""

import json
import os
import re
import subprocess
import sys
import urllib.parse

# Force UTF-8 output on Windows so Hebrew prints correctly
if sys.stdout.encoding != "utf-8":
    sys.stdout = open(sys.stdout.fileno(), mode="w", encoding="utf-8", buffering=1)
if sys.stderr.encoding != "utf-8":
    sys.stderr = open(sys.stderr.fileno(), mode="w", encoding="utf-8", buffering=1)

# ---------------------------------------------------------------------------
# Hebrew labels (mirrors src/lib/constants.ts)
# ---------------------------------------------------------------------------

CATEGORY_LABELS_HE = {
    "starters":    "מנות פתיחה",
    "soups":       "מרקים",
    "salads":      "סלטים",
    "beef":        "מנות בשר בקר",
    "chicken":     "מנות עוף",
    "fish":        "דגים",
    "carbs_sides": "פחמימות ותוספות",
    "desserts":    "קינוחים",
    "drinks":      "משקאות",
    "other":       "אחר",
}

SUBCATEGORY_LABELS_HE = {
    "slow_cooking":       "בישול ארוך",
    "stir_fry":           "מוקפצים",
    "oven":               "בתנור",
    "rice_dishes":        "תבשילי אורז",
    "pasta_pizza_dough":  "פסטות, פיצות ובצקים",
    "cooked_vegetables":  "ירקות מבושלים",
    "alcoholic":          "אלכוהוליים",
    "smoothies":          "שייקים",
    "other":              "אחרים",
}

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

YTDLP_PATH = r"C:\Users\Roni Gorochovsky\yt-dlp.exe"
ENV_FILE = os.path.join(os.path.dirname(__file__), ".env.local")
COOKIES_FILE = os.path.join(os.path.dirname(__file__), "instagram_cookies.txt")
CLAUDE_MODEL = "claude-haiku-4-5-20251001"


def load_env(path):
    """Load KEY=VALUE pairs from a .env file into os.environ (if not already set)."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


# ---------------------------------------------------------------------------
# WhatsApp parser  (mirrors src/lib/whatsapp-parser.ts)
# ---------------------------------------------------------------------------

_MESSAGE_RE = re.compile(
    r'^(?:\[([^\]]+)\]|([\d/,.: \u202fAPM]+)) ?[-\u2013] ?([^:]+): (.+)$'
)
_URL_RE = re.compile(
    r'https?://(www\.)?(instagram\.com|facebook\.com|fb\.com|fb\.watch)\S+',
    re.IGNORECASE,
)
_TRAILING_PUNCT_RE = re.compile(r'[.,;!?)]+$')
_TRACKING_PARAMS = {
    "igshid", "igsh", "utm_source", "utm_medium",
    "utm_campaign", "utm_content", "utm_term", "fbclid", "s",
}


def normalize_url(url):
    try:
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)
        filtered = {k: v for k, v in params.items() if k not in _TRACKING_PARAMS}
        new_query = urllib.parse.urlencode(filtered, doseq=True)
        new_parsed = parsed._replace(query=new_query)
        return urllib.parse.urlunparse(new_parsed).rstrip("/")
    except Exception:
        return url


def extract_social_urls(text):
    urls = []
    for m in _URL_RE.finditer(text):
        url = _TRAILING_PUNCT_RE.sub("", m.group(0))
        urls.append(url)
    return urls


def parse_whatsapp_chat(content):
    """Return list of {url, sentBy, sentAt, rawMessage} dicts (deduplicated)."""
    lines = content.split("\n")
    results = []
    seen = set()
    current = None

    def flush():
        if not current:
            return
        for raw_url in extract_social_urls(current["text"]):
            normalized = normalize_url(raw_url)
            if normalized not in seen:
                seen.add(normalized)
                results.append({
                    "url": normalized,
                    "sentBy": current["author"],
                    "sentAt": current["timestamp"],
                    "rawMessage": current["text"],
                })

    for line in lines:
        trimmed = line.strip()
        if not trimmed:
            continue
        m = _MESSAGE_RE.match(trimmed)
        if m:
            flush()
            timestamp = (m.group(1) or m.group(2) or "").strip()
            current = {
                "author": m.group(3).strip(),
                "timestamp": timestamp,
                "text": m.group(4).strip(),
            }
        elif current:
            current["text"] += "\n" + trimmed

    flush()
    return results


# ---------------------------------------------------------------------------
# yt-dlp caption fetcher
# ---------------------------------------------------------------------------

def get_caption(url):
    """Fetch Instagram/Facebook post caption via yt-dlp.
    Uses a cookies.txt file (preferred, works while Firefox is open) or
    falls back to --cookies-from-browser firefox (requires Firefox closed).
    Uses --write-info-json to avoid Windows console stripping non-ASCII (Hebrew) characters.
    """
    import glob, tempfile, os as _os
    tmp = tempfile.mktemp(prefix="ytdlp_info_")

    # Prefer cookies file if exported; otherwise try Chrome then Edge
    if os.path.exists(COOKIES_FILE):
        cookie_args = ["--cookies", COOKIES_FILE]
    else:
        cookie_args = ["--cookies-from-browser", "chrome"]

    try:
        result = subprocess.run(
            [YTDLP_PATH, *cookie_args,
             "--skip-download", "--write-info-json",
             "--no-write-playlist-metafiles", "-o", tmp, url],
            capture_output=True,
            timeout=60,
        )
        files = glob.glob(tmp + "*.info.json")
        if not files:
            stderr_preview = result.stderr[:300] if result.stderr else ""
            print(f"    yt-dlp error (no info file): {stderr_preview.decode('utf-8', errors='replace')}", file=sys.stderr)
            return None
        with open(files[0], encoding="utf-8") as f:
            data = json.load(f)
        _os.remove(files[0])
        caption = (data.get("description") or "").strip()
        return caption if caption else None
    except subprocess.TimeoutExpired:
        print("    yt-dlp timed out", file=sys.stderr)
        return None
    except Exception as e:
        print(f"    yt-dlp exception: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Claude recipe extractor
# ---------------------------------------------------------------------------

def extract_recipe(caption, source_url, api_key):
    """Call Claude Haiku to extract structured recipe data from a caption."""
    import urllib.request

    payload = {
        "model": CLAUDE_MODEL,
        "max_tokens": 2048,
        "messages": [
            {
                "role": "user",
                "content": (
                    "Extract recipe information from the Instagram post caption below.\n\n"
                    f"Caption:\n{caption}\n\n"
                    "STEP 1 — Detect protein. Scan the entire caption (ingredients, title, description) for any of these:\n"
                    "  RED MEAT indicators: beef, veal, lamb, mutton, goat, pork, steak, brisket, ribeye, entrecote, asado,\n"
                    "    mince/ground meat, hamburger, meatball, kebab, shawarma, cholent, osso buco, short ribs,\n"
                    "    בקר, עגל, כבש, טלה, בשר, סטייק, אנטרקוט, אסאדו, בשר טחון, קציצ, המבורגר, קבב, שווארמה, חמין, צלי\n"
                    "  POULTRY indicators: chicken, turkey, duck, goose, hen, poultry, thigh, breast, drumstick, wing,\n"
                    "    schnitzel, chicken fillet, chicken pieces,\n"
                    "    עוף, פרגית, פרגיות, הודו, ברווז, אווז, שניצל, חזה עוף, ירך עוף, כנפיים\n"
                    "  FISH/SEAFOOD indicators: fish, salmon, tuna, sea bass, tilapia, cod, trout, shrimp, prawn,\n"
                    "    calamari, crab, lobster, anchovy, sardine, herring,\n"
                    "    דג, סלמון, טונה, לוקוס, טילפיה, פורל, שרימפס, קלמרי, סרטן, אנשובי, סרדין\n\n"
                    "STEP 2 — Assign category using this strict priority order:\n"
                    '  - Any red meat detected → "beef"\n'
                    '  - Any poultry detected → "chicken"\n'
                    '  - Any fish/seafood detected → "fish"\n'
                    '  - Sweet dish (cake, cookie, ice cream, pudding) → "desserts"\n'
                    '  - Liquid drink (juice, smoothie, cocktail, shake) → "drinks"\n'
                    '  - Soup or broth → "soups"\n'
                    '  - Cold salad served as a side → "salads"\n'
                    '  - Small appetizer or starter → "starters"\n'
                    '  - Meatless carb/side (pasta, rice, pizza, bread, dough, vegetables, eggs, cheese, tofu) → "carbs_sides"\n'
                    '  - Anything else → "other"\n'
                    "  RULE: If a dish contains both meat AND pasta/rice (e.g. chicken with rice, beef noodles),\n"
                    "  ALWAYS classify by the meat type, never as carbs_sides.\n\n"
                    "STEP 3 — Return a single JSON object (no markdown, no extra text) with these fields:\n"
                    '  "name"         : dish name in Hebrew (translate if needed)\n'
                    '  "category"     : the value determined in Step 2\n'
                    '  "subcategory"  : only for beef → (slow_cooking, stir_fry, other)\n'
                    '                              chicken → (stir_fry, oven, other)\n'
                    '                              carbs_sides → (rice_dishes, pasta_pizza_dough, cooked_vegetables, other)\n'
                    '                              drinks → (alcoholic, smoothies, other)\n'
                    '                   null for all other categories\n'
                    '  "ingredients"  : array of ingredient strings in Hebrew (translate if needed)\n'
                    '  "instructions" : array of step-by-step instruction strings in Hebrew (translate if needed)\n\n'
                    "Return ONLY valid JSON. ALL text (name, ingredients, instructions) MUST be in Hebrew regardless of the caption language."
                ),
            }
        ],
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        text = data["content"][0]["text"].strip()
        # Strip accidental markdown code fences
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        parsed = json.loads(text)
        # Claude sometimes returns an array with one object — unwrap it
        if isinstance(parsed, list):
            parsed = parsed[0] if parsed else None
        return parsed
    except Exception as e:
        print(f"    Claude error: {e}", file=sys.stderr)
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    load_env(ENV_FILE)

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python extract_recipes.py <whatsapp_chat.txt> [output.json] [--limit N]")
        print("  python extract_recipes.py --url <instagram_or_facebook_url> [output.json]")
        sys.exit(1)

    # Parse arguments
    single_url = None
    chat_file = None
    output_file = "recipes_output.json"
    limit = None
    offset = 0

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--url" and i + 1 < len(args):
            single_url = args[i + 1]
            i += 2
        elif args[i] == "--limit" and i + 1 < len(args):
            limit = int(args[i + 1])
            i += 2
        elif args[i] == "--offset" and i + 1 < len(args):
            offset = int(args[i + 1])
            i += 2
        elif args[i].startswith("http"):
            single_url = args[i]
            i += 1
        elif not args[i].startswith("--") and chat_file is None and single_url is None:
            chat_file = args[i]
            i += 1
        elif not args[i].startswith("--"):
            output_file = args[i]
            i += 1
        else:
            i += 1

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        print("Error: ANTHROPIC_API_KEY is not set in .env.local or environment.")
        sys.exit(1)

    if not os.path.exists(YTDLP_PATH):
        print(f"Error: yt-dlp not found at {YTDLP_PATH}")
        sys.exit(1)

    # Build the list of items to process
    if single_url:
        parsed = [{"url": normalize_url(single_url), "sentBy": "", "sentAt": "", "rawMessage": single_url}]
        print(f"Processing single URL: {single_url}\n")
    else:
        with open(chat_file, encoding="utf-8", errors="replace") as f:
            content = f.read()
        parsed = parse_whatsapp_chat(content)
        print(f"Found {len(parsed)} unique URL(s) in chat.\n")

    # If resuming with --offset, load existing results to append to
    results = []
    if offset and os.path.exists(output_file):
        with open(output_file, encoding="utf-8") as f:
            results = json.load(f)
        print(f"Resuming: loaded {len(results)} existing result(s) from {output_file}\n")

    if offset:
        parsed = parsed[offset:]
    if limit:
        parsed = parsed[:limit]

    for i, item in enumerate(parsed, 1):
        url = item["url"]
        print(f"[{i}/{len(parsed)}] {url}")

        # 1. Fetch caption
        caption = get_caption(url)
        if not caption:
            print("    Could not fetch caption — skipping.\n")
            results.append({
                "source_url": url,
                "sentBy": item["sentBy"],
                "sentAt": item["sentAt"],
                "error": "Could not fetch caption",
            })
            continue

        # Skip captions that are empty or just punctuation
        if caption.strip("? \t\n") == "":
            print("    Empty caption — skipping.\n")
            results.append({
                "source_url": url,
                "sentBy": item["sentBy"],
                "sentAt": item["sentAt"],
                "error": "Empty caption",
            })
            continue

        print(f"    Caption: {caption[:80].replace(chr(10), ' ')}{'...' if len(caption) > 80 else ''}")

        # 2. Extract recipe via Claude
        recipe = extract_recipe(caption, url, api_key)
        if recipe:
            recipe["source_url"] = url
            recipe["category_he"] = CATEGORY_LABELS_HE.get(recipe.get("category", ""), "")
            sub = recipe.get("subcategory")
            recipe["subcategory_he"] = SUBCATEGORY_LABELS_HE.get(sub, "") if sub else ""
            recipe["sentBy"] = item["sentBy"]
            recipe["sentAt"] = item["sentAt"]
            results.append(recipe)
            print(f"    -> {recipe.get('name', '(no name)')}\n")
        else:
            results.append({
                "source_url": url,
                "sentBy": item["sentBy"],
                "sentAt": item["sentAt"],
                "caption": caption,
                "error": "Claude extraction failed",
            })
            print("    Claude extraction failed.\n")

    # Save
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    ok = sum(1 for r in results if "error" not in r)
    print(f"Done. {ok}/{len(results)} recipes extracted -> {output_file}")


if __name__ == "__main__":
    main()
