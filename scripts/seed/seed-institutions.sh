#!/usr/bin/env bash
# Seeds §1 of SEED-DATA.md: 27 institutions via the real API, then drives each to its
# target status as the Accreditation Authority. Idempotent-ish: re-running re-applies
# only if you wipe first (apply rejects duplicate emails).
#
# Sends the split registration model (V18): public rows carry institutionType=public
# + governingMinistry + establishment columns; private rows carry institutionType=private
# + company/DICA/MyCo/TIN + founders/administrator JSON. The legacy `ministry` column
# keeps carrying the accreditation reference code (brand_color SQL keys on it).
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

# appends --form-string <field>=<value> for non-empty values only
addform() { # addform <array-name> <field> <value>
  local -n arr="$1"; local field="$2" value="${3:-}"
  [[ -n "$value" ]] && arr+=(--form-string "$field=$value")
}

founder_json() { # <fullName> <fullNameMm> <nrc> <phone> <email>
  python -c 'import json,sys; print(json.dumps([{"fullName":sys.argv[1],"fullNameMyanmar":sys.argv[2],"nationality":"Myanmar","race":"Bamar","religion":"Buddhist","nrcOrPassport":sys.argv[3],"phone":sys.argv[4],"email":sys.argv[5]}]))' \
    "$1" "$2" "$3" "$4" "$5"
}

admin_json() { # <fullName> <fullNameMm> <nrc> <phone> <email>
  python -c 'import json,sys; print(json.dumps({"fullName":sys.argv[1],"fullNameMyanmar":sys.argv[2],"nationality":"Myanmar","race":"Bamar","religion":"Buddhist","nrcOrPassport":sys.argv[3],"phone":sys.argv[4],"email":sys.argv[5]}))' \
    "$1" "$2" "$3" "$4" "$5"
}

apply_public() {
  # <name> <nameMm> <category> <email> <phone> <website> <stateRegion> <district>
  # <township> <ward> <street> <postalCode> <govMinistry> <yearEst> <docType>
  # <docTitle> <docRef> <docDate> <ministryRef> -> echoes institution id
  local name="$1" nameMm="$2" category="$3" email="$4" phone="$5" website="$6"
  local stateRegion="$7" district="$8" township="$9" ward="${10}" street="${11}" postalCode="${12}"
  local govMinistry="${13}" yearEst="${14}" docType="${15}" docTitle="${16}" docRef="${17}" docDate="${18}" ministryRef="${19}"
  local args=()
  addform args name "$name"; addform args ministry "$ministryRef"
  addform args email "$email"; addform args password "$PW"
  addform args phone "$phone"; addform args website "$website"
  addform args institutionType "public"; addform args institutionNameMm "$nameMm"
  addform args institutionCategory "$category"
  addform args stateRegion "$stateRegion"; addform args district "$district"
  addform args township "$township"; addform args ward "$ward"
  addform args street "$street"; addform args postalCode "$postalCode"
  addform args governingMinistry "$govMinistry"; addform args yearEstablished "$yearEst"
  addform args establishmentDocType "$docType"; addform args establishmentDocTitle "$docTitle"
  addform args establishmentDocRef "$docRef"; addform args establishmentDocIssueDate "$docDate"
  curl -sf -X POST "$BASE/api/institution/apply" "${args[@]}" \
  | sed -n 's/.*"id":"\([0-9a-f-]*\)".*/\1/p'
}

apply_private() {
  # <name> <nameMm> <category> <email> <phone> <website> <stateRegion> <district>
  # <township> <ward> <street> <postalCode> <company> <dica> <myco> <tin> <incorpDate>
  # <ownership> <investment> <founderName> <founderNameMm> <founderNrc> <founderPhone>
  # <founderEmail> <adminName> <adminNameMm> <adminNrc> <adminPhone> <adminEmail>
  # <ministryRef> -> echoes institution id
  local name="$1" nameMm="$2" category="$3" email="$4" phone="$5" website="$6"
  local stateRegion="$7" district="$8" township="$9" ward="${10}" street="${11}" postalCode="${12}"
  local company="${13}" dica="${14}" myco="${15}" tin="${16}" incorpDate="${17}"
  local ownership="${18}" investment="${19}"
  local founders="$(founder_json "${20}" "${21}" "${22}" "${23}" "${24}")"
  local admin="$(admin_json "${25}" "${26}" "${27}" "${28}" "${29}")"
  local ministryRef="${30}"
  local args=()
  addform args name "$name"; addform args ministry "$ministryRef"
  addform args email "$email"; addform args password "$PW"
  addform args phone "$phone"; addform args website "$website"
  addform args institutionType "private"; addform args institutionNameMm "$nameMm"
  addform args institutionCategory "$category"
  addform args stateRegion "$stateRegion"; addform args district "$district"
  addform args township "$township"; addform args ward "$ward"
  addform args street "$street"; addform args postalCode "$postalCode"
  addform args companyName "$company"; addform args dicaCertificateNumber "$dica"
  addform args mycoRegistrationNumber "$myco"; addform args tinNumber "$tin"
  addform args incorporationDate "$incorpDate"; addform args ownershipStructure "$ownership"
  addform args investmentAmount "$investment"
  addform args foundersJson "$founders"; addform args administratorJson "$admin"
  curl -sf -X POST "$BASE/api/institution/apply" "${args[@]}" \
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

drive_status() { # <n> <name> <id> <status>
  local n="$1" name="$2" id="$3" status="$4"
  local action="${status%%:*}" detail="${status#*:}"
  [[ "$detail" == "$status" ]] && detail=""
  case "$action" in
    APPROVED)     aa_post "$id" approve ;;
    SUSPENDED)    aa_post "$id" approve; aa_post "$id" suspend "$(reason "$detail")" ;;
    PENDING)      : ;;
    PENDING_INFO) aa_post "$id" request-info "$(note "$detail")" ;;
    REJECTED)     aa_post "$id" reject "$(reason "$detail")" ;;
    *) echo "   !! unknown status $action"; exit 1 ;;
  esac
  printf '%s\t%s\t%s\t%s\n' "$n" "$id" "$email_out" "$action" >> "$OUT"
}

OUT="scripts/seed/institution-ids.tsv"
: > "$OUT"

# --- public rows: name|nameMm|category|email|phone|website|stateRegion|district|township|ward|street|postalCode|govMinistry|yearEst|docType|docTitle|docRef|docDate|ministryRef|status ---
PUBLIC_ROWS=$(cat <<'EOF'
1|Yangon Technological University|ရန်ကုန်နည်းပညာတက္ကသိုလ်|university|registrar@ytu.edu.mm|+95 1 640 032|https://ytu.edu.mm|Yangon|Northern Yangon|Insein|Gyogone|BPI Road|11011|Ministry of Education|1924|establishmentLaw|Yangon Technological University Establishment Law|SLORC Law No. 5/93|1993-08-14|MOE-HE-YGN-0001|APPROVED
2|University of Information Technology, Yangon|ရန်ကုန်သတင်းအချက်အလက်နည်းပညာတက္ကသိုလ်|university|registrar@uit.edu.mm|+95 1 610 077|https://uit.edu.mm|Yangon|Northern Yangon|Hlaing|Parami|Parami Road|11051|Ministry of Education|1971|establishmentLaw|University of Computer Studies Establishment Law|SLORC Law No. 8/93|1993-09-02|MOE-HE-YGN-0002|APPROVED
3|University of Yangon|ရန်ကုန်တက္ကသိုလ်|university|registrar@uy.edu.mm|+95 1 534 320|https://uy.edu.mm|Yangon|Western Yangon|Kamayut|University Avenue|University Avenue Road|11041|Ministry of Education|1920|establishmentLaw|University of Yangon Establishment Law|Pyithu Hluttaw Law No. 12/91|1991-06-29|MOE-HE-YGN-0003|APPROVED
4|Mandalay Technological University|မန္တလေးနည်းပညာတက္ကသိုလ်|university|registrar@mtu.edu.mm|+95 2 402 810|https://mtu.edu.mm|Mandalay|Eastern Mandalay|Patheingyi|Ngwe Nyaung|MDY-Patheingyi Road|05041|Ministry of Education|1991|establishmentLaw|Mandalay Technological University Establishment Law|SLORC Law No. 11/93|1993-11-20|MOE-HE-MDY-0004|APPROVED
5|Yangon University of Economics|ရန်ကုန်စီးပွားရေးတက္ကသိုလ်|university|registrar@yueco.edu.mm|+95 1 512 321|https://yueco.edu.mm|Yangon|Western Yangon|Kamaryut|Pyay Road|Pyay Road|11041|Ministry of Education|1964|governmentOrder|Institute of Economics Establishment Order|Order No. 42/64|1964-07-01|MOE-HE-YGN-0005|APPROVED
6|University of Medicine 1, Yangon|ဆေးတက္ကသိုလ်(၁)ရန်ကုန်|institute|registrar@um1.edu.mm|+95 1 385 456|https://um1.edu.mm|Yangon|Western Yangon|Lanmadaw|Bogyoke Aung San Road|Bogyoke Aung San Road|11131|Ministry of Health|1927|establishmentAct|University of Medicine 1 Establishment Act|Pyithu Hluttaw Law No. 3/92|1992-02-15|MOH-HE-YGN-0006|APPROVED
7|Myanmar Institute of Information Technology (MIIT), Mandalay|မြန်မာသတင်းအချက်အလက်နည်းပညာတက္ကသိုလ်(မန္တလေး)|institute|registrar@miit.edu.mm|+95 2 409 200|https://miit.edu.mm|Mandalay|Central Mandalay|Chanmyathazi|73rd Street|73rd Street|05011|Ministry of Education|2015|governmentOrder|MIIT Establishment Order|Order No. 18/15|2015-04-10|MOE-HE-MDY-0007|SUSPENDED:Pending re-submission of updated accreditation documents (2026 review cycle).
8|Co-operative University, Thanlyin|သမဝါယမတက္ကသိုလ်(သန်လျင်)|college|registrar@cutl.edu.mm|+95 56 21 400|https://cutl.edu.mm|Yangon|Southern Yangon|Thanlyin|Bogyoke Road|Kyauktan Road|11291|Ministry of Education|2014|governmentOrder|Co-operative University Establishment Order|Order No. 55/14|2014-09-01|MOC-HE-YGN-0008|PENDING_INFO:Please attach the Ministry of Co-operatives endorsement letter.
EOF
)

# --- private rows: name|nameMm|category|email|phone|website|stateRegion|district|township|ward|street|postalCode|company|dica|myco|tin|incorpDate|ownership|investment|founderName|founderNameMm|founderNrc|founderPhone|founderEmail|adminName|adminNameMm|adminNrc|adminPhone|adminEmail|ministryRef|status ---
PRIVATE_ROWS=$(cat <<'EOF'
10|KMD College (KMD Education Services)|KMDကွန်ပျူတာကောလိပ်|college|registrar@kmd.edu.mm|+95 1 652 493|https://kmd.edu.mm|Yangon|Central Yangon|Pabedan|Merchant Road|Merchant Road|11141|KMD Education Services Co., Ltd.|DICA-2011-08412|MYCO-2011-33410|TIN-100482913|2011-05-20|Private Limited Company|800000000|U Thein Tun|ဦးသိန်းထွန်း|12/PABEDAN(N)041177|+95 9 512 3344|thein.tun@kmd.edu.mm|Daw Khin Mar Oo|ဒေါ်ခင်မာဦး|12/PABEDAN(N)102938|+95 9 798 1122|khinmaroo@kmd.edu.mm|PVT-ACC-YGN-0010|APPROVED
11|MCC.i (Myanmar Computer Company Institute)|အမ်စီစီသတင်းအချက်အလက်နည်းပညာတက္ကသိုလ်|institute|registrar@mcc.com.mm|+95 1 375 730|https://mcc.com.mm|Yangon|Northern Yangon|Hlaing|MICT Park|MICT Park Road|11051|Myanmar Computer Company Ltd.|DICA-1998-00271|MYCO-1998-01120|TIN-100011245|1998-03-12|Private Limited Company|2500000000|U Aung Khant|ဦးအောင်ခန့်|12/HLAING(N)077123|+95 9 430 7788|aungkhant@mcc.com.mm|Daw Su Su Hlaing|ဒေါ်စုစုလှိုင်|12/HLAING(N)088234|+95 9 511 9900|susuhlaing@mcc.com.mm|PVT-ACC-YGN-0011|APPROVED
12|Strategy First International College|Strategy First နိုင်ငံတကာကောလိပ်|college|registrar@strategyfirst.edu.mm|+95 1 230 5691|https://strategyfirst.edu.mm|Yangon|Western Yangon|Sanchaung|Pyay Road|Pyay Road|11111|Strategy First Education Co., Ltd.|DICA-2010-05233|MYCO-2010-22014|TIN-100733120|2010-08-02|Private Limited Company|1200000000|U Min Thu|ဦးမင်းသူ|12/SANCHAUNG(N)065432|+95 9 732 4455|minthu@strategyfirst.edu.mm|Daw Ei Ei Phyo|ဒေါ်အိအိဖြိုး|12/SANCHAUNG(N)071298|+95 9 450 6677|eieiphyo@strategyfirst.edu.mm|PVT-ACC-YGN-0012|APPROVED
13|Info Myanmar University|အင်ဖိုမြန်မာတက္ကသိုလ်|university|registrar@imu.edu.mm|+95 1 705 481|https://imu.edu.mm|Yangon|Eastern Yangon|Tamwe|Shwegondaing|Shwegondaing Road|11221|Info Myanmar University Co., Ltd.|DICA-2008-03110|MYCO-2008-14902|TIN-100655431|2008-11-25|Private Limited Company|3000000000|U Kyaw Swar|ဦးကျော်စွာ|12/TAMWE(N)033871|+95 9 204 5566|kyawswar@imu.edu.mm|Daw Nilar Win|ဒေါ်နီလာဝင်း|12/TAMWE(N)044512|+95 9 861 3344|nilarwin@imu.edu.mm|PVT-ACC-YGN-0013|APPROVED
14|Victoria University College|ဝိတိုရိယတက္ကသိုလ်ကောလိပ်|college|registrar@vuc.edu.mm|+95 1 851 0648|https://vuc.edu.mm|Yangon|Northern Yangon|Yankin|Saya San Road|Saya San Road|11081|Victoria Education Services Co., Ltd.|DICA-2012-06781|MYCO-2012-28711|TIN-100901772|2012-02-14|Private Limited Company|950000000|U Htet Aung|ဦးထက်အောင်|12/YANKIN(N)019283|+95 9 616 7788|htetaung@vuc.edu.mm|Daw May Thazin|ဒေါ်မေသဇင်|12/YANKIN(N)027364|+95 9 254 8899|maythazin@vuc.edu.mm|PVT-ACC-YGN-0014|APPROVED
15|Auston College Myanmar|အော်စတန်ကောလိပ်(မြန်မာ)|college|registrar@auston.edu.mm|+95 1 230 8080|https://auston.edu.mm|Yangon|Eastern Yangon|Tamwe|Dhamazedi Road|Dhamazedi Road|11221|Auston College Myanmar Co., Ltd.|DICA-2016-09120|MYCO-2016-40233|TIN-101102938|2016-06-30|Private Limited Company|1500000000|U Zarni Maung|ဦးဇာနည်မောင်|12/TAMWE(N)051122|+95 9 777 2233|zarni@auston.edu.mm|Daw Wai Wai Khin|ဒေါ်ဝေဝေခင်|12/TAMWE(N)062233|+95 9 443 5566|waiwai@auston.edu.mm|PVT-ACC-YGN-0015|SUSPENDED:Awarding-body partnership under review; hold new issuance pending confirmation from the UK partner.
16|GUSTO College|ဂတ်စ်တိုးကောလိပ်|college|registrar@gusto.edu.mm|+95 1 549 293|https://gusto.edu.mm|Yangon|Western Yangon|Ahlone|Lower Kyimyindaing Road|Lower Kyimyindaing Road|11121|Gusto Education Co., Ltd.|DICA-2013-07412|MYCO-2013-31098|TIN-100977654|2013-09-11|Private Limited Company|700000000|U Pyae Phyo|ဦးပြည့်ဖြိုး|12/AHLONE(N)083412|+95 9 301 7788|pyaephyo@gusto.edu.mm|Daw Thiri Nanda|ဒေါ်သီရိနန္ဒာ|12/AHLONE(N)094523|+95 9 682 9900|thiri@gusto.edu.mm|PVT-ACC-YGN-0016|APPROVED
18|Massachusetts Institute of Technology - Professional Education|Massachusetts Institute of Technology - Professional Education|institute|credentials@mitpe.example|+1 617 253 1000|https://professional.mit.edu|Massachusetts|Middlesex|Cambridge|MIT Campus|77 Massachusetts Ave|02139|Massachusetts Institute of Technology|US-EIN-041402790|MYCO-INTL-0018|TIN-INTL-0018|1861-04-10|Nonprofit Educational Institution|0|Institutional Founder|Institutional Founder|N/A|+1 617 253 1000|credentials@mitpe.example|Professional Education Registrar|Professional Education Registrar|N/A|+1 617 253 1000|credentials@mitpe.example|INTL-ACC-US-0018|APPROVED
19|Stanford Center for Professional Development|Stanford Center for Professional Development|institute|credentials@scpd.example|+1 650 723 2300|https://scpd.stanford.edu|California|Santa Clara|Stanford|Stanford Campus|450 Jane Stanford Way|94305|Stanford University|US-EIN-941156365|MYCO-INTL-0019|TIN-INTL-0019|1885-11-11|Nonprofit Educational Institution|0|Institutional Founder|Institutional Founder|N/A|+1 650 723 2300|credentials@scpd.example|SCPD Registrar|SCPD Registrar|N/A|+1 650 723 2300|credentials@scpd.example|INTL-ACC-US-0019|APPROVED
20|Harvard Extension School|Harvard Extension School|institute|credentials@extension.harvard.example|+1 617 495 4024|https://extension.harvard.edu|Massachusetts|Middlesex|Cambridge|Harvard Square|51 Brattle St|02138|Harvard University|US-EIN-042103580|MYCO-INTL-0020|TIN-INTL-0020|1636-09-08|Nonprofit Educational Institution|0|Institutional Founder|Institutional Founder|N/A|+1 617 495 4024|credentials@extension.harvard.example|Extension Registrar|Extension Registrar|N/A|+1 617 495 4024|credentials@extension.harvard.example|INTL-ACC-US-0020|APPROVED
21|National University of Singapore - School of Continuing and Lifelong Education|National University of Singapore - School of Continuing and Lifelong Education|institute|credentials@scale.nus.example|+65 6516 6666|https://scale.nus.edu.sg|Singapore|Singapore|Queenstown|Kent Ridge|21 Lower Kent Ridge Rd|119077|National University of Singapore|SG-UEN-200604346E|MYCO-INTL-0021|TIN-INTL-0021|1905-07-03|Statutory Board Institution|0|Institutional Founder|Institutional Founder|N/A|+65 6516 6666|credentials@scale.nus.example|SCALE Registrar|SCALE Registrar|N/A|+65 6516 6666|credentials@scale.nus.example|INTL-ACC-SG-0021|APPROVED
22|Coursera|Coursera|center|credentials@coursera.example|+1 650 963 9884|https://www.coursera.org|California|Santa Clara|Mountain View|Downtown|899 W Evelyn Ave|94041|Coursera Inc.|US-EIN-273467361|MYCO-INTL-0022|TIN-INTL-0022|2012-04-16|Public Benefit Corporation|0|Institutional Founder|Institutional Founder|N/A|+1 650 963 9884|credentials@coursera.example|Coursera Registrar|Coursera Registrar|N/A|+1 650 963 9884|credentials@coursera.example|MOOC-ACC-US-0022|APPROVED
23|edX (2U/edX)|edX (2U/edX)|center|credentials@edx.example|+1 617 397 1330|https://www.edx.org|Massachusetts|Suffolk|Boston|Downtown|201 Huntington Ave|02115|2U Inc.|US-EIN-264347705|MYCO-INTL-0023|TIN-INTL-0023|2012-05-02|Public Benefit Corporation|0|Institutional Founder|Institutional Founder|N/A|+1 617 397 1330|credentials@edx.example|edX Registrar|edX Registrar|N/A|+1 617 397 1330|credentials@edx.example|MOOC-ACC-US-0023|APPROVED
24|Udacity|Udacity|center|credentials@udacity.example|+1 650 396 4300|https://www.udacity.com|California|Santa Clara|Mountain View|Downtown|2440 W El Camino Real|94040|Udacity Inc.|US-EIN-452639053|MYCO-INTL-0024|TIN-INTL-0024|2011-06-01|Private Corporation|0|Institutional Founder|Institutional Founder|N/A|+1 650 396 4300|credentials@udacity.example|Udacity Registrar|Udacity Registrar|N/A|+1 650 396 4300|credentials@udacity.example|MOOC-ACC-US-0024|APPROVED
25|DataCamp|DataCamp|center|credentials@datacamp.example|+32 2 588 06 26|https://www.datacamp.com|Flemish Brabant|Leuven|Leuven|City Center|Mechelsesteenweg 50|3000|DataCamp BV|BE-VAT-0563847452|MYCO-INTL-0025|TIN-INTL-0025|2013-10-01|Private Corporation|0|Institutional Founder|Institutional Founder|N/A|+32 2 588 06 26|credentials@datacamp.example|DataCamp Registrar|DataCamp Registrar|N/A|+32 2 588 06 26|credentials@datacamp.example|MOOC-ACC-EU-0025|APPROVED
26|Google Career Certificates (via Grow with Google)|Google Career Certificates (via Grow with Google)|center|credentials@grow.google.example|+1 650 253 0000|https://grow.google/certificates|California|Santa Clara|Mountain View|Googleplex|1600 Amphitheatre Pkwy|94043|Google LLC|US-EIN-770493581|MYCO-INTL-0026|TIN-INTL-0026|1998-09-04|Private Corporation|0|Institutional Founder|Institutional Founder|N/A|+1 650 253 0000|credentials@grow.google.example|Grow with Google Registrar|Grow with Google Registrar|N/A|+1 650 253 0000|credentials@grow.google.example|MOOC-ACC-US-0026|APPROVED
EOF
)

# --- minimal rows (rejected/pending applicants + bootcamp): name|email|phone|website|ministryRef|status ---
MINIMAL_ROWS=$(cat <<'EOF'
9|Yangon Global Business Academy|admin@ygba.example|+95 9 555 0100|https://ygba.example|REF-PENDING-0009|REJECTED:Applicant is not on any recognised Myanmar higher-education register; documents could not be verified.
17|SkillBridge Yangon Bootcamp|admin@skillbridge.example|+95 9 777 0200|https://skillbridge.example|REF-PENDING-0017|PENDING_INFO:Provide evidence of registration as a private training provider and sample syllabi.
27|CertHub Online|admin@certhub.example|+95 9 000 0000|https://certhub.example|REF-PENDING-0027|REJECTED:Operates as a pay-for-certificate service with no assessed learning; not a recognised education provider.
EOF
)

while IFS='|' read -r n name nameMm category email phone website stateRegion district township ward street postalCode govMinistry yearEst docType docTitle docRef docDate ministryRef status; do
  [[ -z "$n" ]] && continue
  echo "-- [$n] $name (public)"
  id="$(apply_public "$name" "$nameMm" "$category" "$email" "$phone" "$website" "$stateRegion" "$district" "$township" "$ward" "$street" "$postalCode" "$govMinistry" "$yearEst" "$docType" "$docTitle" "$docRef" "$docDate" "$ministryRef")"
  if [[ -z "$id" ]]; then echo "   !! apply failed"; exit 1; fi
  email_out="$email"
  drive_status "$n" "$name" "$id" "$status"
done <<< "$PUBLIC_ROWS"

while IFS='|' read -r n name nameMm category email phone website stateRegion district township ward street postalCode company dica myco tin incorpDate ownership investment founderName founderNameMm founderNrc founderPhone founderEmail adminName adminNameMm adminNrc adminPhone adminEmail ministryRef status; do
  [[ -z "$n" ]] && continue
  echo "-- [$n] $name (private)"
  id="$(apply_private "$name" "$nameMm" "$category" "$email" "$phone" "$website" "$stateRegion" "$district" "$township" "$ward" "$street" "$postalCode" "$company" "$dica" "$myco" "$tin" "$incorpDate" "$ownership" "$investment" "$founderName" "$founderNameMm" "$founderNrc" "$founderPhone" "$founderEmail" "$adminName" "$adminNameMm" "$adminNrc" "$adminPhone" "$adminEmail" "$ministryRef")"
  if [[ -z "$id" ]]; then echo "   !! apply failed"; exit 1; fi
  email_out="$email"
  drive_status "$n" "$name" "$id" "$status"
done <<< "$PRIVATE_ROWS"

while IFS='|' read -r n name email phone website ministryRef status; do
  [[ -z "$n" ]] && continue
  echo "-- [$n] $name (minimal)"
  id="$(apply_private "$name" "" "" "$email" "$phone" "$website" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "" "$ministryRef")"
  if [[ -z "$id" ]]; then echo "   !! apply failed"; exit 1; fi
  email_out="$email"
  drive_status "$n" "$name" "$id" "$status"
done <<< "$MINIMAL_ROWS"

echo
echo "== done. ids written to $OUT =="
cat "$OUT"
