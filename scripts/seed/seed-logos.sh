#!/usr/bin/env bash
# Best-effort logo marks for the globally recognizable providers, via the Google favicon
# service (128px). Uploaded through PUT /api/institution/me as the institution.
# Every logo is ALSO saved locally to certichain-frontend/public/logos/{slug}.png where
# slug is derived from the institution's own name (fetched from /api/institution/me), so
# the frontend's slugify - used in its onError fallback chain (Supabase -> local slug ->
# default seal) - agrees with this file name by construction, not by maintenance.
# Every Myanmar institution and every fictional applicant has no cleanly fetchable logo
# and stays on the default seal / accent_pattern.
#
#   BASE=http://localhost:8081 ./scripts/seed/seed-logos.sh
set -uo pipefail

BASE="${BASE:-http://localhost:8081}"
PW="Certi@2026"
LOCAL_DIR="$(cd "$(dirname "$0")/../.." && pwd)/certichain-frontend/public/logos"
mkdir -p "$LOCAL_DIR"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# email|favicon-domain
ROWS="
credentials@mitpe.example|mit.edu
credentials@scpd.example|stanford.edu
credentials@extension.harvard.example|harvard.edu
credentials@scale.nus.example|nus.edu.sg
credentials@coursera.example|coursera.org
credentials@edx.example|edx.org
credentials@udacity.example|udacity.com
credentials@grow.google.example|grow.google
credentials@datacamp.example|datacamp.com
"

slugify() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\+/-/g' | sed 's/^-//;s/-$//'; }

ok=0; fail=0
for pair in $ROWS; do
  email="${pair%%|*}"; domain="${pair##*|}"
  logo="$TMP/logo.png"
  if ! curl -sfL --max-time 15 "https://www.google.com/s2/favicons?domain=${domain}&sz=128" -o "$logo" || [[ ! -s "$logo" ]]; then
    echo "fail  $email (no logo for $domain)"; fail=$((fail+1)); continue
  fi
  curl -s -c "$TMP/j" -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PW\"}" >/dev/null
  name="$(curl -sf -b "$TMP/j" "$BASE/api/institution/me" \
    | grep -o '"name":"[^"]*"' | head -1 | sed 's/"name":"//;s/"$//')"
  if [[ -z "$name" ]]; then
    echo "fail  $email (could not read institution name)"; fail=$((fail+1)); continue
  fi
  slug="$(slugify "$name")"
  # Local copy first - the frontend fallback reads this exact path.
  cp "$logo" "$LOCAL_DIR/$slug.png"
  # ponytail: no ;type= suffix - mingw curl 8.x fails to read the file with it (HTTP 000);
  # curl sniffs image/png from the .png name and the backend validates the extension anyway.
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$TMP/j" \
    -X PUT "$BASE/api/institution/me" -F "profileImage=@${logo}")"
  if [[ "$code" == "200" ]]; then
    echo "ok    $name <- $domain (local: logos/$slug.png)"; ok=$((ok+1))
  else
    echo "fail  $name (upload HTTP $code)"; fail=$((fail+1))
  fi
  sleep 1
done

echo
echo "logos: $ok uploaded, $fail failed (fallback: local slug -> default seal)"
