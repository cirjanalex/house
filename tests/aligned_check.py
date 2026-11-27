"""Verify the sheet-aligned HTML and its preserved inputs, not a visual verdict."""
import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
BASE={
    "house-refined":"083b7b0d94809e8fd15a70bf0933c073fd5c1957b30c4996a770fa5b20ebc47e",
    "furnished":"194893f51a537f34141df74511ae4319a9862427a22f34a0b12e4223ec00957f",
    "index":"d92d7e5c394a12a6c268c0ff198abb2a2373b7608ba46410171fc07041e6cb07",
    "landscaped":"6d1f36e49e8a8fadd24ffd1b0d09e478aec035d94419f538e741801a7825583b",
    "shell":"484e1833aab54c65e6fa48adfbbfb9e0c08ee701363ae5820e285eab55c0164f",
}


def scene(path):
    return json.loads(re.search(r'id="scene-data">(.*?)</script>',path.read_text("utf-8"),re.S)[1])


def bounds(g):
    xs=[];zs=[]
    for p in g["parts"]:
        a=math.radians(p.get("yaw",0));c,s=math.cos(a),math.sin(a)
        if "box" in p:
            x,_,z=p["box"];w,h,d=p["size"]
            points=[(u*w/2,v*d/2) for u in (-1,1) for v in (-1,1)]
        else:
            x,_,z=p["at"];points=[(u,v) for u,h,v in p["face"]]
        for u,v in points:xs.append(x+c*u+s*v);zs.append(z+c*v-s*u)
    return min(xs),max(xs),min(zs),max(zs)


def gap(a,b):
    return math.hypot(max(0,a[0]-b[1],b[0]-a[1]),max(0,a[2]-b[3],b[2]-a[3]))


def audit(path):
    for n,h in BASE.items():assert sha256((ROOT/"build"/(n+".html")).read_bytes()).hexdigest()==h,n
    data=scene(path);old=scene(ROOT/"build/house-refined.html")
    assert data["aligned"]["id"]=="house-aligned-v1" and data["hash"]==old["hash"]
    assert data["walk_starts"]==old["walk_starts"] and data["refined"]==old["refined"]
    keep=lambda g:g.get("site") or g.get("roof") or g.get("room") in ("En-suite bathroom","Family bathroom","Ground-floor WC") \
        or any(g["name"].startswith(r+" ·") for r in ("En-suite bathroom","Family bathroom","Ground-floor WC"))
    assert all(g in data["groups"] for g in old["groups"] if keep(g)),"Changed accepted fence, roof or wet-room geometry"
    kitchen=[g for g in data["groups"] if g.get("room")=="Kitchen and dining"]
    sweeps=[
        ("Sink, draining and landing space below window",(1.13228,1.693632,11.632205,12.1877),(1.53,11.43)),
        ("Sink, draining and landing space below window",(1.67828,2.239632,11.632205,12.1877),(1.46,11.84)),
        ("Sink, draining and landing space below window",(2.22428,2.785632,11.632205,12.1877),(2.0,11.82)),
        ("Hob and oven beside preparation surface",(1.0115,1.767001,11.4402,12.0198),(1.99,11.8)),
        ("Preparation and dry storage",(1.016025,1.58,10.803646,11.389687),(1.55,11.60))]
    margins=[]
    for host,sweep,(x,z) in sweeps:
        original,=[g for g in old["groups"] if g.get("use")==host]
        assert original in kitchen,"Retest host axes and geometry: "+host
        clearance=min(gap(sweep,bounds(g)) for g in kitchen if g!=original)
        assert clearance>0,(host,clearance)
        assert gap(sweep,(x,x,z,z))>.17 and min(gap(bounds(g),(x,x,z,z)) for g in kitchen)>.17
        margins.append(round(clearance,4))
    for now,accepted in zip(margins,[.09228,.102206,.102206,.037999,.040313]):
        assert now+.00006>=accepted,"Lost previously checked kitchen working clearance"
    for g in data["groups"]:
        if g.get("furniture"):
            assert g["size"] and g["use"] and g["room"],g["name"]
            if g.get("sku"):assert any((g["sku"],g["product"],g["size"])==(h.get("sku"),h.get("product"),h.get("size"))
                                      for h in old["groups"]),"Unverified product dimensions"
    chairs=[g for g in data["groups"] if g.get("use")=="Outdoor dining chair"]
    assert len(chairs)==6 and len({tuple(bounds(g)) for g in chairs})==6
    fabrics=[next(p for p in g["parts"] if p["slot"]=="a_canvas") for g in data["groups"] if g.get("canopyState")]
    assert len(fabrics)==2
    def sheet_metrics(p):
        vs=p["face"]
        return (max(v[2] for v in vs)-min(v[2] for v in vs),
                sum(math.dist(vs[i],vs[i+3]) for i in range(0,len(vs),4)))
    (wide,arc),(park,fold)=sorted(map(sheet_metrics,fabrics),reverse=True)
    assert wide>3.5 and .35<park<.55 and abs(arc-fold)<.004,(wide,arc,park,fold)
    return dict(candidate=sha256(path.read_bytes()).hexdigest(),protected_html_sha256=BASE,
                fixtures_and_enclosure_preserved=True,kitchen_sweep_clearances_m=margins,
                shade_coverage_m=[wide,park],room_items=sum(bool(g.get("furniture")) for g in data["groups"]))


if __name__=="__main__":
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument("html",type=Path)
    print(json.dumps(audit(ap.parse_args().html),indent=2))
