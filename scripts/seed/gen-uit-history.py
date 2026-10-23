#!/usr/bin/env python
"""Generates a month of UIT issuance history: 1-3 credentials per day.

Emits one CSV row per credential plus a backdating SQL statement, because the
API stamps issued_at with Instant.now() - there is no way to set it over HTTP.
Titles vary per row so each credential gets a distinct merkle root (identical
field sets to the same graduate would collide on the dedup index).
"""
import csv, datetime, random, sys, pathlib

random.seed(20260915)  # reproducible: re-running gives the same history

HERE = pathlib.Path(__file__).parent
DAYS = 30
PROGRAMMES = [
    "Bachelor of Computer Science", "Bachelor of Software Engineering",
    "Bachelor of Information Systems", "Bachelor of Computer Engineering",
    "Bachelor of Cyber Security", "Bachelor of Data Science",
    "Master of Computer Science", "Master of Information Technology",
    "Postgraduate Diploma in Data Engineering", "Postgraduate Diploma in Cloud Computing",
]
ACTIVITIES = [
    "UIT Hackathon 2026 - Finalist", "Research Assistant, Networks Lab",
    "Student Council Representative", "Peer Mentor, First Year Programme",
    "Volunteer, UIT Open Source Week", "Presenter, Undergraduate Research Symposium",
]
HONOURS = ["First Class", "Second Class Upper", "Second Class Lower", "Pass"]

grads = []
with open(HERE / "graduates.tsv", encoding="utf-8") as fh:
    for row in csv.reader(fh, delimiter="\t"):
        if not row or row[0].startswith("#") or row[0] == "num":
            continue
        if len(row) > 3 and "@" in row[3]:
            grads.append(row[3])
if not grads:
    sys.exit("no graduates found in graduates.tsv")

today = datetime.date.today()
rows, sql = [], []
for offset in range(DAYS, 0, -1):
    day = today - datetime.timedelta(days=offset)
    for _ in range(random.randint(1, 3)):
        email = random.choice(grads)
        if random.random() < 0.25:
            title = f"{random.choice(ACTIVITIES)} ({day.year})"
            rows.append({"graduate_email": email, "type": "activity_record", "title": title,
                         "graduationDate": "", "activity": title, "date": day.isoformat(),
                         "expires_at": ""})
        else:
            # Honours + year keeps the field set unique per row without looking synthetic.
            title = f"{random.choice(PROGRAMMES)} ({random.choice(HONOURS)})"
            rows.append({"graduate_email": email, "type": "certificate", "title": title,
                         "graduationDate": day.isoformat(), "activity": "", "date": "",
                         "expires_at": ""})
        sql.append(day.isoformat())

out = HERE / "uit-history.csv"
with open(out, "w", newline="", encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=["graduate_email", "type", "title", "graduationDate",
                                       "activity", "date", "expires_at"])
    w.writeheader()
    w.writerows(rows)

(HERE / "uit-history-dates.txt").write_text("\n".join(sql), encoding="utf-8")
print(f"{len(rows)} credentials across {DAYS} days -> {out.name}")
