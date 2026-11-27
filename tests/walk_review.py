"""Replay a continuous eye-level inspection in Chrome/Edge.

The default route is bound to the bundled House geometry. For another concept,
pass --route route.js: a trusted local script defining a synchronous
function walkRoute({via, visit}) using the viewer's metre coordinates. Call
via([x,z], ...) to walk waypoints, visit(uniqueName,x,z,floorY,headingDegrees)
to walk to a stop and capture four headings, then via(...) back to the actual
walk start. Do not teleport, synthesize images, or submit your own report.
The common driver operates doors, checks the floor and return position, and
reports {ok,revision,rooms:[{name,x,z,y,views}],returned_to_start}, or
{ok:false,error,visited}. Both built-in and custom routes use this contract.
"""
import argparse
import base64
from contextlib import contextmanager
import hashlib
import html
from io import BytesIO
import json
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw

DRIVER = Path(__file__).resolve().with_name("house_tour.js")
ROOT = DRIVER.parent.parent
sys.path.insert(0, str(ROOT))
from geometry import digest

SIZE = (640, 384)
JPEG_URL = "data:image/jpeg;base64,"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def run_walk(browser, source, route, scratch):
    script = DRIVER.read_text(encoding="utf-8")
    if route is None:
        geometry = json.loads((ROOT/"examples"/"house"/"geometry.json").read_text(encoding="utf-8"))
        script += f"\nrunWalkingReview(houseRoute, {json.dumps(digest(geometry))});"
    elif Path(route).resolve() == DRIVER:
        script += "\nrunWalkingReview(houseRoute);"
    else:
        route = Path(route)
        loaded=set(); modules=[]
        def include(path):
            body=path.read_text(encoding="utf-8-sig")
            for name in re.findall(r"^// @route-base ([\w-]+\.js)$",body,re.M):
                base=path.with_name(name)
                if base in loaded:continue
                loaded.add(base)
                include(base)
            modules.append(body)
        include(route)
        # A derived route may override the base walkRoute while using its named
        # helpers. Distinct scopes also keep a two-level site's callbacks intact.
        script += "".join("\n{\n"+body for body in modules)+"\nrunWalkingReview(walkRoute);\n"+"}"*len(modules)
    hook = "  } catch(e) { error(`The 3D view could not start"
    if source.count(hook) != 1:
        raise ValueError("This export has no supported viewer for the walking review")
    source = source.replace(hook, script + "\n" + hook)
    source = source.replace("</head>", "<style>main,#stage,#viewport{display:block;width:640px;height:384px}</style></head>", 1)
    scratch.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=scratch, prefix="walk-browser-") as tmp:
        root = Path(tmp).resolve()
        page = root/"tour.html"
        page.write_text(source, encoding="utf-8")
        res = subprocess.run([browser, "--headless=new", "--no-first-run", "--disable-background-networking",
                              "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--force-device-scale-factor=1",
                              f"--user-data-dir={root/'profile'}", "--dump-dom", page.as_uri()],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=240)
    match = re.search(rb'<pre id="tour-result">(.*?)</pre>', res.stdout, re.S)
    if not match or res.returncode:
        raise RuntimeError("Browser did not finish walking review: " + res.stderr[-650:].decode(errors="replace"))
    return json.loads(html.unescape(match[1].decode("utf-8")))


@contextmanager
def reserve_round(folder):
    if folder is None:
        yield None
        return
    folder.mkdir(parents=True, exist_ok=True)
    if any(folder.iterdir()):
        raise ValueError(f"Evidence directory must be empty: {folder}")
    marker = folder/".walk-in-progress"
    marker.touch(exist_ok=False)
    try:
        if any(path != marker for path in folder.iterdir()):
            raise ValueError(f"Evidence directory must be empty: {folder}")
        yield marker
    finally:
        marker.unlink(missing_ok=True)


def decode_view(url, label, size=SIZE):
    try:
        if not isinstance(url, str) or not url.startswith(JPEG_URL):
            raise ValueError("expected a JPEG data URL")
        raw = base64.b64decode(url[len(JPEG_URL):], validate=True)
        with Image.open(BytesIO(raw), formats=("JPEG",)) as image:
            if image.size != size:
                raise ValueError(f"expected a {size[0]}×{size[1]} view")
            rgb = image.convert("RGB")  # Fully decode, not just the JPEG header.
    except (ValueError, OSError) as exc:
        raise ValueError(f"{label}: invalid rendered view ({exc})") from exc
    return raw, rgb


def collect(report, folder, build_hash):
    if report.get("ok") is not True:
        raise ValueError(f"{report.get('error', 'Walk failed')}; visited: {', '.join(report.get('visited', []))}")
    if report.get("returned_to_start") is not True:
        raise ValueError("Route did not return to the start")
    rooms = report.get("rooms")
    if not isinstance(rooms, list) or not rooms:
        raise ValueError("Route did not visit any stops")
    counts, sections = {}, []
    for stop, room in enumerate(rooms, 1):
        name, views = room["name"], room["views"]
        if not isinstance(name, str) or not name.strip() or name.strip() != name or name in counts:
            raise ValueError(f"Expected a unique, nonempty stop name, got {name!r}")
        if not isinstance(views, list) or len(views) != 4:
            raise ValueError(f"{name}: expected four rendered views")
        slug = re.sub("[^a-z0-9]+", "-", name.lower()).strip("-")[:60] or "stop"
        stem = f"{stop:02d}-{slug}"
        sheet = Image.new("RGB", (640, 424), "#f4f4f0") if folder else None
        seen, figures = set(), []
        for i, url in enumerate(views, 1):
            raw, image = decode_view(url, f"{name}, view {i}")
            signature = sha256(image.tobytes())
            if signature in seen:
                raise ValueError(f"{name}, view {i}: duplicate rendered pixels")
            seen.add(signature)
            # A close wall can fill an entire heading. Keep it visible to QC, never substitute a view.
            note = " (uniform color)" if all(lo == hi for lo, hi in image.getextrema()) else ""
            if sheet is not None:
                (folder/f"view-{stem}-{i}.jpg").write_bytes(raw)
                x, y = ((i-1) % 2)*320, ((i-1) // 2)*212
                sheet.paste(image.resize((320, 192), Image.Resampling.LANCZOS), (x, y))
                ImageDraw.Draw(sheet).text((x+4, y+194), f"Stop {stop:02d} / view {i}{note}", fill="black")
            label = f"{html.escape(name)} — view {i}{note}"
            figures.append(f'<figure><button type="button" class="view"><img src="{url}" alt="{label}"></button>'
                           f'<figcaption>{label}</figcaption></figure>')
        if sheet is not None:
            sheet.save(folder/f"contact-{stem}.jpg", quality=88)
        counts[name] = len(views)
        sections.append(f"<section><h2>{stop}. {html.escape(name)}</h2><div>{''.join(figures)}</div></section>")
    # Embed the actual full-size JPEGs so the gallery checksum also binds the rendered pixels.
    gallery = ("<!doctype html><meta charset=utf-8><title>Eye-level walking review</title>"
               "<style>body{font:16px system-ui;margin:2em;background:#faf9f5;color:#28392e}"
               "div{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,640px),640px));gap:8px}"
               "figure{margin:0}img{max-width:100%;height:auto;display:block}"
               ".view{display:block;border:0;padding:0;cursor:zoom-in}dialog{max-width:95vw}</style>"
               f"<h1>Eye-level walking review</h1><p>Four headings per stop, then back to the start. "
               f"Build SHA-256: <code>{build_hash}</code>.</p>" + "".join(sections) +
               "<dialog><form method=dialog><button>Close</button></form></dialog>"
               "<script>const dialog=document.querySelector('dialog'),large=new Image();dialog.append(large);"
               "for(const button of document.querySelectorAll('.view'))button.onclick=()=>{"
               "const img=button.firstElementChild;large.src=img.src;large.alt=img.alt;dialog.showModal()};</script>").encode("utf-8")
    return counts, gallery


def file_version(path):
    stat = path.stat()
    return stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns


def review(browser, site, output=None, evidence_dir=None, route=None):
    site = Path(site).resolve(strict=True)
    folder = Path(evidence_dir).resolve() if evidence_dir else None
    output = Path(output).resolve() if output else None
    if output == site or (output and output.exists() and output.samefile(site)):
        raise ValueError("--out must not overwrite the candidate")
    if folder and output and output.is_relative_to(folder) and output != folder/"gallery.html":
        raise ValueError("Put standalone --out outside the evidence directory")
    with reserve_round(folder) as marker:
        version = file_version(site)
        source = site.read_bytes()
        build_hash = sha256(source)
        report = run_walk(browser, source.decode("utf-8"), route, folder or ROOT/".work")
        counts, gallery = collect(report, folder, build_hash)

        def verify_candidate():
            if file_version(site) != version or sha256(site.read_bytes()) != build_hash:
                raise ValueError("Candidate changed during walking review; start a fresh round")

        verify_candidate()
        if output and (not folder or output != folder/"gallery.html"):
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(gallery)
        if folder:
            (folder/"gallery.html").write_bytes(gallery)
            manifest = dict(schema=1, build_sha256=build_hash, gallery="gallery.html",
                            gallery_sha256=sha256(gallery), room_views=counts, returned_to_start=True)
            if "overview" in report:
                overview = report["overview"]
                raw, _ = decode_view(overview["view"], "Whole site")
                (folder/"whole-site.jpg").write_bytes(raw)
                manifest["overview"] = dict(image="whole-site.jpg", sha256=sha256(raw),
                                            draw_calls=overview["calls"], triangles=overview["triangles"])
            if "inspection" in report:
                details = json.dumps(dict(build_sha256=build_hash, inspection=report["inspection"]), indent=2).encode()
                (folder/"inspection.json").write_bytes(details)
                manifest["inspection"] = dict(file="inspection.json", sha256=sha256(details))
            if "details" in report:
                manifest["details"] = {}
                for name, view in report["details"].items():
                    if not re.fullmatch(r"[a-z0-9-]+",name):
                        raise ValueError("Invalid exterior study name")
                    size=SIZE
                    if isinstance(view,dict):
                        if view.get("size")!=[1280,768] or not name.startswith("example-"):
                            raise ValueError("Invalid supplemental example dimensions")
                        size=(1280,768);view=view["jpeg"]
                    raw,_ = decode_view(view,name,size)
                    (folder/f"detail-{name}.jpg").write_bytes(raw)
                    manifest["details"][name] = dict(image=f"detail-{name}.jpg",sha256=sha256(raw))
            marker.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            verify_candidate()
            marker.replace(folder/"evidence.json")
    print(f"{len(counts)} stops visited, four headings per stop; returned to start.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("browser")
    parser.add_argument("site")
    parser.add_argument("--out", help="write a standalone offline gallery")
    parser.add_argument("--evidence-dir", help="write full views, per-stop contact sheets, gallery.html and evidence.json to a new/empty directory")
    parser.add_argument("--route", help="trusted local JS defining function walkRoute({via,visit}); default: bundled House only")
    args = parser.parse_args()
    try:
        review(args.browser, args.site, args.out, args.evidence_dir, args.route)
    except (ValueError, OSError, RuntimeError, subprocess.TimeoutExpired) as exc:
        parser.exit(1, f"Walk review failed: {exc}\n")
