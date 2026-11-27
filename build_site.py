"""Reproduce the static site from the bundled example; no source PDF is required."""
from pathlib import Path
from tempfile import NamedTemporaryFile
import os
import shutil

from render import ROOT, build, write_html
import architect_layer
import vehicles_layer
import comparison_layer
import render_adjustable
import render_garage_wall
import render_rav509if


def build_site():
    case = ROOT / "examples" / "house"
    work = ROOT / "build"
    work.mkdir(exist_ok=True)
    options = {}
    stages = [
        ("shell", {}),
        ("index", {"material": "materials.json"}),
        ("furnished", {"furnishing": "furniture.json", "brief": "demo-brief.json"}),
        ("landscaped", {"site": "site.json"}),
        ("house-refined", {"refinement": "refinement.json"}),
        ("house-aligned", {"alignment": "alignment.json"}),
    ]
    for name, changes in stages:
        options.update({key: case / filename for key, filename in changes.items()})
        current = work / f"{name}.html"
        build(case / "geometry.json", current, **options)
    for name, module in [("architect", architect_layer), ("vehicles", vehicles_layer),
                         ("lift-comparison", comparison_layer)]:
        target = work / f"house-{name}.html"
        module.export(current, target, write_html)
        current = target
    for module in (render_adjustable, render_garage_wall, render_rav509if):
        target = work / module.NAME
        module.export(current, target)
        current = target
    docs = ROOT / "docs"
    docs.mkdir(exist_ok=True)
    with NamedTemporaryFile(dir=docs, delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        shutil.copyfile(current, tmp_path)
        os.replace(tmp_path, docs / "index.html")
    finally:
        tmp_path.unlink(missing_ok=True)
    print(docs / "index.html")


if __name__ == "__main__":
    build_site()
