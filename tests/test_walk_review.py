import base64
import hashlib
from io import BytesIO
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw

import walk_review as walk


def jpeg(n):
    image = Image.new("RGB", walk.SIZE, "white")
    ImageDraw.Draw(image).rectangle((32*n, 30, 32*n+55, 75), fill="black")
    out = BytesIO()
    image.save(out, format="JPEG")
    return walk.JPEG_URL + base64.b64encode(out.getvalue()).decode()


class WalkEvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.views = [jpeg(i) for i in range(4)]

    def setUp(self):
        scratch = walk.ROOT/".work"
        scratch.mkdir(exist_ok=True)
        tmp = TemporaryDirectory(dir=scratch, prefix="builder-test-")
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.site = self.root/"candidate.html"
        self.site.write_bytes(b"candidate\r\n")
        self.folder = self.root/"round"
        self.report = {"ok": True, "returned_to_start": True,
                       "rooms": [{"name": "Hall & stair", "views": self.views.copy()}]}

    def test_round_binds_unchanged_bytes_and_preserves_every_view(self):
        standalone = self.root/"standalone.html"
        self.folder.mkdir()
        with patch.object(walk, "run_walk", return_value=self.report) as browser:
            walk.review("chrome", self.site, standalone, self.folder, route="custom.js")
            with self.assertRaisesRegex(ValueError, "must be empty"):
                walk.review("chrome", self.site, evidence_dir=self.folder)
            browser.assert_called_once_with("chrome", "candidate\r\n", "custom.js", self.folder)
        gallery = (self.folder/"gallery.html").read_bytes()
        self.assertEqual(standalone.read_bytes(), gallery)
        self.assertIn(b"Hall &amp; stair", gallery)
        manifest = json.loads((self.folder/"evidence.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest, {"schema": 1, "build_sha256": hashlib.sha256(self.site.read_bytes()).hexdigest(),
                                    "gallery": "gallery.html", "gallery_sha256": hashlib.sha256(gallery).hexdigest(),
                                    "room_views": {"Hall & stair": 4}, "returned_to_start": True})
        full = sorted(self.folder.glob("view-*.jpg"))
        self.assertEqual(len(full), 4)
        for path, view in zip(full, self.views):
            self.assertEqual(path.read_bytes(), base64.b64decode(view.split(",")[1]))
            self.assertIn(view.encode(), gallery)
        with Image.open(next(self.folder.glob("contact-*.jpg"))) as sheet:
            sheet.load()
            # Each corresponding reduced frame is present, in reading order.
            for i in range(4):
                x, y = (i % 2)*320 + 16*i+10, (i // 2)*212 + 24
                self.assertLess(max(sheet.getpixel((x, y))), 30)

    def test_bad_evidence_never_commits(self):
        # A JPEG comment changes its bytes, not its decoded pixels.
        original = base64.b64decode(self.views[0].split(",")[1])
        duplicate = walk.JPEG_URL + base64.b64encode(original[:2] + b"\xff\xfe\x00\x03x" + original[2:]).decode()
        invalid = [("incomplete", {"rooms": [{"name": "Hall", "views": self.views[:3]}]}),
                   ("no stops", {"rooms": []}),
                   ("duplicate name", {"rooms": self.report["rooms"]*2}),
                   ("bad JPEG", {"rooms": [{"name": "Hall", "views": [walk.JPEG_URL+"AAAA"]+self.views[1:]}]}),
                   ("same pixels", {"rooms": [{"name": "Hall", "views": self.views[:3]+[duplicate]}]}),
                   ("not returned", {"returned_to_start": False})]
        for index, (case, change) in enumerate(invalid):
            with self.subTest(case=case), patch.object(walk, "run_walk", return_value=self.report | change):
                folder = self.root/f"round-{index}"
                with self.assertRaises(ValueError):
                    walk.review("chrome", self.site, evidence_dir=folder)
                self.assertFalse((folder/"evidence.json").exists())

    def test_candidate_changed_during_walk_is_not_attested(self):
        def rebuild(*args):
            self.site.write_bytes(b"modified candidate")
            return self.report

        with patch.object(walk, "run_walk", side_effect=rebuild), self.assertRaisesRegex(ValueError, "Candidate changed"):
            walk.review("chrome", self.site, evidence_dir=self.folder)
        self.assertFalse((self.folder/"evidence.json").exists())

    def test_supplemental_large_example_cannot_substitute_for_a_walking_view(self):
        out=BytesIO();Image.new("RGB",(1280,768),"wheat").save(out,format="JPEG")
        url=walk.JPEG_URL+base64.b64encode(out.getvalue()).decode()
        details={"example-terrace":{"size":[1280,768],"jpeg":url}}
        with patch.object(walk,"run_walk",return_value=self.report|{"details":details}):
            walk.review("chrome",self.site,evidence_dir=self.folder)
        self.assertEqual((self.folder/"detail-example-terrace.jpg").read_bytes(),out.getvalue())
        self.report["rooms"][0]["views"][0]=url
        with self.assertRaisesRegex(ValueError,"640×384"):
            walk.collect(self.report,None,"test")

    def test_uniform_but_distinct_close_wall_view_is_preserved_and_flagged(self):
        out = BytesIO()
        Image.new("RGB", walk.SIZE, "#a79f8c").save(out, format="JPEG")
        rendered = walk.JPEG_URL + base64.b64encode(out.getvalue()).decode()
        self.report["rooms"][0]["views"][1] = rendered
        _, gallery = walk.collect(self.report, None, "a"*64)
        self.assertIn(rendered.encode(), gallery)
        self.assertIn(b"view 2 (uniform color)", gallery)
