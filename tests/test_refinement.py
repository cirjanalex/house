import json
import math
import re
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from render import ROOT, build, read
from refined_layer import area


CASE=ROOT/"examples"/"house"


class HouseRefinement(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec=read(CASE/"refinement.json")
        with TemporaryDirectory() as tmp:
            p=Path(tmp); brief=p/"brief.json"; out=p/"out.html"
            brief.write_text(json.dumps(dict(approved=True,geometry_sha256=cls.spec["geometry_sha256"],style="compact")))
            args=(CASE/"geometry.json",out,CASE/"materials.json",CASE/"furniture.json",brief,CASE/"site.json")
            def payload():
                return json.loads(re.search(r'id="scene-data">(.*?)</script>',out.read_text(encoding="utf-8"))[1])
            build(*args);cls.original=payload()
            build(*args,CASE/"refinement.json");cls.refined=payload()

    def test_only_three_previous_placements_replaced(self):
        old,new=self.original,self.refined
        self.assertEqual(old["hash"],new["hash"])
        self.assertEqual(old["walk_starts"],new["walk_starts"])
        removed=[g for g in old["groups"] if g not in new["groups"]]
        self.assertCountEqual([g["room"] for g in removed],[r["name"] for r in self.spec["rooms"]])
        self.assertTrue(all(g["furniture"] and "VESKEN" in g["name"] for g in removed))
        added=[g for g in new["groups"] if g.get("furniture") and g not in old["groups"]]
        self.assertCountEqual([g["room"] for g in added],[g["room"] for g in removed])
        self.assertTrue(all(not g.get("sku") and not g.get("product") for g in added))

    def test_actual_closed_leaves_and_fixed_runs_cover_perimeter(self):
        r=self.refined["refined"]["lot"];self.assertAlmostEqual(area(r),1703,delta=.1)
        colliders=[]
        for g in self.refined["groups"]:
            for p in g["parts"]:
                if p["slot"]=="s_plinth":
                    w=max(v[0] for v in p["mesh"])-min(v[0] for v in p["mesh"])
                    x,_,z=p["at"]; ang=math.radians(p["yaw"]); d=.145
                elif p.get("door",{}).get("kind") in {"slider","gate"}:
                    x,_,z=p["box"];w,_,d=p["size"];ang=0
                else:continue
                colliders.append((x,z,math.cos(ang),math.sin(ang),w,d))
        def distance(u,v):
            return min(math.hypot(max(0,abs(c*(u-x)-s*(v-z))-w/2),max(0,abs(s*(u-x)+c*(v-z))-d/2))
                       for x,z,c,s,w,d in colliders)
        for (x,z),(X,Z) in zip(r,r[1:]+r[:1]):
            n=math.ceil(math.hypot(X-x,Z-z)/.08)
            for i in range(n+1):
                self.assertLess(distance(x+(X-x)*i/n,z+(Z-z)*i/n),.17)

    def test_wet_finish_footprints_and_openings(self):
        finish=[g for g in self.refined["groups"] if "ceramic floor and wall finish" in g["name"]]
        self.assertEqual(len(finish),3)
        for g,room in zip(finish,self.spec["rooms"]):
            floors=[[(p[0],p[2]) for p in part["face"]] for part in g["parts"] if part["slot"]=="b_tile"]
            self.assertAlmostEqual(sum(area(r) for r in floors),area(room["ring"]))
            self.assertTrue(all(len(p["face"])==4 for p in g["parts"]))
            if room["name"]=="En-suite bathroom":
                for ring in floors:
                    self.assertTrue(min(p[0] for p in ring)>=2.307 or min(p[1] for p in ring)>=1.717)
        # Probe the visible wall areas at a sill and inside each door, not only total floor area.
        for i,axis,wall,along,y in [(0,0,9.596,4.2,1.4),(0,0,7.679,4.71,.7),
                (1,2,2.971,2.77,.7),(1,2,1.7215,1.54,.7),(2,0,4.021,8.33,.7)]:
            for part in finish[i]["parts"]:
                pts=part["face"];h=y+self.spec["rooms"][i]["floor"]
                if all(abs(p[axis]-wall)<.001 for p in pts):
                    self.assertFalse(min(p[2-axis] for p in pts)<along<max(p[2-axis] for p in pts)
                        and min(p[1] for p in pts)<h<max(p[1] for p in pts))

    def test_fascia_does_not_follow_hips_or_span_window_faces(self):
        g=next(g for g in self.refined["groups"] if "folded eaves" in g["name"])
        for part in g["parts"]:
            if part["slot"]!="e_fascia":continue
            a,b,*_=part["face"]
            self.assertTrue(a[0]==b[0] or a[2]==b[2],"Diagonal hip mistaken for an exposed edge")
            self.assertTrue(min(p[1] for p in part["face"])>4.28)
            if a[2]==b[2]==-.28 and 4.1<(a[0]+b[0])/2<6.8:
                self.assertGreater(min(p[1] for p in part["face"]),3.15+2.30)


if __name__=="__main__":
    unittest.main()
