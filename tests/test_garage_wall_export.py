import hashlib
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
import unittest

from render_garage_wall import export, ROOT, NAME, PARENT


class GarageWallExport(unittest.TestCase):
    def test_binding_scope_and_privacy(self):
        parent=ROOT/"build/house-lift-adjustable.html"
        before=parent.read_bytes()
        def data(raw):return json.loads(raw.split(b'id="scene-data">',1)[1].split(b"</script>",1)[0])
        with TemporaryDirectory() as folder:
            dest=Path(folder)/NAME
            for src,out in [(parent,parent),(ROOT/"build/house-lift-comparison.html",dest)]:
                with self.assertRaises(ValueError):export(src,out)
            self.assertFalse(dest.exists());h=export(parent,dest)
            raw=dest.read_bytes();self.assertEqual(export(parent,dest),h)
            self.assertEqual(hashlib.sha256(raw).hexdigest(),h)
            self.assertEqual(h,"928ea25b589ae83d131ecb20ec8b70a587786279d57b8bfd63069dc050a55250")
            self.assertEqual(hashlib.sha256(parent.read_bytes()).hexdigest(),PARENT)
            self.assertEqual(re.findall(rb'data:image/[^";]+;base64,[A-Za-z0-9+/=]+',before),
                             re.findall(rb'data:image/[^";]+;base64,[A-Za-z0-9+/=]+',raw))
            old,new=data(before),data(raw)
            self.assertNotEqual(old["hash"],new["hash"])
            for k in ["comparison","vehicles","architect","styles","credits","walk_starts"]:
                self.assertEqual(old[k],new[k])
            def grp(d):return {g["name"]:g for g in d["groups"]}
            a,b=grp(old),grp(new)
            removed,=a.keys()-b.keys()
            self.assertIn("Long divider",removed)
            self.assertFalse(b.keys()-a.keys())
            self.assertCountEqual([k.split(" ·")[0] for k in b if b[k]!=a[k]],
                                  ["Attached annex","Hobby","OMAR galvanised storage rack"])
            for k in [b"Long divider",b"sets.divider",b"added central storage",b"divider.children"]:
                self.assertNotIn(k,raw)
            old_f=[g["use"] for g in a.values() if g.get("furniture") and g["name"]!=removed]
            self.assertCountEqual(old_f,[g["use"] for g in b.values() if g.get("furniture")])
            old_annex=next(g for k,g in a.items() if k.startswith("Attached annex"))["parts"]
            new_annex=next(g for k,g in b.items() if k.startswith("Attached annex"))["parts"]
            self.assertEqual([i for i,p in enumerate(old_annex) if p!=new_annex[i]],[1,15,16,17,29])
            self.assertEqual(len(new_annex)-len(old_annex),2)
            dest.write_bytes(b"other")
            with self.assertRaises(ValueError):export(parent,dest)
            self.assertEqual(dest.read_bytes(),b"other")
