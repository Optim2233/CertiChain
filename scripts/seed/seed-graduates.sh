#!/usr/bin/env bash
# Seeds §2 of SEED-DATA.md: graduates from scripts/seed/graduates.tsv.
# registered=yes  -> POST /api/graduate/signup  (idempotent: "already registered" = ok)
# registered=no   -> skipped here; their credentials sit in PENDING_CLAIM until §3.
#
#   BASE=http://localhost:8081 ./scripts/seed/seed-graduates.sh
set -uo pipefail

BASE="${BASE:-http://localhost:8081}"
PW="Certi@2026"
TSV="$(dirname "$0")/graduates.tsv"

ok=0; skip=0; fail=0
while IFS=$'\t' read -r num fn ln email phone registered institutions; do
  [[ "$num" == \#* || -z "$num" ]] && continue
  if [[ "$registered" != "yes" ]]; then
    echo "skip  $email (unregistered - pending-claim demo)"; skip=$((skip+1)); continue
  fi

  body="$(python -c 'import json,sys; print(json.dumps({"email":sys.argv[1],"password":sys.argv[2],"firstName":sys.argv[3],"lastName":sys.argv[4],"phone":sys.argv[5]}))' \
    "$email" "$PW" "$fn" "$ln" "$phone")"
  resp="$(curl -s -w $'\n%{http_code}' -X POST "$BASE/api/graduate/signup" \
    -H 'Content-Type: application/json' -d "$body")"
  code="${resp##*$'\n'}"
  msg="${resp%$'\n'*}"
  if [[ "$code" == "200" || "$code" == "201" ]]; then
    echo "ok    $email"; ok=$((ok+1))
  elif [[ "$msg" == *"already registered"* ]]; then
    echo "ok    $email (already registered)"; ok=$((ok+1))
  else
    echo "fail  $email (HTTP $code): $msg"; fail=$((fail+1))
  fi
  sleep 0.5
done < "$TSV"

echo
echo "graduates: $ok registered, $skip skipped (unregistered), $fail failed"
