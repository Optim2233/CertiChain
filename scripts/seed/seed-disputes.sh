#!/usr/bin/env bash
# Seeds §5 of SEED-DATA.md: dispute flags so the translated REASON column has demo
# data. Files exactly 3 flags on UIT credentials held by sunandmoon8484984@gmail.com
# (row 51, the extra graduate) - one per canonical category the frontend translates
# ("Incorrect details" | "Not my credential" | "Other"), including one ": detail"
# suffix variant to exercise the explanation branch.
#
# Idempotent: credentials that already carry an OPEN flag are skipped.
#
#   BASE=http://localhost:8081 ./scripts/seed/seed-disputes.sh
set -uo pipefail

BASE="${BASE:-http://localhost:8081}"
PW="Certi@2026"
EMAIL="sunandmoon8484984@gmail.com"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PY=python
command -v python >/dev/null || PY=python3

JAR="$WORK/grad.jar"
echo "== logging in as $EMAIL =="
curl -sf -c "$JAR" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' -H 'X-Forwarded-For: 10.51.9.9' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" >/dev/null \
  || { echo "!! login failed"; exit 1; }

echo "== fetching timeline =="
curl -sf -b "$JAR" "$BASE/api/graduate/timeline" -o "$WORK/timeline.json" \
  || { echo "!! timeline failed"; exit 1; }

# pick the first 3 UIT credentials (by issued order) without an OPEN flag
 pick() { $PY - "$WORK/timeline.json" <<'PYEOF'
import json, sys
items = json.load(open(sys.argv[1]))
uit = [c for c in items if 'Information Technology' in (c.get('institutionName') or '')]
print(' '.join(c['id'] for c in uit[:3]))
PYEOF
}

IDS=$(pick)
[[ -z "$IDS" ]] && { echo "!! no UIT credentials for $EMAIL - run seed-credentials.sh / seed-extra-graduate.sh first"; exit 1; }

REASONS=(
  "Incorrect details: wrong date of issuance"
  "Not my credential"
  "Other: name spelling does not match NRC"
)

i=0; ok=0; skip=0; fail=0
for id in $IDS; do
  reason="${REASONS[$i]}"; i=$((i + 1))
  [[ -z "$reason" ]] && break
  flags="$(curl -sf -b "$JAR" "$BASE/api/graduate/credentials/$id/flags")"
  has_open="$(echo "$flags" | $PY -c 'import json,sys; print(any(f.get("status")=="OPEN" for f in json.load(sys.stdin)))')"
  if [[ "$has_open" == "True" ]]; then
    echo "skip  $id (already has OPEN flag)"; skip=$((skip + 1)); continue
  fi
  body="$($PY -c 'import json,sys; print(json.dumps({"reason": sys.argv[1]}))' "$reason")"
  code="$(curl -s -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/api/graduate/credentials/$id/flag" \
    -H 'Content-Type: application/json' -d "$body")"
  if [[ "$code" == "200" ]]; then
    echo "ok    $id <- $reason"; ok=$((ok + 1))
  else
    echo "fail  $id (HTTP $code) <- $reason"; fail=$((fail + 1))
  fi
  sleep 1
done

echo
echo "disputes: $ok filed, $skip skipped (already open), $fail failed"
