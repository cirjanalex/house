import hashlib
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from vehicle_models import dacia, sudwind
from vehicles_layer import PARENT, export


def ext(parts):
    points=[p for part in parts for p in part["face"]]
    return [(min(p[i] for p in points),max(p[i] for p in points)) for i in range(3)]


class VehicleGeometry(unittest.TestCase):
    def test_metric_extents_and_axles(self):
        for fn,whl in [(dacia,[1.635,1.435,4.345]),(sudwind,[2.32,2.57,6.71])]:
            parts=fn();ranges=ext(parts)
            for (lo,hi),size in zip(ranges,whl):self.assertAlmostEqual(hi-lo,size,6)
            self.assertEqual(ranges[1][0],0)
            for part in parts:
                self.assertTrue(all(0<=i<len(part["face"]) for i in part["indices"]))
        wheels=[p for p in dacia() if p["component"]=="tyre"]
        z=sorted(set(v[2] for p in wheels for v in p["face"]))
        rear=[u for u in z if u<0];front=[u for u in z if u>0]
        self.assertAlmostEqual((min(front)+max(front)-min(rear)-max(rear))/2,2.44)
        trailer=sudwind();body=ext([p for p in trailer if p["component"]=="touring body"])
        self.assertAlmostEqual(body[2][1]-body[2][0],5.35)
        self.assertLess(ext([p for p in trailer if p["component"]=="tyre"])[2][1],0)

    def test_binding_additive_and_deterministic(self):
        parent=ROOT/"build/house-architect.html";candidate=ROOT/"build/house-vehicles.html"
        self.assertEqual(hashlib.sha256(parent.read_bytes()).hexdigest(),PARENT)
        def data(p):
            return json.loads(p.read_text("utf-8").split('id="scene-data">',1)[1].split("</script>",1)[0])
        old,new=data(parent),data(candidate)
        self.assertTrue(all(v==new[k] for k,v in old.items() if k not in ("groups","styles")))
        self.assertTrue(all(v==new["styles"][k] for k,v in old["styles"].items()))
        n=len(old["groups"]);self.assertEqual(old["groups"],new["groups"][:n])
        self.assertEqual([g["vehicle"] for g in new["groups"][n:]],["car","trailer","lift"])
        def compare(_out,html):
            self.assertEqual(html.encode(),candidate.read_bytes())
        export(parent,candidate,compare)
        with self.assertRaises(ValueError):export(parent,parent,lambda *args:self.fail())
        with self.assertRaises(ValueError):export(candidate,candidate,lambda *args:self.fail())

    def test_review_scope(self):
        names=["review","refined-bath-review","refined-site-review","aligned-detail-review","aligned-access-review","vehicle-review"]
        counts=[]
        for n in names:
            s=json.loads((ROOT/"examples/house"/(n+"-scope.json")).read_text("utf-8"))["required_stops"]
            self.assertEqual(len(s),len(set(s)));counts.append(len(s))
        self.assertEqual(counts,[22,12,19,14,6,11])
