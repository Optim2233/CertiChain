#!/usr/bin/env bash
# Signs up the extra graduate (sunandmoon8484984@gmail.com, row 51 of graduates.tsv)
# and issues their credentials from credential-assignments.tsv.
#
# Run gen-extra-graduate.py first (appends the 12 assignment rows). This script then
# reuses the same _build-batch-csv.py path as seed-credentials.sh, filtered to this
# graduate's institution rows (2 = UIT, 22-26 = MOOC platforms).
#
# Re-runnable: signup "already registered" and the batch dedup 400 are both treated
# as OK. seed-credentials.sh would also pick these rows up on a full re-run.
#
#   BASE=http://localhost:8081 ./scripts/seed/seed-extra-graduate.sh
set -uo pipefail

BASE="${BASE:-http://localhost:8081}"
PW="Certi@2026"
EMAIL="sunandmoon8484984@gmail.com"
HERE="$(dirname "$0")"
INST_TSV="$HERE/institution-ids.tsv"
ASSIGN_TSV="$HERE/credential-assignments.tsv"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PY=python
command -v python >/dev/null || PY=python3

# --- institution lookup ---
declare -A INST_UUID INST_EMAIL
while IFS=$'\t' read -r row uuid iemail status; do
  [[ -z "$row" ]] && continue
  INST_UUID[$row]="$uuid"; INST_EMAIL[$row]="$iemail"
done < "$INST_TSV"

# --- 1. sign up the graduate ---
echo "== signing up $EMAIL =="
body="$($PY -c 'import json,sys; print(json.dumps({"email":sys.argv[1],"password":sys.argv[2],"firstName":"Sun","lastName":"Moon","phone":"+95 9 250 111 051"}))' "$EMAIL" "$PW")"
resp="$(curl -s -w $'\n%{http_code}' -X POST "$BASE/api/graduate/signup" \
  -H 'Content-Type: application/json' -d "$body")"
code="${resp##*$'\n'}"; msg="${resp%$'\n'*}"
if [[ "$code" == "200" || "$code" == "201" ]]; then
  echo "  ok - registered"
elif [[ "$msg" == *"already registered"* ]]; then
  echo "  ok - already registered"
else
  echo "  !! signup failed (HTTP $code): $msg"; exit 1
fi

# --- 2. issue this graduate's credentials, per institution row ---
ROWS=$(tr -d '\r' < "$ASSIGN_TSV" | awk -F'\t' -v e="$EMAIL" 'NR>1 && $1==e {print $2}' | sort -n -u)
[[ -z "$ROWS" ]] && { echo "!! no assignments for $EMAIL - run gen-extra-graduate.py first"; exit 1; }

# one-graduate assignments file so _build-batch-csv.py only emits this grad's rows
GRAD_TSV="$WORK/assign.tsv"
head -1 "$ASSIGN_TSV" > "$GRAD_TSV"
tr -d '\r' < "$ASSIGN_TSV" | awk -F'\t' -v e="$EMAIL" 'NR>1 && $1==e' >> "$GRAD_TSV"

total_ok=0; total_err=0
for row in $ROWS; do
  iemail="${INST_EMAIL[$row]}"; uuid="${INST_UUID[$row]}"
  [[ -z "$iemail" ]] && { echo "!! no institution for row $row"; continue; }

  jar="$WORK/inst-$row.jar"
  if ! curl -sf -c "$jar" -X POST "$BASE/api/auth/login" \
        -H 'Content-Type: application/json' -H "X-Forwarded-For: 10.51.$row.1" \
        -d "{\"email\":\"$iemail\",\"password\":\"$PW\"}" >/dev/null; then
    echo "!! login failed for $iemail (row $row)"; continue
  fi

  bdir="$WORK/batch-$row"
  $PY "$HERE/_build-batch-csv.py" "$GRAD_TSV" "$row" "$bdir"
  for csvf in "$bdir"/batch-*.csv; do
    [[ -s "$csvf" ]] || continue
    resp=""
    for attempt in 1 2 3; do
      resp="$(curl -s --max-time 600 -b "$jar" \
              -X POST "$BASE/api/institution/credentials/batch" -F "file=@${csvf}")"
      [[ -n "$resp" ]] && break
      echo "    (retry $attempt for $(basename "$csvf"))"; sleep 3
    done
    parsed="$($PY "$HERE/_parse-batch-result.py" "${resp:-[]}" 2>/dev/null | tail -1)"
    ok="${parsed%% *}"; err="${parsed##* }"
    [[ "$ok"  =~ ^[0-9]+$ ]] || ok=0
    [[ "$err" =~ ^[0-9]+$ ]] || err=0
    echo "  row $row ($iemail) $(basename "$csvf"): $ok issued, $err errors"
    total_ok=$((total_ok + ok)); total_err=$((total_err + err))
  done
  sleep 1
done

echo
echo "== $EMAIL: $total_ok issued, $total_err errors =="
