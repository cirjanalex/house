"""Guard the historical recipes, wall and furnishing boundary and offline asset inventory."""
import hashlib
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from render_rav509if import export, NAME, PARENT, ROOT


class Rav509IF(unittest.TestCase):
    def test_bound_deterministic_non_destructive(self):
        wall=ROOT/"build/house-garage-wall.html";old=ROOT/"build/house-lift-adjustable.html"
        before=wall.read_bytes()
        self.assertEqual(hashlib.sha256(old.read_bytes()).hexdigest(),"b720520c5452824116f4695f0fbc9ac2c2262437bcaabd01c1f55f066660b0a0")
        def scene(raw):
            return json.loads(raw.split(b'id="scene-data">')[1].split(b"</script>",1)[0])
        with TemporaryDirectory() as td:
            o=Path(td)/NAME
            for a,b in [(wall,wall),(old,o),(wall,old)]:
                with self.assertRaises(ValueError):export(a,b)
            self.assertFalse(o.exists());h=export(wall,o);raw=o.read_bytes()
            self.assertEqual(export(wall,o),h);self.assertEqual(hashlib.sha256(raw).hexdigest(),h)
            self.assertEqual(hashlib.sha256(wall.read_bytes()).hexdigest(),PARENT)
            a,b=scene(before),scene(raw)
            self.assertEqual(b["rav509if"]["parent_sha256"],PARENT)
            self.assertNotEqual(a["hash"],b["hash"])
            for k in a.keys()-{"hash","vehicles","groups"}:self.assertEqual(a[k],b[k],k)
            # Same order and bytes of all geometry/inventory, save the empty
            # lift container's product name. Console is new study equipment.
            for ga,gb in zip(a["groups"],b["groups"]):
                if ga.get("vehicle")=="lift":
                    self.assertFalse(ga["parts"]);ga=dict(ga,name=gb["name"])
                self.assertEqual(ga,gb)
            self.assertEqual(len(a["groups"])+1,len(b["groups"]));self.assertNotIn("furniture",b["groups"][-1])
            self.assertEqual(a["vehicles"]["carport"],b["vehicles"]["carport"])
            self.assertEqual(b["vehicles"]["lift"]["mpn"],"RAV.509IF.196071")
            for token in [b"Twin Busch",b"twinbusch",b"v-len",b"sliding crosshead",b"telescopic runner",b"20.799 RON",b"Long divider"]:
                self.assertNotIn(token,raw)
            patt=rb'data:image/[^";]+;base64,[A-Za-z0-9+/=]+'
            self.assertEqual(re.findall(patt,before),re.findall(patt,raw))
            self.assertFalse(re.search(rb'<(?:img|script|iframe)\b[^>]+\bsrc=["\']https?://',raw,re.I))
            o.write_bytes(b"occupied")
            with self.assertRaises(ValueError):export(wall,o)
            self.assertEqual(o.read_bytes(),b"occupied")
