"""Verify that the current export is the one independently walked and approved."""
import argparse
import hashlib
import json
from pathlib import Path
import sys


def sha256(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def load(path):
    with path.open(encoding="utf-8-sig") as stream:
        value = json.load(stream)
    if not isinstance(value, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return value


def names(value, label):
    if not isinstance(value, list) or not value or not all(isinstance(s, str) and s.strip() for s in value):
        raise ValueError(f"{label} must list named stops")
    if len(set(value)) != len(value):
        raise ValueError(f"Duplicate stop in {label}")
    return set(value)


def verify(candidate, scope, review_dir):
    expected = names(load(scope).get("required_stops"), "required_stops")
    evidence_path = review_dir / "evidence.json"
    evidence, decision = load(evidence_path), load(review_dir / "decision.json")
    if decision.get("status") != "pass" or decision.get("findings") != []:
        raise ValueError(f"No clean independent pass (verdict: {decision.get('status')!r})")
    build_hash = sha256(candidate)
    if any(record.get("build_sha256") != build_hash for record in (evidence, decision)):
        raise ValueError("Candidate HTML differs from the reviewed build")
    if decision.get("evidence_sha256") != sha256(evidence_path):
        raise ValueError("Verdict is not for this round's evidence")
    if evidence.get("schema") != 1 or evidence.get("returned_to_start") is not True:
        raise ValueError("Missing complete return-route evidence")
    if evidence.get("gallery") != "gallery.html" or evidence.get("gallery_sha256") != sha256(review_dir / "gallery.html"):
        raise ValueError("Review gallery missing or changed")
    views = evidence.get("room_views")
    if not isinstance(views, dict) or not all(type(count) is int and count >= 4 for count in views.values()):
        raise ValueError("Four captured headings per visited stop are required")
    missing = expected.difference(views)
    if missing:
        raise ValueError("Required rooms not walked: " + ", ".join(sorted(missing)))
    if names(decision.get("reviewed_rooms"), "reviewed_rooms") != set(views):
        raise ValueError("Not every captured room was visually reviewed")
    return {"status": "ready", "build_sha256": build_hash, "stops": len(views), "views": sum(views.values())}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("candidate", "scope", "review_dir"):
        parser.add_argument(arg, type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.candidate, args.scope, args.review_dir), indent=2))
    except (OSError, ValueError) as error:
        print(f"Release blocked: {error}", file=sys.stderr)
        sys.exit(1)
