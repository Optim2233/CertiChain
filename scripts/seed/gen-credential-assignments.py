#!/usr/bin/env python3
"""Generate scripts/seed/credential-assignments.tsv from graduates.tsv + the embedded catalog.

Deterministic (fixed RNG seed) so re-running produces the same plan. Output columns:
    graduateEmail  institutionRow  type  title  gradDate  expiresAt  fieldsJson  method

- type      : CERTIFICATE | ACTIVITY_RECORD
- gradDate  : human display string for the "Graduation Date" / "Completed" field ("" for activities)
- expiresAt : "" (never) or YYYY-MM-DD
- fieldsJson: JSON object of EXTRA fields (label -> value); the runner prepends `title`
              (certs) / `activity` (+ `date`) and appends the unique id field.
- method    : batch | individual

The catalog mirrors SEED-DATA.md sections 3a-3d. Keep the two in sync by hand (static demo data).
"""
import csv
import json
import random
import sys
from pathlib import Path

HERE = Path(__file__).parent
GRADS = HERE / "graduates.tsv"
OUT = HERE / "credential-assignments.tsv"

RNG = random.Random(20260902)

# ---------------------------------------------------------------------------
# University / college program catalog.  inst-row -> list of programs.
# level: foundation < bachelor < master < phd   (ordering for multi-degree grads)
#        diploma / hnd / professional / mooc     (standalone, no ordering)
# disc: 2-4 letter discipline code for the Student ID
# ---------------------------------------------------------------------------
PROGRAMS = {
    1: [  # Yangon Technological University
        ("bachelor", "CE", "Bachelor of Engineering in Civil Engineering",
         {"Major": "Structural Engineering", "Classification": "Second Class (Upper)", "Credit Hours": "172"}),
        ("bachelor", "EP", "Bachelor of Engineering in Electrical Power Engineering",
         {"Major": "Power Systems", "Classification": "First Class", "Credit Hours": "170"}),
        ("bachelor", "ME", "Bachelor of Engineering in Mechanical Engineering",
         {"Classification": "Second Class (Lower)", "Credit Hours": "171"}),
        ("master", "CEM", "Master of Engineering in Construction Engineering & Management",
         {"Credential Level": "Postgraduate", "Grade": "CGPA 3.90/4.00",
          "Thesis Title": "Lifecycle Cost Optimisation of Yangon Flyover Structures"}),
        ("foundation", "FE", "Diploma in Engineering (Foundation Year)",
         {"Credential Level": "Diploma", "Duration": "12 months"}),
    ],
    2: [  # University of Information Technology
        ("bachelor", "CS", "Bachelor of Computer Science (Hons.)",
         {"Major": "Software Engineering", "Classification": "First Class", "Credit Hours": "146",
          "Honours": "Dean's List 2024"}),
        ("bachelor", "KE", "Bachelor of Computer Science (Hons.) - Knowledge Engineering",
         {"Major": "Knowledge Engineering", "Classification": "Second Class (Upper)"}),
        ("master", "MCS", "Master of Computer Science",
         {"Credential Level": "Postgraduate", "Grade": "CGPA 3.75/4.00",
          "Thesis Title": "Low-Resource Burmese Named-Entity Recognition"}),
    ],
    3: [  # University of Yangon
        ("bachelor", "PHY", "Bachelor of Science in Physics",
         {"Classification": "Second Class (Upper)", "Credit Hours": "132"}),
        ("bachelor", "CHE", "Bachelor of Science in Chemistry",
         {"Classification": "First Class", "Honours": "Gold Medal"}),
        ("bachelor", "IR", "Bachelor of Arts in International Relations",
         {"Classification": "Second Class (Upper)"}),
        ("master", "GEO", "Master of Research in Geology",
         {"Credential Level": "Postgraduate",
          "Thesis Title": "Sedimentary Basin Analysis of the Central Myanmar Belt"}),
        ("phd", "ZOO", "Doctor of Philosophy in Zoology",
         {"Credential Level": "Doctoral",
          "Thesis Title": "Amphibian Diversity of the Rakhine Yoma"}),
    ],
    4: [  # Mandalay Technological University
        ("bachelor", "IT", "Bachelor of Engineering in Information Technology",
         {"Classification": "First Class", "Credit Hours": "168"}),
        ("bachelor", "MCT", "Bachelor of Engineering in Mechatronic Engineering",
         {"Classification": "Second Class (Upper)"}),
        ("master", "EE", "Master of Engineering in Electronic Engineering",
         {"Credential Level": "Postgraduate",
          "Thesis Title": "FPGA Acceleration of Real-Time Image Segmentation"}),
    ],
    5: [  # Yangon University of Economics
        ("bachelor", "STA", "Bachelor of Economics (Statistics)",
         {"Major": "Statistics", "Classification": "Second Class (Upper)"}),
        ("bachelor", "BBA", "Bachelor of Business Administration",
         {"Classification": "First Class", "Honours": "Best Graduate Award"}),
        ("master", "MPA", "Master of Public Administration",
         {"Credential Level": "Postgraduate",
          "Thesis Title": "Fiscal Decentralisation and Township Service Delivery"}),
        ("foundation", "DEV", "Diploma in Development Studies",
         {"Credential Level": "Diploma", "Duration": "12 months"}),
    ],
    6: [  # University of Medicine 1
        ("bachelor", "MBBS", "Bachelor of Medicine, Bachelor of Surgery (M.B.,B.S.)",
         {"Grade": "Credit", "Honours": "Distinction in Surgery"}),
        ("master", "ANA", "Master of Medical Science (Anatomy)",
         {"Credential Level": "Postgraduate",
          "Thesis Title": "Morphometric Study of the Sciatic Nerve in a Myanmar Cadaver Sample"}),
        ("foundation", "DCH", "Diploma in Medical Science (Child Health)",
         {"Credential Level": "Postgraduate Diploma"}),
    ],
    7: [  # MIIT (suspended - reinstated during seeding)
        ("bachelor", "CEIT", "Bachelor of Engineering in Computer Engineering & IT",
         {"Classification": "Second Class (Upper)", "Credit Hours": "160"}),
        ("bachelor", "ECE", "Bachelor of Engineering in Electronics & Communication Engineering",
         {"Classification": "First Class"}),
    ],
    10: [  # KMD College - NCC Education (UK)
        ("diploma", "NCC4", "NCC Education Level 4 Diploma in Computing",
         {"Awarding Body": "NCC Education (UK)", "Credential Level": "RQF Level 4",
          "Classification": "Merit", "Duration": "12 months", "Mode of Study": "Full-time"}),
        ("diploma", "NCC5", "NCC Education Level 5 Diploma in Computing",
         {"Awarding Body": "NCC Education (UK)", "Credential Level": "RQF Level 5",
          "Classification": "Distinction", "Duration": "12 months"}),
        ("diploma", "NET", "KMD Certificate in Network Engineering",
         {"Duration": "9 months", "Grade": "Distinction", "Mode of Study": "Part-time"}),
        ("diploma", "SWE", "KMD Certificate in Software Engineering",
         {"Duration": "9 months", "Grade": "Merit"}),
        ("diploma", "GMD", "KMD Diploma in Graphic & Multimedia Design",
         {"Duration": "6 months", "Grade": "Pass"}),
    ],
    11: [  # MCC.i
        ("diploma", "L4DC", "NCC Education Level 4 Diploma in Computing (L4DC)",
         {"Awarding Body": "NCC Education (UK)", "Credential Level": "RQF Level 4", "Classification": "Merit"}),
        ("diploma", "L5DC", "NCC Education Level 5 Diploma in Computing (L5DC)",
         {"Awarding Body": "NCC Education (UK)", "Credential Level": "RQF Level 5", "Classification": "Pass"}),
        ("diploma", "WEB", "MCC Certificate in Web Development",
         {"Duration": "6 months", "Grade": "Distinction"}),
        ("diploma", "DAP", "MCC Certificate in Data Analytics with Python",
         {"Duration": "4 months", "Grade": "Merit"}),
    ],
    12: [  # Strategy First International College
        ("diploma", "NCCB", "NCC Education Level 5 Diploma in Business (International Business)",
         {"Awarding Body": "NCC Education (UK)", "Credential Level": "RQF Level 5", "Classification": "Merit"}),
        ("diploma", "DDM", "Diploma in Digital Marketing",
         {"Duration": "9 months", "Grade": "Distinction"}),
        ("diploma", "BEA", "Certificate in Business English (Advanced)",
         {"Duration": "4 months", "Grade": "B2 - Upper Intermediate"}),
        ("foundation", "FCE", "Foundation Certificate in Engineering",
         {"Duration": "12 months", "Grade": "Pass"}),
    ],
    13: [  # Info Myanmar University
        ("diploma", "HNC", "Higher National Certificate in Computing",
         {"Awarding Body": "Pearson BTEC", "Credential Level": "HNC", "Classification": "Merit"}),
        ("hnd", "HND", "Higher National Diploma in Computing",
         {"Awarding Body": "Pearson BTEC", "Credential Level": "HND", "Classification": "Distinction"}),
        ("bachelor", "BSCC", "BSc (Hons) in Computing",
         {"Awarding Body": "Edinburgh Napier University", "Classification": "Second Class (Upper)"}),
    ],
    14: [  # Victoria University College
        ("hnd", "HNDC", "Pearson BTEC HND in Civil Engineering",
         {"Awarding Body": "Pearson BTEC", "Credential Level": "HND", "Classification": "Merit"}),
        ("hnd", "HNDM", "Pearson BTEC HND in Mechanical Engineering",
         {"Awarding Body": "Pearson BTEC", "Credential Level": "HND", "Classification": "Distinction"}),
        ("bachelor", "BEEE", "BEng (Hons) Electrical & Electronic Engineering (top-up)",
         {"Awarding Body": "University of Wolverhampton", "Classification": "Second Class (Upper)"}),
        ("bachelor", "BABM", "BA (Hons) Business Management (top-up)",
         {"Awarding Body": "University of Wolverhampton", "Classification": "First Class"}),
    ],
    15: [  # Auston College (suspended - reinstated during seeding)
        ("diploma", "ADEE", "Advanced Diploma in Engineering (Electrical & Electronic)",
         {"Credential Level": "Advanced Diploma", "Classification": "Merit"}),
        ("diploma", "ADIT", "Advanced Diploma in Information Technology",
         {"Credential Level": "Advanced Diploma", "Classification": "Distinction"}),
    ],
    16: [  # GUSTO College
        ("diploma", "HTM", "Diploma in Hospitality & Tourism Management",
         {"Duration": "12 months", "Grade": "Merit"}),
        ("diploma", "FOO", "Certificate in Front Office Operations",
         {"Duration": "4 months", "Grade": "Distinction"}),
        ("diploma", "PCK", "Certificate in Professional Cookery",
         {"Duration": "6 months", "Grade": "Pass"}),
    ],
    18: [  # MIT Professional Education
        ("professional", "MLAI", "Professional Certificate in Machine Learning & Artificial Intelligence",
         {"Mode of Study": "Blended", "Issued Location": "Cambridge, MA, USA"}),
        ("professional", "DS", "Professional Certificate in Data Science",
         {"Mode of Study": "Online"}),
    ],
    19: [  # Stanford SCPD
        ("professional", "GCAI", "Graduate Certificate in Artificial Intelligence",
         {"Credential Level": "Graduate", "Credit Hours": "12"}),
        ("professional", "PCML", "Professional Certificate: Machine Learning",
         {"Mode of Study": "Online"}),
    ],
    20: [  # Harvard Extension
        ("professional", "GCDS", "Graduate Certificate in Data Science",
         {"Credential Level": "Graduate", "Credit Hours": "16"}),
        ("professional", "GCDT", "Graduate Certificate in Digital Transformation",
         {"Credential Level": "Graduate", "Credit Hours": "16"}),
        ("professional", "PGCC", "Professional Graduate Certificate in Cybersecurity",
         {"Credential Level": "Graduate", "Credit Hours": "16"}),
    ],
    21: [  # NUS SCALE
        ("professional", "SCDA", "Specialist Certificate in Data Analytics",
         {"Credential Level": "Specialist", "Duration": "3 months"}),
        ("professional", "GCDPM", "Graduate Certificate in Digital Product Management",
         {"Credential Level": "Graduate"}),
        ("professional", "PCFT", "Professional Certificate in FinTech",
         {"Duration": "6 months"}),
    ],
}

# MOOC platforms: inst-row -> list of (disc, title, extra fields)
MOOC = {
    22: [  # Coursera
        ("GDA", "Google Data Analytics Professional Certificate",
         {"Awarding Partner": "Google", "Course Count": "8", "Hours of Study": "~180"}),
        ("GIT", "Google IT Support Professional Certificate",
         {"Awarding Partner": "Google", "Course Count": "5", "Hours of Study": "~120"}),
        ("MFE", "Meta Front-End Developer Professional Certificate",
         {"Awarding Partner": "Meta", "Course Count": "9"}),
        ("IDS", "IBM Data Science Professional Certificate",
         {"Awarding Partner": "IBM", "Course Count": "12"}),
        ("DLM", "DeepLearning.AI Machine Learning Specialization",
         {"Awarding Partner": "DeepLearning.AI", "Course Count": "3"}),
    ],
    23: [  # edX
        ("MMD", "MicroMasters Program in Data Science (UC San Diego)",
         {"Awarding Partner": "UC San Diego", "Credential Level": "MicroMasters", "Course Count": "4"}),
        ("CSW", "Professional Certificate in Computer Science for Web Programming (HarvardX)",
         {"Awarding Partner": "HarvardX", "Course Count": "2"}),
        ("PDS", "Professional Certificate in Python Data Science (IBM)",
         {"Awarding Partner": "IBM", "Course Count": "5"}),
        ("CS50", "Verified Certificate - CS50's Introduction to Computer Science",
         {"Awarding Partner": "HarvardX", "Hours of Study": "~100"}),
    ],
    24: [  # Udacity
        ("AIP", "Nanodegree - AI Programming with Python",
         {"Credential Level": "Nanodegree", "Duration": "3 months",
          "Capstone Project": "Image Classifier CLI"}),
        ("DE", "Nanodegree - Data Engineering",
         {"Credential Level": "Nanodegree", "Duration": "5 months"}),
        ("CDO", "Nanodegree - Cloud DevOps Engineer",
         {"Credential Level": "Nanodegree", "Duration": "4 months"}),
    ],
    25: [  # DataCamp
        ("DAP", "Data Analyst with Python - Career Track Certificate",
         {"Course Count": "23", "Hours of Study": "~90"}),
        ("DSP", "Data Scientist Professional Certification",
         {"Exam Score": "82%", "Practical Exam": "Passed"}),
        ("SQL", "SQL Fundamentals - Skill Track Certificate",
         {"Course Count": "5"}),
    ],
    26: [  # Google Career Certificates
        ("UX", "Google UX Design Certificate",
         {"Course Count": "7", "Hours of Study": "~200"}),
        ("PM", "Google Project Management Certificate",
         {"Course Count": "6"}),
        ("CY", "Google Cybersecurity Certificate",
         {"Course Count": "8"}),
        ("DM", "Google Digital Marketing & E-commerce Certificate",
         {"Course Count": "7"}),
    ],
}

LEVEL_ORDER = {"foundation": 0, "diploma": 1, "hnc": 1, "hnd": 2, "bachelor": 3,
               "master": 4, "phd": 5, "professional": 9, "mooc": 9}

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]


def hdate(year, month):
    return f"{MONTHS[month - 1]} {year}"


# ---------------------------------------------------------------------------
# Activity-record catalog.  (title, category, {extra fields}, discipline-tags)
# discipline-tags decide which institutions' grads are eligible; "any" = all.
# ---------------------------------------------------------------------------
ACTIVITIES = [
    # clubs / student government
    ("President, Students' Union", "club", {"Role": "President", "Body": "Students' Union", "Term": "2023-2024"}, "any"),
    ("Class Representative", "club", {"Role": "Class Representative", "Body": "Department Committee", "Term": "2022-2023"}, "any"),
    ("President, IT & Computing Club", "club", {"Role": "President", "Body": "IT & Computing Club", "Term": "2023-2024"}, "tech"),
    ("Secretary, Debate Society", "club", {"Role": "Secretary", "Body": "English Debate Society", "Term": "2023-2024"}, "any"),
    ("Lead, Robotics Club", "club", {"Role": "Team Lead", "Body": "Robotics Club", "Term": "2023-2024"}, "eng"),
    ("Editor, Student Magazine", "club", {"Role": "Editor", "Body": "Annual Student Magazine", "Term": "2022-2023"}, "any"),
    ("Organiser, Photography Club Exhibition", "club", {"Role": "Organiser", "Body": "Photography Club", "Term": "2023"}, "any"),
    # sports
    ("Member, University Football Team", "sport", {"Sport": "Football", "Team": "University 1st XI", "Season": "2023"}, "any"),
    ("Captain, University Football Team", "sport", {"Sport": "Football", "Team": "University 1st XI", "Season": "2024", "Result": "Runners-up, Inter-University League"}, "any"),
    ("Member, University Basketball Team", "sport", {"Sport": "Basketball", "Team": "University Team", "Season": "2023"}, "any"),
    ("Chinlone Demonstration Team", "sport", {"Sport": "Chinlone", "Team": "Cultural Sports Team", "Season": "2023"}, "any"),
    ("Bronze Medal, Inter-University Games (Athletics)", "sport", {"Sport": "Athletics - 800m", "Result": "Bronze Medal", "Season": "2024"}, "any"),
    ("Finisher, Yangon University Marathon", "sport", {"Sport": "Road Running - 10km", "Result": "Finisher", "Season": "2024"}, "any"),
    # volunteering
    ("Volunteer Instructor, Community Coding Bootcamp", "volunteer", {"Role": "Instructor", "Hours": "40", "Organisation": "Code for Myanmar"}, "tech"),
    ("Organiser, Campus Blood Donation Drive", "volunteer", {"Role": "Organiser", "Hours": "24", "Organisation": "Myanmar Red Cross Society"}, "any"),
    ("Flood Relief Volunteer", "volunteer", {"Role": "Field Volunteer", "Hours": "60", "Organisation": "Local Disaster Response Network"}, "any"),
    ("Rural School STEM Outreach Volunteer", "volunteer", {"Role": "Facilitator", "Hours": "32", "Organisation": "STEM for All Myanmar"}, "eng"),
    # competitions - speech / debate
    ("Best Speaker, Inter-University Debate Championship", "competition", {"Event": "Inter-University Debate Championship 2024", "Placement": "Best Speaker", "Organiser": "Myanmar Debate Union"}, "any"),
    ("Finalist, National Impromptu Speech Contest", "competition", {"Event": "National Impromptu Speech Contest 2023", "Placement": "Finalist", "Organiser": "British Council Myanmar"}, "any"),
    # competitions - hackathons
    ("1st Place, DevCon Yangon Hackathon", "competition", {"Event": "DevCon Yangon Hackathon 2024", "Placement": "1st Place", "Team": "ByteForge", "Project": "EduAI - offline AI tutor"}, "tech"),
    ("Participant, AI Hackathon Myanmar", "competition", {"Event": "AI Hackathon Myanmar 2025 (UAB Tech Hub)", "Placement": "Top 10", "Team": "Prompt Pilots", "Project": "AgriAdvisor chatbot"}, "tech"),
    ("2nd Runner-up, National Student Hackathon", "competition", {"Event": "National Student Hackathon 2023", "Placement": "2nd Runner-up", "Team": "NullPointer", "Project": "CityGuide AR"}, "tech"),
    # competitions - robotics / STEM
    ("National Selection, World Robot Olympiad Myanmar", "competition", {"Event": "World Robot Olympiad Myanmar 2024", "Category": "Robo Mission", "Placement": "National Finalist", "Team": "MDY Circuits"}, "eng"),
    ("Best Robot Design, Myanmar STEM Competition", "competition", {"Event": "Myanmar STEM Competition 2024", "Placement": "Best Robot Design", "Team": "YTU Automata"}, "eng"),
    ("Team Myanmar, FIRST Global Challenge", "competition", {"Event": "FIRST Global Challenge 2024 (Athens)", "Category": "Feeding the Future", "Placement": "Participant", "Team": "Team Myanmar"}, "eng"),
    # competitions - Model UN / research / programming
    ("Outstanding Delegate, Yangon Model UN", "competition", {"Conference": "Yangon Model United Nations 2023", "Committee": "UNEP", "Country": "Norway", "Award": "Outstanding Delegate"}, "any"),
    ("Best Paper, Student Research Symposium", "competition", {"Event": "University Student Research Symposium 2024", "Paper Title": "A Lightweight IoT Flood Sensor Network for the Ayeyarwady Delta", "Award": "Best Paper (Undergraduate)"}, "eng"),
    ("3rd Place, Inter-University Programming Contest", "competition", {"Event": "Inter-University Programming Contest 2023", "Placement": "3rd Place", "Team": "Segfault"}, "tech"),
    ("Finalist, National Cyber Security CTF", "competition", {"Event": "Myanmar National Cyber Security CTF 2024", "Placement": "Finalist", "Team": "0xMandalay"}, "tech"),
    # research / internship
    ("Research Assistant, Renewable Energy Lab", "research", {"Role": "Research Assistant", "Duration": "6 months", "Supervisor": "Dr. Khin Maung Latt"}, "eng"),
    ("Industrial Attachment Programme", "internship", {"Role": "Software Engineering Intern", "Duration": "3 months", "Company": "Frontiir (Myanmar Net)"}, "tech"),
    ("Rotational Internship, Yangon General Hospital", "internship", {"Role": "Intern (Rotational)", "Duration": "12 months", "Company": "Yangon General Hospital"}, "med"),
    ("Teaching Assistant, First-Year Programming", "research", {"Role": "Teaching Assistant", "Duration": "1 semester", "Supervisor": "Daw Sandar Aye"}, "tech"),
    # recognition
    ("Dean's List - Semester 1, 2024", "recognition", {"Semester": "2024 Semester 1", "GPA": "3.92"}, "any"),
    ("Best Final-Year Project Award", "recognition", {"Project": "Merkle-tree credential verifier", "Award": "Best Final-Year Project"}, "tech"),
    ("Academic Excellence Award", "recognition", {"Award": "Academic Excellence Award", "Semester": "2023 Academic Year"}, "any"),
]

# institution discipline profile -> which activity tags fit
INST_TAGS = {
    1: {"eng", "tech"}, 2: {"tech"}, 3: {"any"}, 4: {"eng", "tech"}, 5: {"any"},
    6: {"med"}, 7: {"eng", "tech"}, 10: {"tech"}, 11: {"tech"}, 12: {"tech", "any"},
    13: {"tech"}, 14: {"eng"}, 15: {"eng", "tech"}, 16: {"any"},
}


def activity_fits(tag_field, inst_rows):
    if tag_field == "any":
        return True
    allowed = set()
    for r in inst_rows:
        allowed |= INST_TAGS.get(r, {"any"})
    return tag_field in allowed or "any" in allowed and tag_field in {"club", "sport", "volunteer", "recognition"}


def main():
    grads = []
    with GRADS.open(encoding="utf-8") as fh:
        for row in csv.reader(fh, delimiter="\t"):
            if not row or row[0].startswith("#"):
                continue
            num, fn, ln, email, phone, registered, insts = row[:7]
            grads.append({
                "num": int(num), "name": f"{fn} {ln}", "email": email,
                "registered": registered == "yes",
                "insts": [int(x) for x in insts.split(",") if x],
            })

    out_rows = []
    seq = {"cert": 0, "act": 0}

    # portfolio weight buckets, tuned for ~230 total across 47 registered + 3 pending
    weights = (["lean"] * 7) + (["normal"] * 23) + (["rich"] * 17)
    RNG.shuffle(weights)

    reg = [g for g in grads if g["registered"]]
    pend = [g for g in grads if not g["registered"]]

    GLOBAL = {18, 19, 20, 21}  # standalone professional certs, like MOOCs

    for g, weight in zip(reg, weights):
        deg_rows = [r for r in g["insts"] if r in PROGRAMS and r not in GLOBAL]
        global_rows = [r for r in g["insts"] if r in GLOBAL]
        mooc_rows = [r for r in g["insts"] if r in MOOC]
        # fallback: if a grad is only linked to a MOOC/global, still give a degree from a public uni
        if not deg_rows:
            deg_rows = [RNG.choice([1, 2, 3, 4, 5])]
        uni_rows = deg_rows

        inst = uni_rows[0]
        progs = PROGRAMS[inst]
        base_year = RNG.randint(2019, 2023)

        # ---- degree(s) ----
        n_degrees = 2 if ((weight == "rich" and RNG.random() < 0.85)
                          or (weight == "normal" and RNG.random() < 0.25)) else 1
        chosen = []
        if n_degrees == 2:
            lows = [p for p in progs if LEVEL_ORDER[p[0]] <= 3]
            highs = [p for p in progs if LEVEL_ORDER[p[0]] >= 4]
            if lows and highs:
                chosen = [RNG.choice(lows), RNG.choice(highs)]
            else:
                chosen = [RNG.choice(progs)]
        else:
            # single degree: never a bare Master/PhD (they imply a prior Bachelor);
            # pick from foundation/diploma/hnd/bachelor only.
            entry = [p for p in progs if LEVEL_ORDER[p[0]] <= 3]
            chosen = [RNG.choice(entry or progs)]
        chosen.sort(key=lambda p: LEVEL_ORDER[p[0]])

        yr = base_year
        for (level, disc, title, extra) in chosen:
            seq["cert"] += 1
            grad_year = yr + (4 if level in ("bachelor",) else 3 if level in ("master", "phd") else 1)
            gd = hdate(grad_year, RNG.choice([6, 11, 12]))
            fields = dict(extra)
            sid = f"{disc}-{grad_year}-{seq['cert']:04d}"
            out_rows.append([g["email"], inst, "CERTIFICATE", title, gd, "",
                             json.dumps(fields, ensure_ascii=False), "batch", sid])
            yr = grad_year  # next degree starts after this one

        # ---- MOOC certs ----
        n_mooc = 0
        if mooc_rows:
            n_mooc = {"lean": 1, "normal": RNG.choice([1, 2, 2]), "rich": RNG.choice([2, 3, 3])}[weight]
        elif weight == "rich" and RNG.random() < 0.5:
            # rich grads with no linked platform still pick up a stray MOOC cert
            mooc_rows = [RNG.choice(list(MOOC))]
            n_mooc = 1
        for _ in range(n_mooc):
            mrow = RNG.choice(mooc_rows)
            disc, title, extra = RNG.choice(MOOC[mrow])
            seq["cert"] += 1
            cy = RNG.randint(2023, 2026)
            gd = f"Completed {hdate(cy, RNG.randint(1, 12))}"
            fields = dict(extra)
            fields["Credential ID"] = f"{disc}-{cy}-{RNG.randint(100000, 999999)}"
            sid = f"{disc}-{cy}-{seq['cert']:04d}"
            out_rows.append([g["email"], mrow, "CERTIFICATE", title, gd, "",
                             json.dumps(fields, ensure_ascii=False), "batch", sid])

        # ---- global professional-education certs (one per linked global row) ----
        for grow in global_rows:
            level, disc, title, extra = RNG.choice(PROGRAMS[grow])
            seq["cert"] += 1
            cy = RNG.randint(2022, 2026)
            gd = f"Completed {hdate(cy, RNG.choice([5, 6, 12]))}"
            fields = dict(extra)
            sid = f"{disc}-{cy}-{seq['cert']:04d}"
            out_rows.append([g["email"], grow, "CERTIFICATE", title, gd, "",
                             json.dumps(fields, ensure_ascii=False), "batch", sid])

        # ---- activity records ----
        n_act = {"lean": RNG.choice([1, 1, 2]), "normal": RNG.choice([2, 2, 3]),
                 "rich": RNG.choice([3, 4, 5])}[weight]
        pool = [a for a in ACTIVITIES if activity_fits(a[3], g["insts"])]
        RNG.shuffle(pool)
        picked = pool[:n_act]
        act_year = base_year + 1
        for (title, cat, extra, _tag) in picked:
            seq["act"] += 1
            ay = RNG.randint(base_year + 1, base_year + 4)
            adate = hdate(ay, RNG.randint(1, 12))
            expires = ""
            if "Term" in extra and "-" in extra["Term"]:
                expires = f"{extra['Term'].split('-')[1]}-08-31"
            fields = dict(extra)
            rid = f"ACT-{inst:02d}-{seq['act']:04d}"
            out_rows.append([g["email"], inst, "ACTIVITY_RECORD", title, adate, expires,
                             json.dumps(fields, ensure_ascii=False), "batch", rid])

    # ---- pending-claim graduates: one individual credential each ----
    for g in pend:
        inst = g["insts"][0]
        if inst in PROGRAMS:
            level, disc, title, extra = RNG.choice(PROGRAMS[inst])
            seq["cert"] += 1
            gy = RNG.randint(2023, 2025)
            gd = hdate(gy, RNG.choice([6, 11]))
            fields = dict(extra)
            sid = f"{disc}-{gy}-{seq['cert']:04d}"
            out_rows.append([g["email"], inst, "CERTIFICATE", title, gd, "",
                             json.dumps(fields, ensure_ascii=False), "individual", sid])
        else:  # MOOC
            disc, title, extra = RNG.choice(MOOC[inst])
            seq["cert"] += 1
            cy = RNG.randint(2024, 2026)
            fields = dict(extra)
            fields["Credential ID"] = f"{disc}-{cy}-{RNG.randint(100000, 999999)}"
            sid = f"{disc}-{cy}-{seq['cert']:04d}"
            out_rows.append([g["email"], inst, "CERTIFICATE", title,
                             f"Completed {hdate(cy, RNG.randint(1, 12))}", "",
                             json.dumps(fields, ensure_ascii=False), "individual", sid])

    with OUT.open("w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, delimiter="\t")
        w.writerow(["graduateEmail", "institutionRow", "type", "title", "gradDate",
                    "expiresAt", "fieldsJson", "method", "uniqueId"])
        w.writerows(out_rows)

    certs = sum(1 for r in out_rows if r[2] == "CERTIFICATE")
    acts = sum(1 for r in out_rows if r[2] == "ACTIVITY_RECORD")
    indiv = sum(1 for r in out_rows if r[7] == "individual")
    print(f"wrote {len(out_rows)} assignments -> {OUT.name}")
    print(f"  {certs} certificates, {acts} activity records; {indiv} individual, {len(out_rows)-indiv} batch")
    by_inst = {}
    for r in out_rows:
        by_inst[r[1]] = by_inst.get(r[1], 0) + 1
    print("  per institution:", dict(sorted(by_inst.items())))


if __name__ == "__main__":
    sys.exit(main())
