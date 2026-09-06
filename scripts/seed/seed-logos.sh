#!/usr/bin/env bash
# Best-effort logo marks for the globally recognizable providers, via the Google favicon
# service (128px). Uploaded through PUT /api/institution/me as the institution.
# Every Myanmar institution and every fictional applicant has no cleanly fetchable logo
# and stays on brand_color/accent_pattern (set in DB by the institution seed).
#
#   BASE=http://localhost:8081 ./scripts/seed/seed-logos.sh
set -uo pipefail

BASE="${BASE:-http://localhost:8081}"
PW="Certi@2026"
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
credentials@datacamp.example|datacamp.com
credentials@grow.google.example|grow.google
"

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
  # ponytail: no ;type= suffix - mingw curl 8.x fails to read the file with it (HTTP 000);
  # curl sniffs image/png from the .png name and the backend validates the extension anyway.
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$TMP/j" \
    -X PUT "$BASE/api/institution/me" -F "profileImage=@${logo}")"
  if [[ "$code" == "200" ]]; then
    echo "ok    $email <- $domain"; ok=$((ok+1))
  else
    echo "fail  $email (upload HTTP $code)"; fail=$((fail+1))
  fi
  sleep 1
done

echo
echo "logos: $ok uploaded, $fail failed (fallback: brand_color/accent_pattern)"
