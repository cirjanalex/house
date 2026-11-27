"""Local agent-facing CLI. All build operations are offline."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.error import URLError

import assets
from geometry import compile_scene, digest, number, require, vector
from layers import furniture, materials

ROOT = Path(__file__).resolve().parent


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def build(geometry, output, material=None, furnishing=None, brief=None, site=None, refinement=None, alignment=None):
    if alignment:
        protected={ROOT/"build"/(n+".html") for n in ("index","shell","furnished","landscaped","house-refined")}
        require(Path(output).resolve() not in protected,"Choose a new output for the alignment variant")
    scene = read(geometry)
    groups = compile_scene(scene)
    shell_hash = digest(scene)
    slots = {part[k] for group in groups for part in group["parts"]
             for k in ("slot","edge_slot","soffit_slot") if k in part}
    styles, credits = materials(read(material), Path(material).parent, slots) if material else ({}, [])
    require(bool(furnishing) == bool(brief), "Supply --furniture and --brief together")
    if furnishing:
        more, provenance = furniture(read(furnishing), read(brief), Path(furnishing).parent,
                                     shell_hash, len(scene["levels"]))
        groups.extend(more)
        credits.extend(provenance)
    data = {k: scene[k] for k in ("title", "notes", "sheets", "focus", "viewDistance", "levels")}
    data["walk_starts"] = scene.get("walk_starts", [])
    if "grade" in scene:
        data["grade"]=number(scene["grade"])
    if site:
        from site_layer import site_layer
        require("grade" in data, "A site layer requires a defined exterior grade")
        extra, palette, start, notes = site_layer(read(site), shell_hash, data["grade"])
        require(not palette.keys() & styles.keys(), "Site palette must not override building finishes")
        groups.extend(extra)
        styles.update(palette)
        data["walk_starts"] = [*data["walk_starts"], start]
        data["notes"] = [*data["notes"], *notes]
    if refinement:
        from refined_layer import refine
        require(site and furnishing, "Refinements require the furnished site and its approved brief")
        refine(read(refinement), read(site), shell_hash, data, groups, styles, scene)
    if alignment:
        from aligned_layer import align
        require(refinement, "Alignment requires the furnished refined revision")
        align(read(alignment), data, groups, styles, shell_hash, read(furnishing), read(refinement),
              read(site), Path(furnishing).parent, read(brief))
    for start in data["walk_starts"]:
        vector(start["xz"], 2)
        number(start["floor"]); number(start["heading"])
        require(start["name"], "Name each walk starting point")
    data.update(groups=groups, hash=shell_hash, styles=styles, credits=credits)
    require((assets.VENDOR/"three.min.js").exists(), "Run `python render.py bootstrap` once, then build offline")
    web = ROOT/"web"
    # Emit the original walking constants byte-for-byte for historical exports.
    # Only the aligned viewer opts into the measured eye/head contract.
    tokens = {"@eye@": ("1.62","WALK_BODY.eye"), "@head@": ("1.72","WALK_BODY.head"),
              "@headStop@": ("1.722","(WALK_BODY.head+.002)"),
              "@near@": ("","camera.near=walking?WALK_BODY.near:.08;"),
              "@caption@": ("Walking · eye level","Walking · eye 1.80 m above feet"),
              "@surface@": ("f.top","(f.heightAt?f.heightAt(x,z):f.top)"),
              "@space@": ("WalkSpace","AlignedWalkSpace"),
              "@hobbyBound@": ("t","z.name==='Hobby'?t-.001:t"),
              "@roofAt@": ("roof(pos.x,pos.z)","WALK_BODY.roofAt(roof,pos.x,pos.z)"),
              "@moveAt@": ("at(x,z)","WALK_BODY.roofAt(at,x,z)")}
    def script(file):
        js=(web/file).read_text(encoding="utf-8")
        for token,(legacy,aligned) in tokens.items():
            js=js.replace(token,aligned if alignment else legacy)
        return js
    template = (web/"index.html").read_text(encoding="utf-8")
    replacements = {"STYLE": (web/"viewer.css").read_text(encoding="utf-8"),
                    "LICENSE": (assets.VENDOR/"LICENSE").read_text(encoding="utf-8"),
                    "ENGINE": (assets.VENDOR/"three.min.js").read_text(encoding="utf-8"),
                    "SCENE": json.dumps(data, allow_nan=False, separators=(",", ":")).replace("<", "\\u003c"),
                    "WALK": (script("aligned-body.js")+"\n" if alignment else "")+script("walk.js")
                            +("\n"+script("aligned-ground.js") if alignment else ""),
                    "VIEWER": script("viewer.js").replace(
                        "/*SITE_CONTROLS*/", "".join("\n"+script(file)
                            for enabled,file in [(site,"site.js"),(refinement,"refined.js"),(alignment,"aligned.js")] if enabled))}
    html = re.sub(r"@@([A-Z]+)@@", lambda m: replacements[m[1]], template)
    write_html(output, html)
    return {"output": str(Path(output).resolve()), "geometry_sha256": shell_hash,
            "groups": len(groups), "furnished": bool(furnishing)}


def write_html(output, html):
    output = Path(output)
    require(output.suffix.lower() == ".html", "Output must be an .html file")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n", delete=False,
                                     dir=output.parent) as tmp:
        temp = Path(tmp.name)
        try:
            tmp.write(html)
        except OSError:
            tmp.close()
            temp.unlink(missing_ok=True)
            raise
    try:
        os.replace(temp, output)
    finally:
        temp.unlink(missing_ok=True)


def concept(pdf, work, output, material=None, furnishing=None, brief=None, site=None, refinement=None, alignment=None):
    """Reuse exact-source geometry; never invent a building on a cache miss."""
    with Path(pdf).open("rb") as stream:
        source = hashlib.file_digest(stream, "sha256").hexdigest()
    case = Path(work) / source
    geometry = case / "geometry.json"
    if geometry.exists():
        require(read(geometry).get("source_sha256") == source, "Reviewed geometry refers to another PDF")
    else:
        for candidate in sorted((ROOT/"examples").glob("*/geometry.json")):
            if read(candidate).get("source_sha256") == source:
                geometry = candidate
                break
        else:
            from intake import extract
            evidence = case/"evidence"
            if not evidence.exists():
                case.mkdir(parents=True, exist_ok=True)
                with tempfile.TemporaryDirectory(dir=case) as tmp:
                    stage = Path(tmp)/"evidence"
                    extract(pdf, stage)
                    stage.rename(evidence)
            require(read(evidence/"index.json")["sha256"] == source, "Evidence cache does not match PDF")
            return {"status": "needs_geometry", "source_sha256": source,
                    "evidence": str(evidence.resolve()), "write_manifest": str(geometry.resolve()),
                    "next": "Read the numbered plan and section sheets, resolve ambiguous dimensions, "
                            "author the geometry manifest, then rerun the same command."}
    return {"status": "exported", **build(geometry, output, material, furnishing, brief, site, refinement, alignment)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="command", required=True)
    subs.add_parser("bootstrap", help="Download and verify the pinned Three.js release")
    p = subs.add_parser("intake", help="Render private numbered page images and extract text")
    p.add_argument("pdf"); p.add_argument("--out", required=True); p.add_argument("--width", type=int, default=2200)
    p = subs.add_parser("search", help="Find CC0 material or model candidates online")
    p.add_argument("query"); p.add_argument("--kind", choices=["textures", "models"], default="textures")
    p = subs.add_parser("texture", help="Cache a CC0 diffuse map and return its provenance record")
    p.add_argument("asset_id"); p.add_argument("--dir", required=True)
    p = subs.add_parser("build", help="Export a self-contained interactive HTML file")
    p.add_argument("geometry"); p.add_argument("--out", required=True)
    p.add_argument("--materials"); p.add_argument("--furniture"); p.add_argument("--brief")
    p.add_argument("--site",help="Optional geometry-bound illustrative site layer")
    p.add_argument("--refinement",help="Optional wet rooms, lighting and full enclosure study")
    p.add_argument("--alignment",help="Optional sheet-aligned furnishing and architectural details")
    p = subs.add_parser("concept", help="Start from PDF; reuse known geometry or prepare a private AI handoff")
    p.add_argument("pdf"); p.add_argument("--work", default=".work/cases"); p.add_argument("--out", required=True)
    p.add_argument("--materials"); p.add_argument("--furniture"); p.add_argument("--brief")
    p.add_argument("--site",help="Optional geometry-bound illustrative site layer")
    p.add_argument("--refinement",help="Optional wet rooms, lighting and full enclosure study")
    p.add_argument("--alignment",help="Optional sheet-aligned furnishing and architectural details")
    p = subs.add_parser("architect", help="Apply House's render-informed revision to the exact aligned export")
    p.add_argument("aligned",type=Path); p.add_argument("--out",required=True,type=Path)
    p = subs.add_parser("vehicles", help="Add the original House parking and movable lift study")
    p.add_argument("parent",type=Path); p.add_argument("--out",required=True,type=Path)
    p = subs.add_parser("lift-comparison", help="Compare two original cars on the frozen House lift/carport layout")
    p.add_argument("parent",type=Path); p.add_argument("--out",required=True,type=Path)
    args = parser.parse_args()
    if args.command == "intake":
        from intake import extract
        index = extract(args.pdf, args.out, args.width)
        result = {"index": str(Path(args.out)/"index.json"), "pages": len(index["pages"])}
    elif args.command == "bootstrap":
        assets.bootstrap()
        result = {"engine": "three@0.160.1", "cache": str(assets.VENDOR)}
    elif args.command == "search":
        result = assets.search(args.query, args.kind)
    elif args.command == "texture":
        result = assets.texture(args.asset_id, args.dir)
    elif args.command == "vehicles":
        from vehicles_layer import export
        result = export(args.parent,args.out,write_html)
    elif args.command == "lift-comparison":
        from comparison_layer import export
        result = export(args.parent,args.out,write_html)
    elif args.command == "architect":
        from architect_layer import export
        result = export(args.aligned,args.out,write_html)
    elif args.command == "concept":
        result = concept(args.pdf, args.work, args.out, args.materials, args.furniture, args.brief, args.site, args.refinement, args.alignment)
    else:
        result = build(args.geometry, args.out, args.materials, args.furniture, args.brief, args.site, args.refinement, args.alignment)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError, URLError) as exc:
        sys.exit(f"Render error: {exc}")
