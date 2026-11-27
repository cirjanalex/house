"""Local metric, isolation, and deterministic export checks (no browser/network)."""
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from comparison_layer import PARENT, ROOT, export
from comparison_models import ac, caravan, dacia_mirrors, mercedes
from render import write_html
from vehicle_models import dacia, sudwind
from vehicles_layer import export as legacy_export


def bounds(parts):
    points=[v for p in parts for v in p["face"]]
    return [(min(v[i] for v in points),max(v[i] for v in points)) for i in range(3)]


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def scene(p):
    return json.loads(p.read_text("utf8").split('id="scene-data">',1)[1].split("</script>",1)[0])


class Comparison(unittest.TestCase):
    def assertSize(self,parts,dims):
        for (lo,hi),dim in zip(bounds(parts),dims):
            self.assertAlmostEqual(hi-lo,dim,6)
        for p in parts:
            self.assertEqual(len(p["indices"])%3,0)
            self.assertTrue(all(0<=i<len(p["face"]) for i in p["indices"]))

    def test_original_models_and_body_vs_deployed_width(self):
        s=mercedes();names={p["component"] for p in s}
        self.assertTrue({"long rear door glass","front door glass","fixed quarter pane","ribbed tail cluster",
                         "wide rectangular headlamp","alloy ventilation pockets","deployed mirror housing"}<=names)
        self.assertSize(s,[2.20,1.486,5.213])
        self.assertSize([p for p in s if 'mirror' not in p["component"]],[1.886,1.486,5.213])
        z=[v[2] for p in s if p["component"]=="tyre" for v in p["face"]]
        axles=[(min(zs)+max(zs))/2 for zs in ([i for i in z if i<0],[i for i in z if i>0])]
        self.assertAlmostEqual(axles[1]-axles[0],3.14)
        self.assertSize(dacia(),[1.635,1.435,4.345])
        self.assertSize(dacia()+dacia_mirrors(),[1.89,1.435,4.345])

    def test_ac_datums_and_legacy_extents(self):
        self.assertSize(ac(),[.702,.225,.752])
        self.assertSize(caravan(),[2.32,2.57,6.71])
        self.assertEqual([p for p in caravan() if p['component']!='touring body'],
                         [p for p in sudwind() if p['component']!='touring body'])
        roof=next(p for p in caravan() if p['component']=='touring body')
        for z in [-.2,1.14]:
            self.assertAlmostEqual(max(y for x,y,v in roof['face'] if v==z),2.55)
        self.assertAlmostEqual(max(y for x,y,z in roof['face']),2.57)
        config=json.loads((ROOT/'examples/house/lift-comparison.json').read_text('utf8'))['trailer']
        self.assertGreater(config['acZ']-config['acDepth']/2,-.2)
        self.assertLess(config['acZ']+config['acDepth']/2,1.14)
        self.assertAlmostEqual(config['acHeight']+config['skin'],2.775)

    def test_binding_and_frozen_recipe(self):
        architect=ROOT/'build/house-architect.html';parent=ROOT/'build/house-vehicles.html'
        candidate=ROOT/'build/house-lift-comparison.html'
        original=scene(parent);new=scene(candidate)
        self.assertEqual(digest(parent),PARENT)
        self.assertEqual(new['comparison']['parent_sha256'],PARENT)
        self.assertTrue(all(new[k]==v for k,v in original.items() if k not in ['styles','groups']))
        self.assertTrue(all(new['styles'][k]==v for k,v in original['styles'].items()))
        self.assertEqual([g for g in new['groups'] if g.get('vehicle') not in ('car','trailer')],
                         [g for g in original['groups'] if g.get('vehicle') not in ('car','trailer')])
        with TemporaryDirectory() as td:
            p=Path(td)/parent.name;c=Path(td)/candidate.name
            legacy_export(architect,p,write_html)
            self.assertEqual(digest(p),PARENT)
            export(p,c,write_html)
            self.assertEqual(digest(c),digest(candidate))
            for bad_source,bad_out in [(p,p),(architect,c),(c,c),(p,Path(td)/architect.name)]:
                with self.assertRaises(ValueError):export(bad_source,bad_out,lambda *args:self.fail("unsafe write"))

    def test_supplemental_scope_is_additive(self):
        scope=json.loads((ROOT/'examples/house/comparison-review-scope.json').read_text('utf8'))
        names=scope['required_stops'];self.assertEqual(len(names),len(set(names)))
        self.assertEqual(len(names),11)
        retained=json.loads((ROOT/'examples/house/vehicle-review-scope.json').read_text('utf8'))
        self.assertFalse(set(names)&set(retained['required_stops']))
