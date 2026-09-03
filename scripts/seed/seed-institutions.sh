#!/usr/bin/env bash
# Seeds §1 of SEED-DATA.md: 27 institutions via the real API, then drives each to its
# target status as the Accreditation Authority. Idempotent-ish: re-running re-applies
# only if you wipe first (apply rejects duplicate emails).
#
#   BASE=http://localhost:8081 ./scripts/seed/seed-institutions.sh
set -euo pipefail

BASE="${BASE:-http://localhost:8081}"
PW="Certi@2026"
AA_JAR="$(mktemp)"
trap 'rm -f "$AA_JAR"' EXIT

echo "== logging in as AA =="
curl -sf -c "$AA_JAR" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"aa@certichain.local","password":"aa-dev-password"}' >/dev/null

# apply <name> <ministry> <email> <phone> <website>  -> echoes institution id
apply() {
  local name="$1" ministry="$2" email="$3" phone="$4" website="$5"
  curl -sf -X POST "$BASE/api/institution/apply" \
    --form-string "name=$name" \
    --form-string "ministry=$ministry" \
    --form-string "email=$email" \
    --form-string "password=$PW" \
    --form-string "phone=$phone" \
    --form-string "website=$website" \
  | sed -n 's/.*"id":"\([0-9a-f-]*\)".*/\1/p'
}

aa_post() { # aa_post <id> <action> [json-body]
  local id="$1" action="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sf -b "$AA_JAR" -X POST "$BASE/api/aa/institutions/$id/$action" \
      -H 'Content-Type: application/json' -d "$body" >/dev/null
  else
    curl -sf -b "$AA_JAR" -X POST "$BASE/api/aa/institutions/$id/$action" >/dev/null
  fi
}

reason() { printf '{"reason":%s}' "$(json_str "$1")"; }
note()   { printf '{"note":%s}'   "$(json_str "$1")"; }
json_str() { python -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1"; }

# row: <n>|<name>|<ministry>|<email>|<phone>|<website>|<status>|<extra>
# status: APPROVED | SUSPENDED:<reason> | PENDING | PENDING_INFO:<note> | REJECTED:<reason>
ROWS=$(cat <<'EOF'
1|Yangon Technological University|MOE-HE-YGN-0001|registrar@ytu.edu.mm|+95 1 640 032|https://ytu.edu.mm|APPROVED
2|University of Information Technology, Yangon|MOE-HE-YGN-0002|registrar@uit.edu.mm|+95 1 610 077|https://uit.edu.mm|APPROVED
3|University of Yangon|MOE-HE-YGN-0003|registrar@uy.edu.mm|+95 1 534 320|https://uy.edu.mm|APPROVED
4|Mandalay Technological University|MOE-HE-MDY-0004|registrar@mtu.edu.mm|+95 2 402 810|https://mtu.edu.mm|APPROVED
5|Yangon University of Economics|MOE-HE-YGN-0005|registrar@yueco.edu.mm|+95 1 512 321|https://yueco.edu.mm|APPROVED
6|University of Medicine 1, Yangon|MOH-HE-YGN-0006|registrar@um1.edu.mm|+95 1 385 456|https://um1.edu.mm|APPROVED
7|Myanmar Institute of Information Technology (MIIT), Mandalay|MOE-HE-MDY-0007|registrar@miit.edu.mm|+95 2 409 200|https://miit.edu.mm|SUSPENDED:Pending re-submission of updated accreditation documents (2026 review cycle).
8|Co-operative University, Thanlyin|MOC-HE-YGN-0008|registrar@cutl.edu.mm|+95 56 21 400|https://cutl.edu.mm|PENDING_INFO:Please attach the Ministry of Co-operatives endorsement letter.
9|Yangon Global Business Academy|REF-PENDING-0009|admin@ygba.example|+95 9 555 0100|https://ygba.example|REJECTED:Applicant is not on any recognised Myanmar higher-education register; documents could not be verified.
10|KMD College (KMD Education Services)|PVT-ACC-YGN-0010|registrar@kmd.edu.mm|+95 1 652 493|https://kmd.edu.mm|APPROVED
11|MCC.i (Myanmar Computer Company Institute)|PVT-ACC-YGN-0011|registrar@mcc.com.mm|+95 1 375 730|https://mcc.com.mm|APPROVED
12|Strategy First International College|PVT-ACC-YGN-0012|registrar@strategyfirst.edu.mm|+95 1 230 5691|https://strategyfirst.edu.mm|APPROVED
13|Info Myanmar University|PVT-ACC-YGN-0013|registrar@imu.edu.mm|+95 1 705 481|https://imu.edu.mm|APPROVED
14|Victoria University College|PVT-ACC-YGN-0014|registrar@vuc.edu.mm|+95 1 851 0648|https://vuc.edu.mm|APPROVED
15|Auston College Myanmar|PVT-ACC-YGN-0015|registrar@auston.edu.mm|+95 1 230 8080|https://auston.edu.mm|SUSPENDED:Awarding-body partnership under review; hold new issuance pending confirmation from the UK partner.
16|GUSTO College|PVT-ACC-YGN-0016|registrar@gusto.edu.mm|+95 1 549 293|https://gusto.edu.mm|APPROVED
17|SkillBridge Yangon Bootcamp|REF-PENDING-0017|admin@skillbridge.example|+95 9 777 0200|https://skillbridge.example|PENDING_INFO:Provide evidence of registration as a private training provider and sample syllabi.
18|Massachusetts Institute of Technology - Professional Education|INTL-ACC-US-0018|credentials@mitpe.example|+1 617 253 1000|https://professional.mit.edu|APPROVED
19|Stanford Center for Professional Development|INTL-ACC-US-0019|credentials@scpd.example|+1 650 723 2300|https://scpd.stanford.edu|APPROVED
20|Harvard Extension School|INTL-ACC-US-0020|credentials@extension.harvard.example|+1 617 495 4024|https://extension.harvard.edu|APPROVED
21|National University of Singapore - School of Continuing and Lifelong Education|INTL-ACC-SG-0021|credentials@scale.nus.example|+65 6516 6666|https://scale.nus.edu.sg|APPROVED
22|Coursera|MOOC-ACC-US-0022|credentials@coursera.example|+1 650 963 9884|https://www.coursera.org|APPROVED
23|edX (2U/edX)|MOOC-ACC-US-0023|credentials@edx.example|+1 617 397 1330|https://www.edx.org|APPROVED
24|Udacity|MOOC-ACC-US-0024|credentials@udacity.example|+1 650 396 4300|https://www.udacity.com|APPROVED
25|DataCamp|MOOC-ACC-EU-0025|credentials@datacamp.example|+32 2 588 06 26|https://www.datacamp.com|APPROVED
26|Google Career Certificates (via Grow with Google)|MOOC-ACC-US-0026|credentials@grow.google.example|+1 650 253 0000|https://grow.google/certificates|APPROVED
27|CertHub Online|REF-PENDING-0027|admin@certhub.example|+95 9 000 0000|https://certhub.example|REJECTED:Operates as a pay-for-certificate service with no assessed learning; not a recognised education provider.
EOF
)

OUT="scripts/seed/institution-ids.tsv"
: > "$OUT"

while IFS='|' read -r n name ministry email phone website status; do
  [[ -z "$n" ]] && continue
  action="${status%%:*}"
  detail="${status#*:}"
  [[ "$detail" == "$status" ]] && detail=""

  echo "-- [$n] $name ($action)"
  id="$(apply "$name" "$ministry" "$email" "$phone" "$website")"
  if [[ -z "$id" ]]; then echo "   !! apply failed"; exit 1; fi

  case "$action" in
    APPROVED)     aa_post "$id" approve ;;
    SUSPENDED)    aa_post "$id" approve; aa_post "$id" suspend "$(reason "$detail")" ;;
    PENDING)      : ;;
    PENDING_INFO) aa_post "$id" request-info "$(note "$detail")" ;;
    REJECTED)     aa_post "$id" reject "$(reason "$detail")" ;;
    *) echo "   !! unknown status $action"; exit 1 ;;
  esac

  printf '%s\t%s\t%s\t%s\n' "$n" "$id" "$email" "$action" >> "$OUT"
done <<< "$ROWS"

echo
echo "== done. ids written to $OUT =="
cat "$OUT"
