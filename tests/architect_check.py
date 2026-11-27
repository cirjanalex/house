"""Reproduce the two regression witnesses and matched local model photos; no review verdict."""
import argparse
from collections import Counter
import hashlib
import html
import json
from pathlib import Path
import re
from PIL import Image, ImageChops, ImageStat

from aligned_check import ROOT, audit, scene
from alignment_probe import observe

PARENT=ROOT/"build/house-aligned.html"
TESTS=Path(__file__).resolve().parent
OLD="854f8ea487d71787c1a2d25c19a05c31ecded3479e4b2f7d4b2b7475e37502b2"
VIEWS={
    "08-west-gable":"view 8 · West gable, both vertical lights and planted path",
    "07-west-elevation":"p.7 / 07–view 8 · Square to the two workshop openings",
    "08-garage-inside":"p.1 / view 8 · Both lights from inside the attached garage",
    "01-front-court":"view 1 · Arrival, house and attached workshop",
    "09-annex-entry":"view 9 · Sectional door and glazed pedestrian entrance",
    "02-east-side":"02 / view 3 · Side pergola and retained east elevation",
    "06-hobby-and-terrace":"06 / view 7 · Broad hobby light (not a west window) and dining terrace",
    "04-rear-corner":"03 / 04 / view 4 · Living projection, blinds and terrace corner",
    "013-living-to-kitchen":"view 13 · Sectional, lighting, pantry return and peninsula",
    "014-kitchen-to-garden":"view 14 · Kitchen looking toward the garden window board",
    "hall-report-open":"User's screenshot · From inner hall, front door open",
    "hall-report-shut":"Same user-screenshot camera · Front door closed",
    "hall-from-entrance-open":"p.1 · Coat and cubby fronts from the entrance, door open",
    "hall-from-entrance-shut":"p.1 · Coat and cubby fronts from the entrance, door closed",
}


def load(file):
    return json.loads(file.read_text("utf-8"))


def capture(browser,candidate,out):
    for build,name in [(PARENT,"before"),(candidate,"after")]:
        observe(browser,build,TESTS/"architect_views.js",out/name)
    for label,expected in [("openings","rough opening height"),("hall","Back not flush")]:
        probe=TESTS/f"architect_{label}.js"
        observe(browser,candidate,probe,out/label)
        try:observe(browser,PARENT,probe,out/("old-"+label))
        except ValueError as exc:
            if expected not in str(exc):raise
        else:raise AssertionError(f"Old export incorrectly accepted: {label}")


def summary(candidate,out):
    base=scene(PARENT);new=scene(candidate);h=hashlib.sha256(candidate.read_bytes()).hexdigest()
    assert hashlib.sha256(PARENT.read_bytes()).hexdigest()==new["architect"]["parent_sha256"]==OLD
    identical=set(base)-{"groups","styles"}
    assert all(base[k]==new[k] for k in identical)
    assert all(new["styles"][k]==v for k,v in base["styles"].items())
    maps=lambda p:Counter(re.findall(rb'data:image/[^;"\s]+;base64,[A-Za-z0-9+/=]+',p.read_bytes()))
    assert maps(PARENT)==maps(candidate),"Unexpected embedded image asset"
    changed=[g for g in base["groups"] if g not in new["groups"]]
    allowed=("Ground footprint","Site paving and terrace","West entrance · masonry side parapet",
             "Ground envelope","Attached annex","Timber pergolas","Living · practical","Terrace · glulam ledger",
             "Annex and living projection","Annex · multi-light bars","West annex gable","Annex · painted inner pitches")
    uses={"Coat storage","Low bag and shoe cubbies","Wall-side workbench outside the vehicle bay",
          "L sectional, west return","Low rounded coffee table"}
    assert all(g["name"].startswith(allowed) or g.get("use") in uses for g in changed),"Unrelated group changed"
    inventory=lambda g:Counter((i["room"],i["use"],i.get("sku"),i.get("product")) for i in g if i.get("furniture"))
    assert inventory(base["groups"])==inventory(new["groups"])
    get=lambda s,k:load(out/s/"probe.json")[k]
    for name in ("before","old-hall","old-openings"):assert get(name,"build_sha256")==OLD
    for name in ("after","hall","openings"):assert get(name,"build_sha256")==h and not get(name,"errors")
    assert any("rough opening height" in e for e in get("old-openings","errors"))
    assert abs(get("old-openings","measurements")["windows"][0]["height"]-1.50)<.00015
    assert any("Coat storage" in e and "Low bag and shoe cubbies" in e for e in get("old-hall","errors"))
    before=get("before","measurements");after=get("after","measurements")
    assert before["cameras"]==after["cameras"] and set(VIEWS)==set(after["cameras"])
    for state,picks in before["hallPicks"].items():
        assert picks["panel"]["group"].startswith("Coat storage") and picks["upper-leaf"]["slot"]=="a_panel"
        assert picks["cubbies"]["group"].startswith("KALLAX")
        assert after["hallPicks"][state]["panel"]["slot"]!="a_ash"
    cards=[]
    for key,label in VIEWS.items():
        pair=[]
        for side in ("before","after"):
            src=f"{side}/{key}.jpg"
            assert (out/src).read_bytes()[:3]==b"\xff\xd8\xff"
            pair.append(f'<figure><figcaption>{side.upper()}</figcaption><a href="{src}"><img src="{src}"></a></figure>')
        cards.append(f"<h2>{html.escape(label)}</h2><section>{''.join(pair)}</section>")
    (out/"comparison.html").write_text("""<!doctype html><meta charset="utf-8"><title>House · model comparisons</title>
<style>body{background:#f4f2eb;color:#28261f;font:16px system-ui;max-width:1600px;margin:2em auto;padding:0 1em}
section{display:flex;gap:12px}figure{margin:0;flex:1}img{width:100%;height:auto}figcaption{font-size:.8em}</style>
<h1>House · model before and after</h1><p>Both columns show original WebGL models, not the architect’s pictures.
Identical cameras, furnished, practicals on, canopy parked. Reference filenames identify the design evidence.
Supplemental fixed views, not substitutes for the continuous 1.80 m walks or independent review.</p>"""+
        f"<p>Before: {OLD}<br>After: {h}</p>"+"".join(cards),"utf-8")
    record=dict(candidate=str(candidate.resolve()),sha256=h,parent_sha256=OLD,inherited=audit(candidate),
                unchanged_parent_groups=len(base["groups"])-len(changed),changed_parent_groups=[g["name"] for g in changed],
                original_approval_bindings=new["aligned"]["bindings"],unchanged_embedded_images=True,
                garage=get("openings","measurements"),hall=get("hall","measurements"),
                negative_controls={s:get("old-"+s,"errors") for s in ("openings","hall")},
                views=len(VIEWS),comparison=str((out/"comparison.html").resolve()))
    (out/"builder-check.json").write_text(json.dumps(record,indent=2),"utf-8")
    print(out/"builder-check.json")


def compare_routes(candidate,prior,current,out):
    h=hashlib.sha256(candidate.read_bytes()).hexdigest();report={}
    for route,old_name,scope in [("interior","interior","review-scope"),("baths","bathrooms","refined-bath-review-scope"),
            ("site","exterior","refined-site-review-scope"),("details","details","aligned-detail-review-scope"),
            ("access","access","aligned-access-review-scope")]:
        a,b=prior/old_name,current/route
        older,newer=[load(p/"evidence.json") for p in (a,b)]
        assert older["build_sha256"]==OLD and newer["build_sha256"]==h
        required=load(ROOT/"examples"/"house"/(scope+".json"))["required_stops"]
        counts=newer["room_views"]
        assert counts==older["room_views"] and set(counts)==set(required) and set(counts.values())=={4}
        assert older["returned_to_start"] and newer["returned_to_start"]
        poses=[load(p/"inspection.json")["inspection"]["eyeMeasurements"] for p in (a,b)]
        assert poses[0]==poses[1],"Changed supported walking poses: "+route
        samples={}
        for path in sorted(b.glob("view-*.jpg")):
            with Image.open(path) as new,Image.open(a/path.name) as old:
                diff=ImageChops.difference(old,new)
                samples[path.stem]=round(sum(ImageStat.Stat(diff).mean)/3,5)
        assert len(samples)==len(counts)*4
        report[route]=dict(scope=scope,stops=len(counts),views=len(samples),same_supported_eyes=True,
                exact_pixel_matches=sum(v==0 for v in samples.values()),gallery_sha256=newer["gallery_sha256"],
                mean_absolute_rgb_difference_0_to_255=samples)
    (out/"route-comparison.json").write_text(json.dumps(dict(parent=OLD,candidate=h,routes=report),indent=2),"utf-8")
    print(out/"route-comparison.json")


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("browser");p.add_argument("html",type=Path)
    p.add_argument("--evidence-dir",required=True,type=Path);p.add_argument("--summarize",action="store_true",
        help="Use complete local probe results captured at this hash instead of running the browser again")
    p.add_argument("--routes",type=Path,help="Completed candidate five-route directory")
    p.add_argument("--parent-routes",type=Path,help="Archived aligned five-route directory (read-only)")
    a=p.parse_args()
    if bool(a.routes)!=bool(a.parent_routes):p.error("Provide both route directories for a visual diff")
    if not a.summarize:capture(a.browser,a.html,a.evidence_dir)
    summary(a.html,a.evidence_dir)
    if a.routes:compare_routes(a.html,a.parent_routes,a.routes,a.evidence_dir)
