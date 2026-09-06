#!/usr/bin/env bash
# Seeds SEED-DATA.md section 3: issues the credentials in credential-assignments.tsv.
#
# - one login per institution (unique X-Forwarded-For so the 10/min auth limit never bites)
# - method=batch  -> one multipart CSV upload per institution (POST /credentials/batch)
# - method=individual -> one POST /credentials per row
# - MIIT #7 / Auston #15 are SUSPENDED: AA reinstates -> they issue -> AA re-suspends
# - re-runnable: the dedup 400 "identical credential" is treated as already-issued (OK)
#
#   BASE=http://localhost:8081 ./scripts/seed/seed-credentials.sh
set -uo pipefail

BASE="${BASE:-http://localhost:8081}"
PW="Certi@2026"
HERE="$(dirname "$0")"
INST_TSV="$HERE/institution-ids.tsv"
ASSIGN_TSV="$HERE/credential-assignments.tsv"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

PY=python
command -v python >/dev/null || PY=python3

# --- institution lookup: row -> uuid \t email \t status ---
declare -A INST_UUID INST_EMAIL INST_STATUS
while IFS=$'\t' read -r row uuid email status; do
  [[ -z "$row" ]] && continue
  INST_UUID[$row]="$uuid"; INST_EMAIL[$row]="$email"; INST_STATUS[$row]="$status"
done < "$INST_TSV"

MIIT_ID="${INST_UUID[7]}"; AUSTON_ID="${INST_UUID[15]}"
MIIT_REASON="Pending re-submission of updated accreditation documents (2026 review cycle)."
AUSTON_REASON="Awarding-body partnership under review; hold new issuance pending confirmation from the UK partner."

aa_login() {
  curl -sf -c "$WORK/aa.jar" -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' -H 'X-Forwarded-For: 10.42.0.200' \
    -d '{"email":"aa@certichain.local","password":"aa-dev-password"}' >/dev/null
}
aa_action() { # <id> <action> [json]  -> prints "  <action> <id> -> HTTP <code>"
  local id="$1" action="$2" body="${3:-}" code
  if [[ -n "$body" ]]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' -b "$WORK/aa.jar" \
      -X POST "$BASE/api/aa/institutions/$id/$action" \
      -H 'Content-Type: application/json' -d "$body")"
  else
    code="$(curl -s -o /dev/null -w '%{http_code}' -b "$WORK/aa.jar" \
      -X POST "$BASE/api/aa/institutions/$id/$action")"
  fi
  echo "  $action $id -> HTTP $code"
}
json_reason() { $PY -c 'import json,sys; print(json.dumps({"reason": sys.argv[1]}))' "$1"; }

echo "== reinstating MIIT #7 + Auston #15 for issuance =="
aa_login || { echo "!! AA login failed"; exit 1; }
aa_action "$MIIT_ID" reinstate
aa_action "$AUSTON_ID" reinstate

# --- distinct institution rows that have assignments, in numeric order ---
ROWS=$(tail -n +2 "$ASSIGN_TSV" | cut -f2 | sort -n -u)

total_ok=0; total_err=0
for row in $ROWS; do
  email="${INST_EMAIL[$row]}"; uuid="${INST_UUID[$row]}"
  [[ -z "$email" ]] && { echo "!! no institution for row $row"; continue; }

  jar="$WORK/inst-$row.jar"
  if ! curl -sf -c "$jar" -X POST "$BASE/api/auth/login" \
        -H 'Content-Type: application/json' -H "X-Forwarded-For: 10.42.$row.1" \
        -d "{\"email\":\"$email\",\"password\":\"$PW\"}" >/dev/null; then
    echo "!! login failed for $email (row $row)"; continue
  fi

  # ---------- batch rows for this institution ----------
  # Two CSVs (certs / activities) so blank columns never become empty fields.
  # An empty batch cell still becomes a Field(name,"") server-side, so each CSV only
  # carries the columns its own rows actually use.
  bdir="$WORK/batch-$row"
  $PY "$HERE/_build-batch-csv.py" "$ASSIGN_TSV" "$row" "$bdir"

  for csvf in "$bdir"/batch-*.csv; do
    [[ -s "$csvf" ]] || continue
    # batch signing is ~1s/row over the Neon pooler; give it room and one retry
    resp=""
    for attempt in 1 2 3; do
      resp="$(curl -s --max-time 600 -b "$jar" \
              -X POST "$BASE/api/institution/credentials/batch" \
              -F "file=@${csvf}")"
      [[ -n "$resp" ]] && break
      echo "    (retry $attempt for $(basename "$csvf"))"; sleep 3
    done
    parsed="$($PY "$HERE/_parse-batch-result.py" "${resp:-[]}" 2>/dev/null | tail -1)"
    ok="${parsed%% *}"; err="${parsed##* }"
    [[ "$ok"  =~ ^[0-9]+$ ]] || ok=0
    [[ "$err" =~ ^[0-9]+$ ]] || err=0
    echo "  row $row ($email) $(basename "$csvf"): $ok issued, $err errors"
    total_ok=$((total_ok + ok)); total_err=$((total_err + err))
  done

  # ---------- individual rows for this institution ----------
  # $PY writes one JSON file per individual row for this institution into $WORK/ind-$row/
  mkdir -p "$WORK/ind-$row"
  $PY "$HERE/_build-individual.py" "$ASSIGN_TSV" "$row" "$WORK/ind-$row"
  for bf in "$WORK/ind-$row"/*.json; do
    [[ -e "$bf" ]] || continue
    gemail="$(basename "$bf" .json)"
    code="$(curl -s -o "$WORK/r" -w '%{http_code}' -b "$jar" \
          -X POST "$BASE/api/institution/credentials" \
          -H 'Content-Type: application/json' --data-binary "@$bf")"
    if [[ "$code" == "200" ]]; then
      echo "  row $row individual -> $gemail OK"; total_ok=$((total_ok + 1))
    elif grep -q "identical credential" "$WORK/r"; then
      echo "  row $row individual -> $gemail already-issued"; total_ok=$((total_ok + 1))
    else
      echo "  row $row individual -> $gemail FAIL $code $(cat "$WORK/r")"; total_err=$((total_err + 1))
    fi
  done

  sleep 1
done

echo
echo "== re-suspending MIIT #7 + Auston #15 =="
aa_login
aa_action "$MIIT_ID"   suspend "$(json_reason "$MIIT_REASON")"
aa_action "$AUSTON_ID" suspend "$(json_reason "$AUSTON_REASON")"

echo
echo "== credentials: $total_ok issued, $total_err errors =="
