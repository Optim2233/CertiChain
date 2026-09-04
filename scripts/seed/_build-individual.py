#!/usr/bin/env python3
"""Emit one POST /api/institution/credentials JSON body per individual-method row
for a given institution row. Used by seed-credentials.sh.

    _build-individual.py <credential-assignments.tsv> <institutionRow> <out_dir>
"""
import csv
import json
import sys
from pathlib import Path

assign, inst_row, out_dir = sys.argv[1], sys.argv[2], Path(sys.argv[3])

for r in csv.DictReader(open(assign, encoding="utf-8"), delimiter="\t"):
    if r["method"] != "individual" or r["institutionRow"] != inst_row:
        continue
    extra = json.loads(r["fieldsJson"])
    fields = [{"name": "title", "value": r["title"]},
              {"name": "Graduation Date", "value": r["gradDate"]}]
    for k, v in extra.items():
        fields.append({"name": k, "value": v})
    fields.append({"name": "Student ID", "value": r["uniqueId"]})
    body = {"graduate_email": r["graduateEmail"], "fields": fields,
            "expires_at": r["expiresAt"] or None}
    (out_dir / f'{r["graduateEmail"]}.json').write_text(
        json.dumps(body), encoding="utf-8")
