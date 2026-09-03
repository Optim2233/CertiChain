#!/usr/bin/env python3
"""Append one extra graduate's credential assignments to credential-assignments.tsv.

A one-off for sunandmoon8484984@gmail.com (row 51 in graduates.tsv): a UIT student
who should hold UIT-related certificates + activities and an above-average pile of
MOOC certificates.

Kept out of gen-credential-assignments.py on purpose - that generator is fully
deterministic over the 50-row roster, and adding a 51st row would shift every RNG
draw and re-mint all 237 existing uniqueIds. This just appends fixed rows.

Idempotent: if any row for the target email is already in the file, does nothing.

    python gen-extra-graduate.py
"""
import csv
import json
from pathlib import Path

HERE = Path(__file__).parent
OUT = HERE / "credential-assignments.tsv"
EMAIL = "sunandmoon8484984@gmail.com"

# uniqueId sequence base well above the deterministic generator's range (max ~131)
# so these never collide with a full re-run of gen-credential-assignments.py.
CERT = 9000
ACT = 9000

# columns: graduateEmail  institutionRow  type  title  gradDate  expiresAt  fieldsJson  method  uniqueId
ROWS = []


def cert(inst_row, title, grad_date, fields, disc, year):
    global CERT
    CERT += 1
    ROWS.append([EMAIL, str(inst_row), "CERTIFICATE", title, grad_date, "",
                 json.dumps(fields, ensure_ascii=False), "batch", f"{disc}-{year}-{CERT:04d}"])


def activity(title, adate, fields, expires=""):
    global ACT
    ACT += 1
    ROWS.append([EMAIL, "2", "ACTIVITY_RECORD", title, adate, expires,
                 json.dumps(fields, ensure_ascii=False), "batch", f"ACT-02-{ACT:04d}"])


# --- UIT degrees (institution row 2 - University of Information Technology) ---
cert(2, "Bachelor of Computer Science (Hons.)", "November 2023",
     {"Major": "Software Engineering", "Classification": "First Class",
      "Credit Hours": "146", "Honours": "Dean's List 2022, 2023"}, "CS", 2023)
cert(2, "Master of Computer Science", "December 2025",
     {"Credential Level": "Postgraduate", "Grade": "CGPA 3.81/4.00",
      "Thesis Title": "Retrieval-Augmented Generation for Low-Resource Burmese QA"}, "MCS", 2025)

# --- UIT activity records ---
activity("President, IT & Computing Club", "March 2023",
         {"Role": "President", "Body": "IT & Computing Club", "Term": "2022-2023"},
         expires="2023-08-31")
activity("1st Place, DevCon Yangon Hackathon", "September 2023",
         {"Event": "DevCon Yangon Hackathon 2023", "Placement": "1st Place",
          "Team": "SunAndMoon", "Project": "Offline lecture-note summariser"})
activity("Finalist, Myanmar National Cyber Security CTF", "July 2024",
         {"Event": "Myanmar National Cyber Security CTF 2024", "Placement": "Finalist",
          "Team": "0xUIT"})
activity("Teaching Assistant, First-Year Programming", "October 2024",
         {"Role": "Teaching Assistant", "Duration": "1 semester", "Supervisor": "Daw Sandar Aye"})

# --- MOOC certificates: more than the usual (rich grads get 2-3; this one gets 6) ---
cert(22, "Google Data Analytics Professional Certificate", "Completed April 2024",
     {"Awarding Partner": "Google", "Course Count": "8", "Hours of Study": "~180",
      "Credential ID": f"GDA-2024-{481233}"}, "GDA", 2024)
cert(22, "DeepLearning.AI Machine Learning Specialization", "Completed August 2024",
     {"Awarding Partner": "DeepLearning.AI", "Course Count": "3",
      "Credential ID": f"DLM-2024-{702914}"}, "DLM", 2024)
cert(23, "Verified Certificate - CS50's Introduction to Computer Science",
     "Completed February 2023",
     {"Awarding Partner": "HarvardX", "Hours of Study": "~100",
      "Credential ID": f"CS50-2023-{338105}"}, "CS50", 2023)
cert(24, "Nanodegree - AI Programming with Python", "Completed November 2023",
     {"Credential Level": "Nanodegree", "Duration": "3 months",
      "Capstone Project": "Image Classifier CLI", "Credential ID": "AIP-2023-915044"},
     "AIP", 2023)
cert(25, "Data Scientist Professional Certification", "Completed June 2025",
     {"Exam Score": "88%", "Practical Exam": "Passed",
      "Credential ID": f"DSP-2025-{560287}"}, "DSP", 2025)
cert(26, "Google Cybersecurity Certificate", "Completed March 2025",
     {"Course Count": "8", "Hours of Study": "~200",
      "Credential ID": f"CY-2025-{124889}"}, "CY", 2025)


def main():
    existing = OUT.read_text(encoding="utf-8")
    if EMAIL in existing:
        print(f"{EMAIL} already has assignments in {OUT.name} - nothing to do")
        return
    # match the file's CRLF line endings
    with OUT.open("a", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh, delimiter="\t", lineterminator="\r\n")
        w.writerows(ROWS)
    certs = sum(1 for r in ROWS if r[2] == "CERTIFICATE")
    acts = len(ROWS) - certs
    print(f"appended {len(ROWS)} rows for {EMAIL}: {certs} certificates, {acts} activity records")


if __name__ == "__main__":
    main()
