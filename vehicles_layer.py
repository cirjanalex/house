"""Bind the original model study only to the immutable architect export."""
import hashlib
import json
from pathlib import Path

from geometry import require
from vehicle_models import dacia, sudwind

ROOT = Path(__file__).resolve().parent
PARENT = "60457a9bf79a903d3d93e4591a1b21b0527a3417b0e3d61b6de54e1f9e146cd2"
COLORS = dict(ivory="#eeeae0",coach="#e8e9e2",chrome="#b8c2c5",silver="#9eabb0",wheel="#848a8e",
              tyre="#242726",dark="#232828",graphite="#3d4446",glass="#546b70",camperglass="#344950",
              stripe="#475868",seam="#676b65",under="#434744",red="#a82e22",amber="#d58428",
              lamp="#d4dccc",plate="#d3d5c6",pit="#33393b",platform="#656e71",safety="#d4ad55")


def export(source, output, write_html):
    raw=source.read_bytes()
    require(hashlib.sha256(raw).hexdigest()==PARENT,"Expected the immutable House architect export")
    require(output.stem.casefold()=="house-vehicles" and output.resolve()!=source.resolve(),
            "Choose house-vehicles.html in a candidate or scratch directory")
    before,marker,rest=raw.decode("utf-8").partition('id="scene-data">')
    payload,end,viewer=rest.partition("</script>")
    data=json.loads(payload)
    spec=json.loads((ROOT/"examples/house/vehicles.json").read_text("utf-8"))
    require(spec["parent_sha256"]==PARENT,"Vehicle study parent mismatch")
    data["vehicles"]=spec
    data["styles"].update({"v_"+k:{"color":c} for k,c in COLORS.items()})
    for key,title,parts in [("car","Dacia albă · tranziție 1300 / 1310",dacia()),
                            ("trailer","KNAUS SÜDWIND 450 FU · 2025",sudwind()),
                            ("lift","Twin Busch TWS3-18UE-G · studiu de amplasare",[])]:
        data["groups"].append(dict(name=title,vehicle=key,parts=parts,pages=[1],level=0,
            basis="Proxy dimensional original; fără fotografii, sigle sau geometrie de catalog"))
    anchor="  } catch(e) { error(`The 3D view could not start"
    require(viewer.count(anchor)==1,"Unrecognised parent viewer")
    old="mesh.material=finishes(mesh.userData.part,fin)"
    require(viewer.count(old)==1,"Unrecognised finish update")
    viewer=viewer.replace(old,"mesh.material=mesh.userData.pitMaterials?.[Number(fin)]??finishes(mesh.userData.part,fin)")
    viewer=viewer.replace(anchor,"\n".join((ROOT/"web"/p).read_text("utf-8") for p in
                          ["vehicle_fit.js","vehicles.js"])+"\n"+anchor)
    before=before.replace('<label for="level">',(ROOT/"web/vehicle_panel.html").read_text("utf-8")+'\n<label for="level">')
    encoded=json.dumps(data,ensure_ascii=True,allow_nan=False,separators=(",",":")).replace("<","\\u003c")
    write_html(output,before+marker+encoded+end+viewer)
    return dict(output=str(output.resolve()),sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                parent_sha256=PARENT,geometry_sha256=data["hash"])
