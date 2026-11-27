import copy
import json
import math
from pathlib import Path
import re
from tempfile import TemporaryDirectory
import unittest

from geometry import compile_scene, digest, face_parts, roof_parts
from layers import furniture, obj_mesh
from render import ROOT, build, concept, read

CASE = ROOT/"examples"/"house"


class PipelineTests(unittest.TestCase):
    def test_alignment_refuses_stale_furniture_and_protected_output(self):
        from unittest.mock import patch
        from aligned_layer import align
        from render import ROOT
        placements=read(CASE/"furniture.json")
        placements["items"][0]["at"][0]+=.10
        with self.assertRaisesRegex(ValueError,"different source revision"):
            align(read(CASE/"alignment.json"),{},[],{},placements["geometry_sha256"],
                  placements,read(CASE/"refinement.json"),read(CASE/"site.json"),CASE,{})
        (ROOT/".work").mkdir(exist_ok=True)
        with TemporaryDirectory(dir=ROOT/".work") as tmp, patch("render.ROOT",Path(tmp)):
            protected=Path(tmp)/"build"/"house-refined.html";protected.parent.mkdir();protected.write_bytes(b"kept")
            with self.assertRaisesRegex(ValueError,"new output"):
                build(CASE/"geometry.json",protected,alignment=CASE/"alignment.json")
            self.assertEqual(protected.read_bytes(),b"kept")

    def test_footprint_and_openings(self):
        scene = read(CASE/"geometry.json")
        p = scene["groups"][1]["elements"][0]["slab"]
        area = abs(sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(p,p[1:]+p[:1])))/2
        self.assertAlmostEqual(area, 139.2, delta=.1)
        wall = scene["groups"][2]["elements"][0]
        wall["openings"][1][0] = wall["openings"][0][0]
        with self.assertRaisesRegex(ValueError, "overlaps"):
            compile_scene(scene)

    def test_dormer_cut_removes_area_and_preserves_slope(self):
        pieces = roof_parts([[0,0,0],[4,0,0],[4,2,4],[0,2,4]], [[1,-1,3,2]])
        area = 0
        for tri in pieces:
            for _, y, z in tri:
                self.assertAlmostEqual(y,z/2)
            (x,_,z),(a,_,b),(c,_,d) = tri
            area += abs((a-x)*(d-z)-(c-x)*(b-z))/2
        self.assertAlmostEqual(area, 12)

    def test_new_pdf_handoff_then_exact_rebuild(self):
        import pypdfium2 as pdfium
        with TemporaryDirectory() as tmp:
            root=Path(tmp); pdf=root/"input.pdf"; work=root/"work"; site=root/"site.html"
            doc=pdfium.PdfDocument.new(); page=doc.new_page(120,100); page.close(); doc.save(pdf); doc.close()
            handoff=concept(pdf,work,site)
            self.assertEqual(handoff["status"],"needs_geometry")
            self.assertFalse(site.exists())
            self.assertTrue((Path(handoff["evidence"])/"page-01.png").exists())
            scene=read(CASE/"geometry.json"); scene["source_sha256"]=handoff["source_sha256"]
            manifest=Path(handoff["write_manifest"]); manifest.write_text(json.dumps(scene),encoding="utf-8")
            first=concept(pdf,work,site)
            self.assertEqual(first["status"],"exported")
            original=site.read_bytes(); self.assertEqual(concept(pdf,work,site),first)
            self.assertEqual(original,site.read_bytes())
            scene["source_sha256"]="wrong"; manifest.write_text(json.dumps(scene),encoding="utf-8")
            with self.assertRaisesRegex(ValueError,"another PDF"):
                concept(pdf,work,site)

    def test_lining_follows_pitch_then_flattens_without_sealing_window(self):
        parts=face_parts({"face":[[0,4,0],[4,6,0],[4,6,3],[0,4,3]],
                          "rooflights":[[1,.5,2,2.5]],"lining":{"drop":.4,"cap":4.7,"bounds":[0,0,4,3]}},
                         {},0,"roof")
        ceiling=[p["face"] for p in parts if p.get("overhead")]
        area=0
        for (x,y,z),(a,b,c),(d,e,f) in ceiling:
            self.assertLessEqual(max(y,b,e),4.7)
            area+=abs((a-x)*(f-z)-(c-z)*(d-x))/2
        self.assertAlmostEqual(area,10)
        self.assertTrue(any(all(abs(p[1]-4.7)<1e-8 for p in face) for face in ceiling))
        self.assertTrue(any(min(p[1] for p in face)<3.61 for face in ceiling))
        self.assertEqual(len([p for p in parts if p["slot"]=="skylight"]),1)

    def test_exact_height_opening_is_fitted_only_above_the_head(self):
        wall = {"wall":[[0,0],[4,0]],"base":3,"t":.16,"h":2.1,"openings":[[1,1,0,2.1,"door","start+"]]}
        roof = {"face":[[-1,5.3,-1],[5,6.5,-1],[5,6.5,1],[-1,5.3,1]],
                "lining":{"drop":.4,"cap":9,"bounds":[-1,-1,5,1]}}
        group = {"level":0,"basis":"inferred","pages":[1]}
        scene = {"version":1,"units":"m","levels":["Floor"],"sheets":{"1":"Section"},"focus":[0,3,0],"viewDistance":10,
                 "groups":[dict(group,name="Wall",slot="partition",meet_ceiling=True,elements=[wall]),
                           dict(group,name="Pitch",slot="roof",roof=True,elements=[roof])]}
        def pieces():
            return compile_scene(scene)[0]["parts"]
        def lintels(parts):
            return [p for p in parts if p["slot"]=="partition" and abs(p["box"][0]-1.5)<1e-8]

        parts=pieces()
        head,=lintels(parts)
        vertices=[(head["box"][0]+x,head["box"][1]+y,z) for x,y,z in head["profile"]]
        self.assertAlmostEqual(min(y for x,y,z in vertices),5.1)
        for end in (1,2):
            self.assertAlmostEqual(max(y for x,y,z in vertices if abs(x-end)<1e-8),5.1+.2*end)
        leaf,=[p for p in parts if "door" in p]
        self.assertLess(leaf["box"][1]+leaf["size"][1]/2,5.1)
        roof["lining"]["cap"]=5.1
        self.assertFalse(lintels(pieces()))  # A genuinely flush head needs no filler.

    def test_splayed_head_opens_lining_not_roof_covering(self):
        group={"lining":{"drop":.48,"cap":9,"bounds":[0,0,4,3],"head_run":.3}}
        for h0,h1 in [(4,6),(6,4)]:
            parts=face_parts({"face":[[0,h0,0],[4,h1,0],[4,h1,3],[0,h0,3]],
                              "rooflights":[[1,.5,2,2.5]]},group,0,"roof")
            def area(parts):
                return sum(abs(sum(p[0]*q[2]-q[0]*p[2] for p,q in zip(f,f[1:]+f[:1])))/2
                           for f in (p["face"] for p in parts))
            self.assertAlmostEqual(area([p for p in parts if p["slot"]=="roof"]),10)
            self.assertAlmostEqual(area([p for p in parts if p.get("overhead")]),9.4)
            self.assertTrue(any(max(v[1] for v in p["face"])-min(v[1] for v in p["face"])<1e-8
                                and area([p])>0 for p in parts if p["slot"]=="ceiling" and not p.get("overhead")))

    def test_layer_binding_and_asset_tamper(self):
        geometry=CASE/"geometry.json"; scene=read(geometry); shell=digest(scene)
        brief={"approved":True,"geometry_sha256":shell,"style":"oak"}
        layer={"geometry_sha256":shell,"items":[{"name":"Table","kind":"table","at":[2,0,11],"size":[1.2,.75,.8],"level":0}]}
        self.assertTrue(furniture(layer,brief,CASE,shell,2)[0][0]["furniture"])
        with self.assertRaisesRegex(ValueError,"approval"):
            furniture(layer,dict(brief,approved=False),CASE,shell,2)
        with self.assertRaisesRegex(ValueError,"approval"):
            furniture(layer,brief,CASE,digest(dict(scene,title="Revision")),2)
        with TemporaryDirectory() as tmp:
            dest=Path(tmp)/"scene.html"
            materials=copy.deepcopy(read(CASE/"materials.json"))
            materials["render"]["texture"]["sha256"]="0"*64
            from layers import materials as load
            with self.assertRaisesRegex(ValueError,"hash mismatch"):
                load(materials,CASE,set(materials))
            self.assertEqual(build(geometry,dest,CASE/"materials.json")["geometry_sha256"], shell)

    def test_obj_negative_indices_and_floor_anchor(self):
        data=b"v 5 4 1\nv 7 4 1\nv 6 6 2\nf -3 -2 -1"
        verts,indices=obj_mesh(data,[1,2,3])
        self.assertEqual(indices,[0,1,2])
        self.assertEqual(min(v[1] for v in verts),0)
        self.assertEqual(max(v[1] for v in verts),2)

    def test_site_is_repeatable_additive_and_bound_to_shell(self):
        from site_layer import site_layer
        scene, manifest = read(CASE/"geometry.json"), read(CASE/"site.json")
        with self.assertRaisesRegex(ValueError, "another geometry"):
            site_layer(manifest, digest(dict(scene, grade=0)), 0)
        def payload(path):
            return json.loads(re.search(r'id="scene-data">(.*?)</script>',path.read_text(encoding="utf-8"))[1])
        with TemporaryDirectory() as work:
            a,b = (Path(work)/name for name in ("house.html","garden.html"))
            build(CASE/"geometry.json",a,CASE/"materials.json")
            def garden():
                build(CASE/"geometry.json",b,CASE/"materials.json",site=CASE/"site.json")
                return b.read_bytes()
            self.assertEqual(garden(),garden())
            shell,site = payload(a),payload(b)
            self.assertEqual(shell["groups"],[g for g in site["groups"] if not g.get("site")])
            self.assertEqual(shell["walk_starts"],site["walk_starts"][:-1])
            self.assertEqual(shell["hash"],site["hash"])
            self.assertEqual(shell["styles"],{k:site["styles"][k] for k in shell["styles"]})

    def house_kitchen(self):
        layout=read(CASE/"furniture.json")
        layout["items"]=[i for i in layout["items"] if i["room"]=="Kitchen and dining"]
        shell=layout["geometry_sha256"]
        groups,_=furniture(layout,{"approved":True,"geometry_sha256":shell,"style":"compact"},CASE,shell,2)
        return [(i["ref"],g) for i,g in zip(layout["items"],groups)]

    def test_sink_fronts_can_swing_past_the_cooker_and_seats(self):
        kitchen=self.house_kitchen()
        sink=next(g for ref,g in kitchen if ref=="generic-sink")
        def plan(p):
            x,_,z=p["box"]; w,_,d=p["size"]; yaw=math.radians(p.get("yaw",0))
            a,b=abs(math.cos(yaw)),abs(math.sin(yaw))
            dx,dz=(a*w+b*d)/2,(b*w+a*d)/2
            return x-dx,x+dx,z-dz,z+dz
        center_z=min(plan(p)[2] for p in sink["parts"])+sink["size"][2]/2
        fronts=[p for p in sink["parts"] if p["size"][1]>.4 and p["size"][2]<.04
                and p["size"][0]>.25 and p["box"][2]<center_z]
        pulls=[p for p in sink["parts"] if p["slot"]=="f_metal" and plan(p)[3]<center_z]
        unhandled=[]; used=[]
        for leaf in fronts:
            x0,x1,z0,z1=plan(leaf)
            matching=[p for p in pulls if x0<plan(p)[0]<plan(p)[1]<x1]
            if not matching:
                unhandled.append(leaf)
                continue
            self.assertEqual(len(matching),1)
            grip=matching[0]; used.append(grip)
            self.assertTrue(.40<x1-x0<.65,f"Impractical {x1-x0:.3f} m handled leaf")
            self.assertGreater(grip["box"][0],leaf["box"][0])  # Free end, not the hinge.
            projection=z0-plan(grip)[2]
            self.assertGreater(projection,0)
            # Contains the leaf AND pull throughout a continuous 90° turn about (x0,z0).
            left=x0-projection; right=x0+math.hypot(x1-x0,z1-z0)
            near=z0-math.hypot(x1-x0,projection)
            for ref,other in kitchen:
                if other is sink: continue
                for p in other["parts"]:
                    a,b,c,d=plan(p)
                    self.assertTrue(b<left or a>right or d<near or c>z1,
                                    f"Sink door at {x0:.3f} lacks a clear swing past {ref}")
        self.assertCountEqual(used,pulls)
        self.assertGreaterEqual(len(used),2)
        self.assertEqual(unhandled,[min(fronts,key=lambda p:plan(p)[0])],"Only the cooker return is fixed")

    def test_four_cooking_zones_sit_above_deck_inside_cooker_envelope(self):
        cooker=next(g for ref,g in self.house_kitchen() if ref=="generic-cooker")
        def top(p): return p["box"][1]+p["size"][1]/2
        deck=max((p for p in cooker["parts"] if p["slot"]=="f_ink"),key=top)
        zones=[p for p in cooker["parts"] if p["slot"]=="f_metal" and p.get("corner_radius")]
        self.assertEqual(len(zones),4)
        self.assertEqual(len({(p["box"][0],p["box"][2]) for p in zones}),4)
        for p in zones:
            self.assertGreater(top(p)-top(deck),.001)
            self.assertAlmostEqual(top(p)-p["size"][1],top(deck))
            self.assertAlmostEqual(top(p),cooker["size"][1])

    def test_catalog_proxies_match_their_measured_local_envelopes(self):
        catalog=read(CASE/"furniture-inventory.json")["entries"]
        shell=digest(read(CASE/"geometry.json"))
        brief={"approved":True,"geometry_sha256":shell,"style":"compact"}
        layer={"geometry_sha256":shell,"catalog":"furniture-inventory.json",
               "items":[{"ref":key,"at":[1,3,2],"yaw":30,"level":1} for key in catalog]}
        groups,_=furniture(layer,brief,CASE,shell,2)
        c,s=math.cos(math.pi/6),math.sin(math.pi/6)
        for g,entry in zip(groups,catalog.values()):
            with self.subTest(entry=entry["name"]):
                bounds=[[],[],[]]
                for part in g["parts"]:
                    x,y,z=part["box"]
                    for axis,(center,length) in enumerate(zip((c*(x-1)-s*(z-2), y-3, s*(x-1)+c*(z-2)),part["size"])):
                        bounds[axis].extend((center-length/2,center+length/2))
                for axis,span in enumerate(entry["size"]):
                    self.assertAlmostEqual(max(bounds[axis])-min(bounds[axis]),span,places=6)
                self.assertAlmostEqual(min(bounds[1]),0)
                self.assertIn("PROXY",g["name"])
        layer["items"][0]["size"]=[1,1,1]
        with self.assertRaisesRegex(ValueError,"override"):
            furniture(layer,brief,CASE,shell,2)
