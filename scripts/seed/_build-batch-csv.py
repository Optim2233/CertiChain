#!/usr/bin/env python3
"""Build batch CSVs for one institution row, one CSV per distinct field-label set
so an empty cell is never turned into an empty credential field by the server.

    _build-batch-csv.py <credential-assignments.tsv> <institutionRow> <out_dir>

Writes <out_dir>/batch-NN.csv for NN = 0,1,2,...  (empty out_dir if no batch rows).
Each file mixes CERTIFICATE and ACTIVITY_RECORD only if they happen to share the
exact same extra-field set (rare); type is per-row anyway.
"""
import csv
import json
import sys
from pathlib import Path

assign, inst_row, out_dir = sys.argv[1], sys.argv[2], Path(sys.argv[3])
out_dir.mkdir(parents=True, exist_ok=True)

rows = [r for r in csv.DictReader(open(assign, encoding="utf-8"), delimiter="\t")
        if r["institutionRow"] == inst_row and r["method"] == "batch"]

# group by (type, tuple of extra-field labels in first-seen order)
groups = {}
for r in rows:
    labels = tuple(json.loads(r["fieldsJson"]).keys())
    groups.setdefault((r["type"], labels), []).append(r)

for i, ((ctype, labels), group) in enumerate(groups.items()):
    is_cert = ctype == "CERTIFICATE"
    date_col = "Graduation Date" if is_cert else "date"
    id_col = "Student ID" if is_cert else "Record ID"
    kind = "certificate" if is_cert else "activity_record"
    # Both types carry a `title` field: the graduate-timeline query joins on
    # fieldName='title' only, so an activity needs one too or its card shows no name.
    # Activities also keep `activity` (what the verifier's title() falls back to).
    if is_cert:
        head_cols = ["title", date_col]
    else:
        head_cols = ["title", "activity", date_col]
    header = ["graduate_email", "type", "expires_at"] + head_cols + list(labels) + [id_col]
    w = csv.writer(open(out_dir / f"batch-{i:02d}.csv", "w", encoding="utf-8", newline=""))
    w.writerow(header)
    for r in group:
        f = json.loads(r["fieldsJson"])
        base = [r["title"], r["gradDate"]] if is_cert else [r["title"], r["title"], r["gradDate"]]
        line = [r["graduateEmail"], kind, r["expiresAt"]] + base
        line += [f[lbl] for lbl in labels]
        line.append(r["uniqueId"])
        w.writerow(line)
