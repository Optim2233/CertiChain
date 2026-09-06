# CertiChain — Seed Data Record

Canonical record of the demo data loaded into the database. Keep this in sync with
whatever loads it (SQL script, API calls, or manual entry). Passwords here are the
**plaintext** dev credentials; the DB stores bcrypt hashes.

**Loaders** (`BASE=http://localhost:8081`, run against a wiped DB — see §Load order):
- `scripts/seed/seed-institutions.sh` — applies all 27 via `POST /api/institution/apply`,
  then drives each to its target status as the AA. Resolved IDs → `scripts/seed/institution-ids.tsv`.
  Sends the split model: public rows `institutionType=public` + `governingMinistry` enum +
  establishment columns; private rows `institutionType=private` + company/DICA/MyCo/TIN +
  `foundersJson`/`administratorJson`. The legacy `ministry` param still carries the
  accreditation reference code below — but note the backend stores `governingMinistry` into
  the `ministry` column for public rows, so the ref code survives only on private rows.
- `brand_color` / `accent_pattern` aren't settable via `apply` — set by a direct SQL `UPDATE`
  keyed on login email (see `scripts/seed` history / the migration companion).
- `scripts/seed/seed-logos.sh` — best-effort logo marks for the 8 global/MOOC providers via
  the Google favicon service (`PUT /api/institution/me`, Supabase upload). Udacity's favicon
  404s; all Myanmar institutions + fictional applicants have no fetchable logo and stay on
  `brand_color`/`accent_pattern`.

- `scripts/seed/seed-graduates.sh` — §2: signs up the 47 registered graduates from
  `scripts/seed/graduates.tsv` (`POST /api/graduate/signup`; idempotent).
- `scripts/seed/gen-credential-assignments.py` — §3 generator. Embeds the program +
  activity catalogs (mirrors §3 tables below), reads `graduates.tsv`, writes
  `scripts/seed/credential-assignments.tsv` (~237 rows, one per credential). Deterministic.
- `scripts/seed/seed-credentials.sh` — §3 loader. One login per institution (unique
  `X-Forwarded-For` so the 10/min auth limit never bites), then one batch-CSV upload per
  distinct field-set (`POST /api/institution/credentials/batch`), plus 3 individual
  `POST /api/institution/credentials` for the pending-claim graduates. Brackets MIIT #7 /
  Auston #15 issuance with AA `reinstate` → issue → `suspend`.
- `scripts/seed/seed-documents.mjs` — inserts sample accreditation PDFs (placeholder
  `institution_license.pdf`) as `institution_document` rows for institutions #1, #3, #6, #8
  so the AA institution-detail PDF preview is demoable. Direct DB insert (register API only
  takes documents at `/apply` time); idempotent. Needs `pg` (`npm i` in `scripts/seed/`).
- `scripts/seed/gen-extra-graduate.py` + `seed-extra-graduate.sh` — one-off for the extra
  graduate `sunandmoon8484984@gmail.com` (row 51, a UIT student). Appends 12 assignment rows
  (UIT Bachelor→Master, 4 UIT activities, 6 MOOC certs — above the usual MOOC count) using
  uniqueIds in the 9xxx range so a full `gen-credential-assignments.py` re-run never
  collides; the runner signs up the grad and issues via the same batch path.

**Status:**
- §1 loaded — 27 institutions (21 APPROVED · 2 PENDING · 2 SUSPENDED · 2 REJECTED),
  8 with real logos in Supabase, the rest on brand colors.
- §2 loaded — 47 registered graduates (of 50; the 3 unregistered wait for §3),
  plus 1 extra graduate `sunandmoon8484984@gmail.com` (row 51, seeded separately).
- §3 loaded — **237 credentials** from the deterministic generator: 106 certificates
  (incl. 3 `PENDING_CLAIM`) + 131 activity records, across all 50 graduates. 10 graduates
  have a Bachelor→Master progression. MIIT #7 + Auston #15 hold issued credentials but are
  back to `SUSPENDED`. **+ 12 more** for the extra graduate (8 certs + 4 activities) via
  `seed-extra-graduate.sh` → **249 total**.
- Sample accreditation PDFs — 5 `institution_document` rows across institutions #1
  (×2), #3, #6, #8 (#8's is unverified), via `seed-documents.mjs`.
- §5 disputes — 3 OPEN flags on UIT credentials of `sunandmoon8484984@gmail.com`, one per
  canonical reason category, via `seed-disputes.sh`.

- **Accreditation Authority** (seeded by `V3__seed_aa_user.sql`): `aa@certichain.local` / `aa-dev-password`
- All institution + graduate passwords below: `Certi@2026` unless noted.
- `ministry` column = the "Ministry Reference Number" from the registration form
  (an accreditation reference string, not a ministry name).
- `status` lifecycle: `PENDING → APPROVED → (SUSPENDED ⇄ APPROVED) → REVOKED`; also `PENDING → REJECTED`.
- `accent_pattern` ∈ `hatch | dots | none`. `brand_color` = hex.

---

## 1. Institutions

Fictionalized accreditation references and contact details; institution **names** are
real so the demo reads plausibly. Mix of statuses to exercise every AA workflow and the
public-directory visibility rules (directory shows `APPROVED` + `SUSPENDED` only).

**27 institutions total** — 8 Myanmar public universities · 8 Myanmar private colleges/training
institutes · 4 global universities · 6 online learning platforms · plus 2 rejected applicants
(one Myanmar, one online).
Status spread: 21 APPROVED · 2 SUSPENDED (MIIT, Auston) · 2 PENDING (Co-operative University,
SkillBridge) · 2 REJECTED (Yangon Global Business Academy, CertHub Online).

### 1a. Myanmar institutions

| # | Name | Login email | Ministry Ref | Status | Brand | Accent | Website | Phone |
|---|------|-------------|--------------|--------|-------|--------|---------|-------|
| 1 | Yangon Technological University | registrar@ytu.edu.mm | MOE-HE-YGN-0001 | APPROVED | `#0B3D91` | hatch | https://ytu.edu.mm | +95 1 640 032 |
| 2 | University of Information Technology, Yangon | registrar@uit.edu.mm | MOE-HE-YGN-0002 | APPROVED | `#00629B` | dots | https://uit.edu.mm | +95 1 610 077 |
| 3 | University of Yangon | registrar@uy.edu.mm | MOE-HE-YGN-0003 | APPROVED | `#7A0019` | none | https://uy.edu.mm | +95 1 534 320 |
| 4 | Mandalay Technological University | registrar@mtu.edu.mm | MOE-HE-MDY-0004 | APPROVED | `#1B5E20` | hatch | https://mtu.edu.mm | +95 2 402 810 |
| 5 | Yangon University of Economics | registrar@yueco.edu.mm | MOE-HE-YGN-0005 | APPROVED | `#4A148C` | dots | https://yueco.edu.mm | +95 1 512 321 |
| 6 | University of Medicine 1, Yangon | registrar@um1.edu.mm | MOH-HE-YGN-0006 | APPROVED | `#B71C1C` | none | https://um1.edu.mm | +95 1 385 456 |
| 7 | Myanmar Institute of Information Technology (MIIT), Mandalay | registrar@miit.edu.mm | MOE-HE-MDY-0007 | SUSPENDED | `#263238` | hatch | https://miit.edu.mm | +95 2 409 200 |
| 8 | Co-operative University, Thanlyin | registrar@cutl.edu.mm | MOC-HE-YGN-0008 | PENDING | `#00695C` | dots | https://cutl.edu.mm | +95 56 21 400 |
| 9 | "Yangon Global Business Academy" (unaccredited applicant) | admin@ygba.example | REF-PENDING-0009 | REJECTED | `#546E7A` | none | https://ygba.example | +95 9 555 0100 |

Status notes:
- **#7 MIIT — SUSPENDED**, reason: `"Pending re-submission of updated accreditation documents (2026 review cycle)."`
  Existing credentials stay valid; can't issue new ones. Still shown in the public directory (dimmed).
- **#8 Co-operative University — PENDING**: fresh application, one AA "Request Info" note on file:
  `"Please attach the Ministry of Co-operatives endorsement letter."`
- **#9 Yangon Global Business Academy — REJECTED**, reason:
  `"Applicant is not on any recognised Myanmar higher-education register; documents could not be verified."`
  Demonstrates the "valid signature ≠ trustworthy issuer" point — hidden from the directory.

### 1b. Myanmar private colleges & training institutes

Private, fee-based providers that issue their own certificates / diplomas (often alongside
a UK awarding-body qualification). These are the "KMD kind" — the everyday certificate
issuers CertiChain is meant to make verifiable.

| # | Name | Login email | Ministry Ref | Status | Brand | Accent | Website | Phone |
|---|------|-------------|--------------|--------|-------|--------|---------|-------|
| 10 | KMD College (KMD Education Services) | registrar@kmd.edu.mm | PVT-ACC-YGN-0010 | APPROVED | `#E4002B` | hatch | https://kmd.edu.mm | +95 1 652 493 |
| 11 | MCC.i (Myanmar Computer Company Institute) | registrar@mcc.com.mm | PVT-ACC-YGN-0011 | APPROVED | `#00539B` | dots | https://mcc.com.mm | +95 1 375 730 |
| 12 | Strategy First International College | registrar@strategyfirst.edu.mm | PVT-ACC-YGN-0012 | APPROVED | `#F26522` | none | https://strategyfirst.edu.mm | +95 1 230 5691 |
| 13 | Info Myanmar University | registrar@imu.edu.mm | PVT-ACC-YGN-0013 | APPROVED | `#2E3192` | hatch | https://imu.edu.mm | +95 1 705 481 |
| 14 | Victoria University College | registrar@vuc.edu.mm | PVT-ACC-YGN-0014 | APPROVED | `#6D2077` | dots | https://vuc.edu.mm | +95 1 851 0648 |
| 15 | Auston College Myanmar | registrar@auston.edu.mm | PVT-ACC-YGN-0015 | SUSPENDED | `#0090DA` | none | https://auston.edu.mm | +95 1 230 8080 |
| 16 | GUSTO College | registrar@gusto.edu.mm | PVT-ACC-YGN-0016 | APPROVED | `#00A651` | hatch | https://gusto.edu.mm | +95 1 549 293 |
| 17 | "SkillBridge Yangon Bootcamp" (unaccredited applicant) | admin@skillbridge.example | REF-PENDING-0017 | PENDING | `#455A64` | none | https://skillbridge.example | +95 9 777 0200 |

Status notes:
- **#15 Auston College — SUSPENDED**, reason:
  `"Awarding-body partnership under review; hold new issuance pending confirmation from the UK partner."`
- **#17 SkillBridge — PENDING** (fictional): a coding bootcamp with a thin application, one AA
  "Request Info" note: `"Provide evidence of registration as a private training provider and sample syllabi."`

### 1c. Global institutions (universities)

| # | Name | Login email | Ministry Ref | Status | Brand | Accent | Website | Phone |
|---|------|-------------|--------------|--------|-------|--------|---------|-------|
| 18 | Massachusetts Institute of Technology — Professional Education | credentials@mitpe.example | INTL-ACC-US-0018 | APPROVED | `#750014` | none | https://professional.mit.edu | +1 617 253 1000 |
| 19 | Stanford Center for Professional Development | credentials@scpd.example | INTL-ACC-US-0019 | APPROVED | `#8C1515` | hatch | https://scpd.stanford.edu | +1 650 723 2300 |
| 20 | Harvard Extension School | credentials@extension.harvard.example | INTL-ACC-US-0020 | APPROVED | `#A51C30` | dots | https://extension.harvard.edu | +1 617 495 4024 |
| 21 | National University of Singapore — School of Continuing and Lifelong Education | credentials@scale.nus.example | INTL-ACC-SG-0021 | APPROVED | `#003D7C` | none | https://scale.nus.edu.sg | +65 6516 6666 |

### 1d. Online learning platforms (MOOC / digital credentialing providers)

These are the **Coursera kind** — "MOOC platforms" (Massive Open Online Courses), also called
online learning platforms or digital credentialing providers. They issue professional
certificates at scale, sometimes on behalf of an industry partner (Google, IBM, Meta).
In CertiChain they register as institutions like any other issuer.

| # | Name | Login email | Ministry Ref | Status | Brand | Accent | Website | Phone |
|---|------|-------------|--------------|--------|-------|--------|---------|-------|
| 22 | Coursera | credentials@coursera.example | MOOC-ACC-US-0022 | APPROVED | `#0056D2` | none | https://www.coursera.org | +1 650 963 9884 |
| 23 | edX (2U/edX) | credentials@edx.example | MOOC-ACC-US-0023 | APPROVED | `#02262B` | hatch | https://www.edx.org | +1 617 397 1330 |
| 24 | Udacity | credentials@udacity.example | MOOC-ACC-US-0024 | APPROVED | `#01B3E3` | dots | https://www.udacity.com | +1 650 396 4300 |
| 25 | DataCamp | credentials@datacamp.example | MOOC-ACC-EU-0025 | APPROVED | `#03EF62` | none | https://www.datacamp.com | +32 2 588 06 26 |
| 26 | Google Career Certificates (via Grow with Google) | credentials@grow.google.example | MOOC-ACC-US-0026 | APPROVED | `#4285F4` | dots | https://grow.google/certificates | +1 650 253 0000 |
| 27 | "CertHub Online" (unverified credential mill) | admin@certhub.example | REF-PENDING-0027 | REJECTED | `#616161` | none | https://certhub.example | — |

Status notes:
- **#27 CertHub Online — REJECTED**, reason:
  `"Operates as a pay-for-certificate service with no assessed learning; not a recognised education provider."`
  A second "trust registry does its job" example, on the online-platform side.

> `ministry` reference prefixes in use: `MOE-HE` / `MOH-HE` / `MOC-HE` (Myanmar public,
> by ministry), `PVT-ACC-<city>` (Myanmar private), `INTL-ACC-<country>` (global universities),
> `MOOC-ACC-<region>` (online platforms), `REF-PENDING-####` (unaccredited applicants).

---

## 2. Graduates

Password for every graduate: **`Certi@2026`**. Emails are all `@demo.mm` throwaways, formatted
like Myanmar student addresses.

**50 graduates** — full roster (name, email, phone, `registered` flag, institution numbers)
lives in **`scripts/seed/graduates.tsv`**, the source of truth. Login list in `SEED-CREDENTIALS.md`.

- **47 registered** (`registered=yes`): signed up via `POST /api/graduate/signup`.
- **3 unregistered** (`#13 Wai Yan Min`, `#14 Thiri Kyaw`, `#15 Ko Ko Naing`): no account yet.
  §3 issues them credentials to the bare email → `PENDING_CLAIM`; signing up with the matching
  email claims them in the same transaction (the claim-on-signup demo).

The `institutions` column in the TSV lists which seeded institutions (§1 numbers) issue that
graduate's credentials in §3 — most have 1, some have 2 (a university + a MOOC platform) to
exercise the multi-issuer timeline.

### Load order for graduates

1. `scripts/seed/seed-graduates.sh` — signs up the 47 (idempotent; skips the 3 unregistered).
2. §3: log in as each institution, issue each linked graduate's credential(s) → `ISSUED`
   immediately for the 47, `PENDING_CLAIM` for the 3.
3. (Optional live demo) sign up #13–#15 to show the pending credential get claimed.

## 3. Credentials — certificate catalog

### How credential fields work

The issue endpoints impose **no required field names** — a credential just needs ≥1 field.
The conventions that matter for the UI (verified against the code):

- A field literally named **`title`** drives the credential card / timeline / verify-page
  heading. The graduate-timeline query joins `credential_field WHERE field_name = 'title'`
  only — `degree` is NOT picked up there. **The seed puts a `title` field on every
  credential**, including activity records (whose `title` = the activity name).
- Activity records also keep an **`activity`** field (the verifier's `title()` fallback is
  `degree` → `activity` → `title`, first match in field order).
- **`Graduation Date`** (certs) / **`date`** (activities) are display-only free text — no
  date parsing. The seed uses human strings (`"June 2022"`, `"Completed March 2025"`).
- Every other field (`Major`, `Classification`, `Awarding Body`, competition
  `Placement`/`Team`/`Event`, …) shows only in the credential-detail key/value list, label
  CSS-`capitalize`d, value verbatim. The seed uses human field names (`"Credit Hours"`, not
  `creditHours`).
- **Uniqueness**: the dedup key is `(institution, exact ordered field set)` — `graduate_email`
  is *not* in it, so two graduates can't get an identical field set from one institution.
  Every certificate carries a unique **`Student ID`**, every activity a unique **`Record ID`**.
- **`issuedAt` is always "now"** — the API can't backdate. The timeline sorts by `issuedAt`,
  so degree progression is ordered by *issue sequence* (Bachelor row before Master row in the
  batch CSV); the real years live in the `Graduation Date` field.
- **MOOC / online-platform / global-professional certs (#18–26)** are standalone completion
  certs — any plausible date, no prerequisites, no timeline ordering.

The catalog below is the human-readable copy of what `gen-credential-assignments.py` embeds.

Common extra fields, by credential kind:

| Field name | Applies to | Example values |
|---|---|---|
| `studentId` | all | `YTU-2022-CE-0417`, `KMD-NCC-2023-118` |
| `grade` / `classification` | degrees, diplomas | `First Class`, `Second Class (Upper)`, `Distinction`, `Merit`, `Pass`, `CGPA 3.82/4.00` |
| `major` / `specialization` | degrees | `Software Engineering`, `Structural Engineering`, `Data Science` |
| `awardingBody` | private colleges | `NCC Education (UK)`, `Pearson BTEC`, `University of Wolverhampton`, `Edinburgh Napier University` |
| `credentialLevel` | diplomas / HNDs | `RQF Level 4`, `RQF Level 5`, `HND`, `Postgraduate` |
| `modeOfStudy` | all | `Full-time`, `Part-time`, `Blended` |
| `durationMonths` | courses / bootcamps | `12`, `9`, `6` |
| `creditHours` | university courses | `128`, `36` |
| `honors` | degrees | `Cum Laude`, `Dean's List 2023`, `Gold Medal` |
| `thesisTitle` | research degrees | free text |
| `verificationContact` | all | `registrar@<institution>` |
| `issuedLocation` | all | `Yangon, Myanmar`, `Cambridge, MA, USA` |

---

### 3a. Myanmar public universities

**#1 Yangon Technological University** — `#0B3D91`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Bachelor of Engineering in Civil Engineering | CERTIFICATE | major=`Structural Engineering`, classification=`Second Class (Upper)`, creditHours=`172`, studentId, honors |
| Bachelor of Engineering in Electrical Power Engineering | CERTIFICATE | major=`Power Systems`, classification=`First Class`, creditHours=`170` |
| Bachelor of Engineering in Mechanical Engineering | CERTIFICATE | classification=`Second Class (Lower)`, creditHours=`171` |
| Master of Engineering in Construction Engineering & Management | CERTIFICATE | credentialLevel=`Postgraduate`, thesisTitle, grade=`CGPA 3.90/4.00` |
| Diploma in Engineering (Foundation Year) | CERTIFICATE | credentialLevel=`Diploma`, durationMonths=`12` |

**#2 University of Information Technology, Yangon** — `#00629B`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Bachelor of Computer Science (Hons.) | CERTIFICATE | major=`Software Engineering`, classification=`First Class`, creditHours=`146`, honors=`Dean's List 2024` |
| Bachelor of Computer Science (Hons.) — Knowledge Engineering | CERTIFICATE | major=`Knowledge Engineering`, classification=`Second Class (Upper)` |
| Master of Computer Science | CERTIFICATE | credentialLevel=`Postgraduate`, thesisTitle, grade=`CGPA 3.75/4.00` |
| Certificate of Completion — Industrial Attachment Programme | ACTIVITY_RECORD | activity=`Industrial Attachment at <company>`, durationMonths=`3` |

**#3 University of Yangon** — `#7A0019`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Bachelor of Science in Physics | CERTIFICATE | classification=`Second Class (Upper)`, creditHours=`132` |
| Bachelor of Science in Chemistry | CERTIFICATE | classification=`First Class`, honors=`Gold Medal` |
| Bachelor of Arts in International Relations | CERTIFICATE | classification=`Second Class (Upper)` |
| Master of Research in Geology | CERTIFICATE | credentialLevel=`Postgraduate`, thesisTitle |
| PhD in Zoology | CERTIFICATE | credentialLevel=`Doctoral`, thesisTitle |

**#4 Mandalay Technological University** — `#1B5E20`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Bachelor of Engineering in Information Technology | CERTIFICATE | classification=`First Class`, creditHours=`168` |
| Bachelor of Engineering in Mechatronic Engineering | CERTIFICATE | classification=`Second Class (Upper)` |
| Master of Engineering in Electronic Engineering | CERTIFICATE | credentialLevel=`Postgraduate`, thesisTitle |

**#5 Yangon University of Economics** — `#4A148C`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Bachelor of Economics (Statistics) | CERTIFICATE | major=`Statistics`, classification=`Second Class (Upper)` |
| Bachelor of Business Administration | CERTIFICATE | classification=`First Class`, honors=`Best Graduate Award` |
| Master of Public Administration | CERTIFICATE | credentialLevel=`Postgraduate`, thesisTitle |
| Diploma in Development Studies | CERTIFICATE | credentialLevel=`Diploma`, durationMonths=`12` |

**#6 University of Medicine 1, Yangon** — `#B71C1C`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Bachelor of Medicine, Bachelor of Surgery (M.B.,B.S.) | CERTIFICATE | grade=`Credit`, honors=`Distinction in Surgery` |
| Diploma in Medical Science (Child Health) | CERTIFICATE | credentialLevel=`Postgraduate Diploma` |
| Master of Medical Science (Anatomy) | CERTIFICATE | credentialLevel=`Postgraduate`, thesisTitle |
| Certificate of Rotational Internship Completion | ACTIVITY_RECORD | activity=`Rotational Internship — Yangon General Hospital`, durationMonths=`12` |

**#7 MIIT, Mandalay** (SUSPENDED — existing certs only) — `#263238`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Bachelor of Engineering in Computer Engineering & IT | CERTIFICATE | classification=`Second Class (Upper)`, creditHours=`160` |
| Bachelor of Engineering in Electronics & Communication Engineering | CERTIFICATE | classification=`First Class` |

> #8 Co-operative University and #9 Yangon Global Business Academy issue **no** credentials
> (PENDING / REJECTED — not permitted to issue).

---

### 3b. Myanmar private colleges & training institutes

**#10 KMD College** — `#E4002B` — awardingBody often `NCC Education (UK)`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| NCC Education Level 4 Diploma in Computing | CERTIFICATE | awardingBody=`NCC Education (UK)`, credentialLevel=`RQF Level 4`, classification=`Merit`, durationMonths=`12`, modeOfStudy=`Full-time` |
| NCC Education Level 5 Diploma in Computing | CERTIFICATE | awardingBody=`NCC Education (UK)`, credentialLevel=`RQF Level 5`, classification=`Distinction`, durationMonths=`12` |
| KMD Certificate in Network Engineering | CERTIFICATE | durationMonths=`9`, grade=`Distinction`, modeOfStudy=`Part-time` |
| KMD Certificate in Software Engineering | CERTIFICATE | durationMonths=`9`, grade=`Merit` |
| KMD Diploma in Graphic & Multimedia Design | CERTIFICATE | durationMonths=`6`, grade=`Pass` |
| Pearson VUE Exam Sitting — CompTIA Network+ | ACTIVITY_RECORD | activity=`CompTIA Network+ exam sitting (KMD authorised test centre)`, issuedLocation=`Yangon` |

**#11 MCC.i** — `#00539B` — awardingBody often `NCC Education (UK)`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| NCC Education Level 4 Diploma in Computing (L4DC) | CERTIFICATE | awardingBody=`NCC Education (UK)`, credentialLevel=`RQF Level 4`, classification=`Merit` |
| NCC Education Level 5 Diploma in Computing (L5DC) | CERTIFICATE | awardingBody=`NCC Education (UK)`, credentialLevel=`RQF Level 5`, classification=`Pass` |
| MCC Certificate in Web Development | CERTIFICATE | durationMonths=`6`, grade=`Distinction` |
| MCC Certificate in Data Analytics with Python | CERTIFICATE | durationMonths=`4`, grade=`Merit` |

**#12 Strategy First International College** — `#F26522`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| NCC Education Level 5 Diploma in Business (International Business) | CERTIFICATE | awardingBody=`NCC Education (UK)`, credentialLevel=`RQF Level 5`, classification=`Merit` |
| Diploma in Digital Marketing | CERTIFICATE | durationMonths=`9`, grade=`Distinction` |
| Certificate in Business English (Advanced) | CERTIFICATE | durationMonths=`4`, grade=`B2 — Upper Intermediate` |
| Foundation Certificate in Engineering | CERTIFICATE | durationMonths=`12`, grade=`Pass` |

**#13 Info Myanmar University** — `#2E3192` — partner `Edinburgh Napier University`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Higher National Certificate in Computing | CERTIFICATE | awardingBody=`Pearson BTEC`, credentialLevel=`HNC`, classification=`Merit` |
| Higher National Diploma in Computing | CERTIFICATE | awardingBody=`Pearson BTEC`, credentialLevel=`HND`, classification=`Distinction` |
| BSc (Hons) in Computing | CERTIFICATE | awardingBody=`Edinburgh Napier University`, classification=`Second Class (Upper)` |

**#14 Victoria University College** — `#6D2077` — partner `University of Wolverhampton`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Pearson BTEC HND in Civil Engineering | CERTIFICATE | awardingBody=`Pearson BTEC`, credentialLevel=`HND`, classification=`Merit` |
| Pearson BTEC HND in Mechanical Engineering | CERTIFICATE | awardingBody=`Pearson BTEC`, credentialLevel=`HND`, classification=`Distinction` |
| BEng (Hons) Electrical & Electronic Engineering (top-up) | CERTIFICATE | awardingBody=`University of Wolverhampton`, classification=`Second Class (Upper)` |
| BA (Hons) Business Management (top-up) | CERTIFICATE | awardingBody=`University of Wolverhampton`, classification=`First Class` |

**#15 Auston College Myanmar** (SUSPENDED — existing certs only) — `#0090DA`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Advanced Diploma in Engineering (Electrical & Electronic) | CERTIFICATE | credentialLevel=`Advanced Diploma`, classification=`Merit` |
| Advanced Diploma in Information Technology | CERTIFICATE | credentialLevel=`Advanced Diploma`, classification=`Distinction` |

**#16 GUSTO College** — `#00A651`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Diploma in Hospitality & Tourism Management | CERTIFICATE | durationMonths=`12`, grade=`Merit` |
| Certificate in Front Office Operations | CERTIFICATE | durationMonths=`4`, grade=`Distinction` |
| Certificate in Professional Cookery | CERTIFICATE | durationMonths=`6`, grade=`Pass` |

> #17 SkillBridge issues **no** credentials (PENDING).

---

### 3c. Global institutions

**#18 MIT — Professional Education** — `#750014`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Professional Certificate in Machine Learning & Artificial Intelligence | CERTIFICATE | modeOfStudy=`Blended`, creditHours=`n/a`, issuedLocation=`Cambridge, MA, USA` |
| Professional Certificate in Data Science | CERTIFICATE | modeOfStudy=`Online` |
| Short Program: Chief Digital Officer Program | ACTIVITY_RECORD | activity=`Chief Digital Officer Program (completed)`, durationMonths=`3` |

**#19 Stanford Center for Professional Development** — `#8C1515`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Graduate Certificate in Artificial Intelligence | CERTIFICATE | credentialLevel=`Graduate`, creditHours=`12` |
| Professional Certificate: Machine Learning | CERTIFICATE | modeOfStudy=`Online` |
| Stanford LEAD — Corporate Innovation (course completion) | ACTIVITY_RECORD | activity=`Stanford LEAD: Corporate Innovation`, durationMonths=`12` |

**#20 Harvard Extension School** — `#A51C30`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Graduate Certificate in Data Science | CERTIFICATE | credentialLevel=`Graduate`, creditHours=`16` |
| Graduate Certificate in Digital Transformation | CERTIFICATE | credentialLevel=`Graduate`, creditHours=`16` |
| Professional Graduate Certificate in Cybersecurity | CERTIFICATE | credentialLevel=`Graduate`, creditHours=`16` |

**#21 NUS — SCALE** — `#003D7C`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Specialist Certificate in Data Analytics | CERTIFICATE | credentialLevel=`Specialist`, durationMonths=`3` |
| Graduate Certificate in Digital Product Management | CERTIFICATE | credentialLevel=`Graduate` |
| Professional Certificate in FinTech | CERTIFICATE | durationMonths=`6` |

---

### 3c-2. Online learning platforms (MOOC / digital credentials)

These issue mostly short **professional certificates**. Useful extra fields:
`awardingPartner` (Google / IBM / Meta / etc.), `courseCount`, `hoursOfStudy`,
`completionDate`, `credentialId` (the platform's own cert ID), `verifyUrl`.

**#22 Coursera** — `#0056D2`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Google Data Analytics Professional Certificate | CERTIFICATE | awardingPartner=`Google`, courseCount=`8`, hoursOfStudy=`~180`, credentialId |
| Google IT Support Professional Certificate | CERTIFICATE | awardingPartner=`Google`, courseCount=`5`, hoursOfStudy=`~120` |
| Meta Front-End Developer Professional Certificate | CERTIFICATE | awardingPartner=`Meta`, courseCount=`9` |
| IBM Data Science Professional Certificate | CERTIFICATE | awardingPartner=`IBM`, courseCount=`12` |
| DeepLearning.AI Machine Learning Specialization | CERTIFICATE | awardingPartner=`DeepLearning.AI`, courseCount=`3` |

**#23 edX** — `#02262B`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| MicroMasters Program in Data Science (UC San Diego) | CERTIFICATE | awardingPartner=`UC San Diego`, credentialLevel=`MicroMasters`, courseCount=`4` |
| Professional Certificate in Computer Science for Web Programming (HarvardX) | CERTIFICATE | awardingPartner=`HarvardX`, courseCount=`2` |
| Professional Certificate in Python Data Science (IBM) | CERTIFICATE | awardingPartner=`IBM`, courseCount=`5` |
| Verified Certificate — CS50's Introduction to Computer Science | CERTIFICATE | awardingPartner=`HarvardX`, hoursOfStudy=`~100` |

**#24 Udacity** — `#01B3E3`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Nanodegree — AI Programming with Python | CERTIFICATE | credentialLevel=`Nanodegree`, durationMonths=`3`, `capstoneProject` |
| Nanodegree — Data Engineering | CERTIFICATE | credentialLevel=`Nanodegree`, durationMonths=`5` |
| Nanodegree — Cloud DevOps Engineer | CERTIFICATE | credentialLevel=`Nanodegree`, durationMonths=`4` |

**#25 DataCamp** — `#03EF62`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Data Analyst with Python — Career Track Certificate | CERTIFICATE | courseCount=`23`, hoursOfStudy=`~90` |
| Data Scientist Professional Certification | CERTIFICATE | `examScore`, `practicalExam`=`Passed` |
| SQL Fundamentals — Skill Track Certificate | CERTIFICATE | courseCount=`5` |

**#26 Google Career Certificates** — `#4285F4`
| Certificate title | Type | Typical extra fields |
|---|---|---|
| Google UX Design Certificate | CERTIFICATE | courseCount=`7`, hoursOfStudy=`~200`, credentialId |
| Google Project Management Certificate | CERTIFICATE | courseCount=`6` |
| Google Cybersecurity Certificate | CERTIFICATE | courseCount=`8` |
| Google Digital Marketing & E-commerce Certificate | CERTIFICATE | courseCount=`7` |

> #27 CertHub Online issues **no** credentials (REJECTED).

---

### 3d. Activity records

Issued by the graduate's linked university/college (not by MOOC platforms). The full list
with extra-field templates is embedded in `gen-credential-assignments.py` (`ACTIVITIES`).
Engineering competitions map to YTU/MTU/MIIT/UIT grads, debate/Model UN/research to
UY/Economics, hackathons/CTF to UIT/KMD/MCC.i/Strategy First, medical internship to UM1.

| Category | Examples | Extra fields |
|---|---|---|
| **Clubs / student government** | President Students' Union; Class Representative; President IT & Computing Club; Secretary Debate Society; Lead Robotics Club; Editor Student Magazine; Photography Club Exhibition organiser | `Role`, `Body`, `Term` (term-end → `expires_at`) |
| **Sports** | Member / Captain University Football Team; Basketball Team; Chinlone Demonstration Team; Bronze Medal Inter-University Games (Athletics); Yangon University Marathon finisher | `Sport`, `Team`, `Season`, `Result` |
| **Volunteering** | Volunteer Instructor Community Coding Bootcamp; Campus Blood Donation Drive organiser; Flood Relief Volunteer; Rural School STEM Outreach | `Role`, `Hours`, `Organisation` |
| **Speech / debate** | Best Speaker, Inter-University Debate Championship; Finalist, National Impromptu Speech Contest | `Event`, `Placement`, `Organiser` |
| **Hackathons** | 1st Place DevCon Yangon Hackathon; Participant AI Hackathon Myanmar (UAB Tech Hub); 2nd Runner-up National Student Hackathon | `Event`, `Placement`, `Team`, `Project` |
| **Robotics / STEM** | National Selection World Robot Olympiad Myanmar; Best Robot Design Myanmar STEM Competition; Team Myanmar FIRST Global Challenge | `Event`, `Category`, `Placement`, `Team` |
| **Model UN / research / programming** | Outstanding Delegate Yangon Model UN; Best Paper Student Research Symposium; 3rd Place Inter-University Programming Contest; Finalist National Cyber Security CTF | `Conference`/`Event`, `Committee`/`Paper Title`, `Country`/`Placement`, `Award`/`Team` |
| **Research / internship** | Research Assistant Renewable Energy Lab; Industrial Attachment Programme; Rotational Internship Yangon General Hospital; Teaching Assistant | `Role`, `Duration`, `Supervisor` / `Company` |
| **Recognition** | Dean's List (Semester N); Best Final-Year Project Award; Academic Excellence Award | `Semester`, `GPA`, `Award` |

Real events referenced: World Robot Olympiad Myanmar, Myanmar STEM Competition, FIRST Global
Challenge (Team Myanmar), DevCon Yangon Hackathon, AI Hackathon Myanmar (Cursor / UAB Tech Hub).

## 4. Shares

_TBD._

## 5. Disputes

_TBD._

---

## Load order

Run against a wiped DB (keep only the AA user + `flyway_schema_history`). Note:
`TRUNCATE institution CASCADE` also clears `users` via the `users.institution_id` FK — the
AA row must be re-inserted from V3 afterward.

1. `V3` seeds the AA account (migration, already applied).
2. `scripts/seed/seed-institutions.sh` — §1, then the `brand_color`/`accent_pattern` SQL UPDATE.
3. `scripts/seed/seed-logos.sh` — §1 logos (optional, best-effort).
4. `scripts/seed/seed-graduates.sh` — §2 (the 47 registered).
5. `scripts/seed/gen-credential-assignments.py` then `scripts/seed/seed-credentials.sh` — §3.
6. Shares (§4 — TBD), `scripts/seed/seed-disputes.sh` — §5: files 3 flags on UIT
   credentials held by `sunandmoon8484984@gmail.com`, one per canonical reason category
   (`Incorrect details: wrong date of issuance`, `Not my credential`,
   `Other: name spelling does not match NRC`). Idempotent: skips credentials that
   already carry an OPEN flag. Run last (needs §3 credentials).

Partial re-seed of §3 only: `TRUNCATE audit_log_entry, share_field_selection, share,
dispute_flag, credential_field, credential RESTART IDENTITY CASCADE` then rerun steps 5.
