"""Offline additive derivative of the frozen vehicle study. Never rewrite its source."""
import hashlib
import json
from pathlib import Path

from comparison_models import ac, caravan, dacia_mirrors, mercedes
from geometry import require

ROOT = Path(__file__).resolve().parent
PARENT = "fd087cb3fb8764612f80cad4587efbe9af5f5dfa13088f75a512faca1a2e6fce"


def export(source, output, write_html):
    raw=source.read_bytes()
    spec=json.loads((ROOT/"examples/house/lift-comparison.json").read_text("utf-8"))
    require(hashlib.sha256(raw).hexdigest()==spec["parent_sha256"]==PARENT,"Expected frozen house-vehicles.html")
    require(output.name.lower()=="house-lift-comparison.html" and source.resolve()!=output.resolve(),
            "Use a distinct house-lift-comparison.html output")
    web=lambda name:(ROOT/"web"/name).read_text("utf-8")
    head,marker,rest=raw.decode("utf-8").partition('id="scene-data">')
    payload,end,viewer=rest.partition("</script>")
    data=json.loads(payload)
    groups={g.get("vehicle"):g for g in data["groups"]}
    groups["car"]["parts"].extend(dacia_mirrors())
    groups["trailer"]["parts"]=caravan()
    # The inactive model and the optional AC are data, not extra scene objects.
    spec["mercedesParts"]=mercedes();spec["acParts"]=ac();data["comparison"]=spec
    data["styles"].update({k:dict(color=v) for k,v in
                          dict(c_blue="#233d55",c_glass="#3b515c",c_clad="#475563").items()})
    legacy=web("vehicles.js");legacy_ui=web("vehicle_panel.html")
    require(viewer.count(legacy)==1 and head.count(legacy_ui)==1,"Unsupported vehicle viewer")
    # Preserve the actual platform/recess/scissor builder and placement functions.
    machinery=legacy[legacy.index("  const pit="):legacy.index("  // Reuse the renderer")]
    script=web("comparison.js").replace("/* EXISTING LIFT */",machinery)
    viewer=viewer.replace(legacy,web("comparison_fit.js")+"\n"+script)
    head=head.replace(legacy_ui,web("comparison_panel.html"))
    encoded=json.dumps(data,ensure_ascii=True,allow_nan=False,separators=(",",":")).replace("<","\\u003c")
    write_html(output,head+marker+encoded+end+viewer)
    return dict(output=str(output.resolve()),sha256=hashlib.sha256(output.read_bytes()).hexdigest(),parent_sha256=PARENT)
