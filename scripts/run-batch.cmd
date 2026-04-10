@echo off
set NODE="C:\Program Files\nodejs\node.exe"
set ENV=--env-file="%~dp0..\.env.local"
set SCRIPTS=%~dp0

echo [1/5] Extracting new URLs from WhatsApp chat...
%NODE% %ENV% "%SCRIPTS%batch-extract-whatsapp.mjs" --limit=50
if errorlevel 1 goto :done

echo.
echo [2/5] Syncing DB (restaurants + recipes upsert)...
%NODE% %ENV% "%SCRIPTS%sync-restaurants.mjs"
%NODE% %ENV% "%SCRIPTS%sync-recipes.mjs"

echo.
echo [3/5] Patching missing images from JSON...
%NODE% %ENV% "%SCRIPTS%patch-images-from-json.mjs"

echo.
echo [4/5] Geocoding new restaurants (missing coordinates)...
%NODE% %ENV% "%SCRIPTS%geocode-restaurants.mjs"

echo.
echo [5/5] Patching missing restaurant images from JSON...
%NODE% %ENV% "%SCRIPTS%patch-restaurant-images-from-json.mjs"

:done
echo.
echo === Daily batch complete ===
