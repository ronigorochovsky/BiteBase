"""
Exports Instagram (and Facebook) cookies from Firefox's SQLite database
to a Netscape-format cookies.txt file that yt-dlp can read.
Works even while Firefox is open (copies the DB file first).
"""
import sqlite3
import shutil
import os
import tempfile
import time

PROFILE = r"C:\Users\Roni Gorochovsky\AppData\Roaming\Mozilla\Firefox\Profiles\3pchp1zz.default-release"
DB_PATH = os.path.join(PROFILE, "cookies.sqlite")
OUT_PATH = r"G:\Claude Code working dir\BiteBase\instagram_cookies.txt"

DOMAINS = ("instagram.com", "facebook.com", "fbcdn.net")

def export():
    # Copy the DB to a temp file to bypass Firefox's file lock
    tmp = tempfile.mktemp(suffix=".sqlite")
    shutil.copy2(DB_PATH, tmp)

    try:
        conn = sqlite3.connect(tmp)
        cur = conn.cursor()
        cur.execute("""
            SELECT host, path, isSecure, expiry, name, value
            FROM moz_cookies
            WHERE host LIKE '%instagram.com'
               OR host LIKE '%facebook.com'
               OR host LIKE '%fbcdn.net'
        """)
        rows = cur.fetchall()
        conn.close()
    finally:
        os.remove(tmp)

    if not rows:
        print("No Instagram/Facebook cookies found. Make sure you are logged in to Instagram in Firefox.")
        return

    lines = ["# Netscape HTTP Cookie File"]
    for host, path, secure, expiry, name, value in rows:
        # Ensure host starts with a dot for domain cookies
        if not host.startswith("."):
            host = "." + host
        include_subdomains = "TRUE"
        secure_str = "TRUE" if secure else "FALSE"
        expiry = expiry or int(time.time()) + 60 * 60 * 24 * 365
        lines.append(f"{host}\t{include_subdomains}\t{path}\t{secure_str}\t{expiry}\t{name}\t{value}")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"Exported {len(rows)} cookies to {OUT_PATH}")

export()
