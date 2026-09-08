#!/usr/bin/env python3
"""Parse a POST /credentials/batch JSON response (passed as argv[1]).
Prints "<ok> <realErrors>" on stdout; per-row real errors go to stderr.
Dedup "identical credential" errors count as OK (idempotent re-run).
"""
import json
import sys

try:
    data = json.loads(sys.argv[1])
except Exception:
    print("0 0")
    sys.exit()

ok = sum(1 for d in data if d.get("status") == "OK")
errs = [d for d in data if d.get("status") != "OK"]
dup = sum(1 for d in errs if "identical credential" in (d.get("error") or ""))
real = [d for d in errs if "identical credential" not in (d.get("error") or "")]
for d in real[:8]:
    print(f'    ERR row {d.get("row")} {d.get("graduate")} - {d.get("error")}',
          file=sys.stderr)
print(f"{ok + dup} {len(real)}")
