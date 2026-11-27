import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from qc_gate import sha256, verify


class ReleaseGateTests(unittest.TestCase):
    def setUp(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.site = self.root / "building.html"
        self.site.write_text("export")
        self.scope = self.write("scope.json", {"required_stops": ["hall", "bath"]})
        gallery = self.root / "gallery.html"
        gallery.write_text("walk captures")
        evidence = self.write("evidence.json", {
            "schema": 1, "build_sha256": sha256(self.site), "gallery": gallery.name,
            "gallery_sha256": sha256(gallery), "room_views": {"hall": 4, "bath": 4},
            "returned_to_start": True,
        })
        self.decision = {"status": "pass", "build_sha256": sha256(self.site), "evidence_sha256": sha256(evidence),
                         "reviewed_rooms": ["hall", "bath"], "findings": []}
        self.write("decision.json", self.decision)

    def write(self, name, data):
        path = self.root / name
        path.write_text(json.dumps(data), encoding="utf-8")
        return path

    def gate(self):
        return verify(self.site, self.scope, self.root)

    def test_only_reviewed_bytes_can_ship(self):
        self.assertEqual(self.gate()["views"], 8)
        self.site.write_text("same geometry with a different viewer")
        with self.assertRaisesRegex(ValueError, "HTML differs"):
            self.gate()

    def test_missing_room_and_incomplete_review(self):
        self.write("decision.json", dict(self.decision, reviewed_rooms=["hall"]))
        with self.assertRaisesRegex(ValueError, "visually reviewed"):
            self.gate()
        self.write("scope.json", {"required_stops": ["hall", "bath", "garage"]})
        with self.assertRaisesRegex(ValueError, "not walked: garage"):
            self.gate()

    def test_repair_or_replaced_evidence_invalidates_pass(self):
        self.write("decision.json", dict(self.decision, status="revise", findings=["Door was blocked"]))
        with self.assertRaisesRegex(ValueError, "No clean independent pass"):
            self.gate()
        self.write("decision.json", self.decision)
        (self.root / "gallery.html").write_text("different views")
        with self.assertRaisesRegex(ValueError, "gallery missing or changed"):
            self.gate()
