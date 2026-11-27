"""New derivative only: exact parent, deterministic output, no new image/data payload."""
import hashlib
from pathlib import Path
import tempfile
import unittest

from render_adjustable import NAME, PARENT, ROOT, export


class AdjustableExport(unittest.TestCase):
    def test_frozen_binding_and_atomic_output(self):
        parent = ROOT / "build/house-lift-comparison.html"
        before = parent.read_bytes()
        self.assertEqual(hashlib.sha256(before).hexdigest(), PARENT)
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / NAME
            for src, dest in [(parent, parent), (parent, Path(td) / "house-architect.html"),
                              (ROOT / "build/house-vehicles.html", out)]:
                with self.assertRaises(ValueError):
                    export(src, dest)
            self.assertFalse(out.exists())
            h = export(parent, out)
            self.assertEqual(export(parent, out), h)
            self.assertEqual(hashlib.sha256(out.read_bytes()).hexdigest(), h)
            self.assertEqual(parent.read_bytes(), before)
            data = lambda raw: raw.split(b'id="scene-data">', 1)[1].split(b"</script>", 1)[0]
            self.assertEqual(data(before), data(out.read_bytes()))
            self.assertNotIn(b'id="v-len"', before)
            self.assertEqual(out.read_bytes().count(b'id="v-len"'), 1)


if __name__ == "__main__":
    unittest.main()
