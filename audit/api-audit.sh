#!/usr/bin/env bash
# Live API-level audit of CertiChain user journeys.
# Read-only unless RUN_WRITES=1. Every check prints PASS/FAIL + evidence.
BASE=${BASE:-http://localhost:8081}
S=${SCRATCH:-/tmp}
pass=0; fail=0
declare -a FAILURES

chk() { # chk <name> <expected-code> <actual-code> [evidence]
  if [ "$2" = "$3" ]; then printf 'PASS  %-58s %s\n' "$1" "$3"; pass=$((pass+1));
  else printf 'FAIL  %-58s got %s want %s  %s\n' "$1" "$3" "$2" "$4"; fail=$((fail+1)); FAILURES+=("$1: got $3 want $2 $4"); fi
}
code() { curl -s -m 20 -o "$S/body" -w '%{http_code}' "$@"; }

echo "===== A. VERIFIER (public) ====="
chk "GET /api/verify/stats"                200 "$(code $BASE/api/verify/stats)"
chk "GET /api/verify/institutions"         200 "$(code $BASE/api/verify/institutions)"
chk "GET verify/certificate ISSUED"        200 "$(code $BASE/api/verify/certificate/$CRED_OK)"
chk "GET verify/certificate REVOKED"       200 "$(code $BASE/api/verify/certificate/$CRED_REVOKED)"
chk "GET verify/certificate bogus-uuid"    404 "$(code $BASE/api/verify/certificate/00000000-0000-0000-0000-000000000000)"
chk "GET verify/certificate malformed id"  400 "$(code $BASE/api/verify/certificate/not-a-uuid)"
chk "GET verify/share bogus token"         404 "$(code $BASE/api/verify/share/00000000-0000-0000-0000-000000000000)"

echo
echo "  -- revoked credential must SAY revoked, not just 200 --"
curl -s -m 20 "$BASE/api/verify/certificate/$CRED_REVOKED" > "$S/rev.json"
if grep -qiE '"(status|verdict)" *: *"?(REVOKED|revoked)' "$S/rev.json"; then echo "PASS  revoked verdict present"; pass=$((pass+1));
else echo "FAIL  revoked verdict missing: $(head -c 200 "$S/rev.json")"; fail=$((fail+1)); FAILURES+=("revoked verdict missing"); fi

echo
echo "===== F. AUTH EDGES ====="
chk "login wrong password"                 401 "$(code -X POST $BASE/api/auth/login -H 'Content-Type: application/json' -H 'X-Forwarded-For: 10.30.0.1' -d '{\"email\":\"aa@certichain.local\",\"password\":\"wrong\"}')"
chk "GET /api/institution/me no cookie"    401 "$(code $BASE/api/institution/me)"
chk "GET /api/aa/institutions no cookie"   401 "$(code $BASE/api/aa/institutions)"
chk "GET /api/graduate/profile no cookie"  401 "$(code $BASE/api/graduate/profile)"
echo "  -- cross-role: institution cookie on AA endpoint --"
chk "institution cookie -> /api/aa/*"      403 "$(code -b $S/uit.jar $BASE/api/aa/institutions)"

echo
echo "===== B. INSTITUTION APPLY: Myanmar validation gate ====="
ap() { # ap <name> <expected> <extra curl args...>
  local n="$1" e="$2"; shift 2
  chk "$n" "$e" "$(code -X POST $BASE/api/institution/apply -F "name=Validation Probe" -F "email=probe-$RANDOM-$$@example.com" -F 'password=Certi@2026' -F 'institutionType=public' -F 'governingMinistry=Ministry of Education' "$@")"
}
ap "reject +95 phone with leading zero"  400 -F 'phone=+9509123456789'
ap "reject +95 phone too short"          400 -F 'phone=+95912'
ap "reject 4-digit postalCode"            400 -F 'postalCode=1118'
ap "reject non-numeric postalCode"        400 -F 'postalCode=abcde'
ap "reject unknown stateRegion"           400 -F 'stateRegion=Yangoon'
ap "reject malformed founder NRC"         400 -F 'foundersJson=[{"fullName":"Aung Ko","nrcOrPassport":"12/MaBaNa(N)12345"}]'
ap "reject NRC region 15 (out of range)"  400 -F 'foundersJson=[{"fullName":"Aung Ko","nrcOrPassport":"15/MaBaNa(N)123456"}]'
ap "reject malformed administrator NRC"   400 -F 'administratorJson={"fullName":"A","nrcOrPassport":"not-an-nrc"}'
# This one CREATES a row, so it is write-gated and uses a realistic name (see run-manifest.md).
if [ "${RUN_WRITES:-0}" = "1" ]; then
  RID=${RUN_ID:-manual}
  EMAIL="registrar.probe-$RID@ttc.edu.mm"
  c=$(code -X POST $BASE/api/institution/apply -F "name=Thanlyin Technological College" -F "email=$EMAIL" -F 'password=Certi@2026'       -F 'institutionType=public' -F 'governingMinistry=Ministry of Science and Technology'       -F 'phone= ' -F 'postalCode=' -F 'stateRegion=   ')
  chk "accept blank optional MM fields (creates row)" 200 "$c" "email=$EMAIL"
  echo "MANIFEST institution email=$EMAIL name='Thanlyin Technological College'"
else
  echo "SKIP  accept blank optional MM fields (needs RUN_WRITES=1)"
fi

echo
echo "==================== SUMMARY ===================="
echo "PASS=$pass FAIL=$fail"
if [ ${#FAILURES[@]} -gt 0 ]; then printf '%s\n' "${FAILURES[@]}"; fi
