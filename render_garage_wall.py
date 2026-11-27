"""Offline, parent-bound wall amendment. No historical recipe or drawing input is rewritten."""
import argparse
import hashlib
import json
from pathlib import Path

from geometry import digest, require
from render import write_html

ROOT = Path(__file__).resolve().parent
PARENT = "b720520c5452824116f4695f0fbc9ac2c2262437bcaabd01c1f55f066660b0a0"
NAME = "house-garage-wall.html"


def amend_scene(d):
    groups = d["groups"]

    def group(prefix):
        g, = [g for g in groups if g["name"].startswith(prefix)]
        return g

    annex = group("Attached annex")
    a = annex["parts"]
    west = round(a[40]["box"][0] + a[40]["size"][2]/2, 6)
    front = round(a[8]["box"][2] + a[8]["size"][2]/2, 6)
    x = west + 3.50
    east = round(x + .23 + 1.42 + .30, 6)
    z = front + 1.00
    floor = round(a[0]["base"] + a[0]["depth"], 6)
    # Hold the exterior and all apertures. Take up the missing 120 mm in
    # the internal house-side reveal; upper landing carries across to the
    # original house deck and leaf. Preserve OMAR's wall standoff and level.
    for p in a[15:18]:
        p["box"][0] = east/2
        p["size"][2] = -east
    a[1]["box"][0] = east-.15
    a.append(dict(box=[east/2,-.15,6.3], size=[-east,.30,.90], slot="stone",walkable=True))
    for p in group("OMAR galvanised")["parts"]:
        p["box"][0] = round(p["box"][0]-.12, 7)

    # Translate the hobby partition AND the actual practical fixed to its back.
    target = front+5.67
    dz = round(target - (a[29]["box"][2]-a[29]["size"][2]/2), 6)
    a[29]["box"][2] = round(a[29]["box"][2]+dz, 6)
    for p in group("Hobby · practical")["parts"]:
        p["box"][2] = round(p["box"][2]+dz, 6)
    for zone in d["refined"]["zones"]:
        if zone["name"] == "Workshop":
            zone["bounds"][3] = round(zone["bounds"][3]+dz, 6)
        if zone["name"] == "Hobby":
            zone["bounds"][1] = round(zone["bounds"][1]+dz, 6)
            zone["lamp"][2] = round(zone["lamp"][2]+dz, 6)

    # P1 A–A actually intersects the marked length. P4 shows a continuous
    # sectioned upright up to the lining there, not an exact cap schedule.
    # Both arrises are on the *same* front pitch. Sample the accepted painted
    # triangles, never the outer roof or a guessed horizontal wall height.
    ceiling = [p["face"] for p in group("Annex · painted")["parts"] if p.get("overhead")]

    def underside(px, pz):
        vals = []
        for (ax,ay,az),(bx,by,bz),(cx,cy,cz) in ceiling:
            det=(bx-ax)*(cz-az)-(bz-az)*(cx-ax)
            u=((px-ax)*(cz-az)-(pz-az)*(cx-ax))/det
            v=((bx-ax)*(pz-az)-(bz-az)*(px-ax))/det
            if min(u,v,1-u-v)>-1e-8:
                vals.append(ay+u*(by-ay)+v*(cy-ay))
        require(bool(vals), "No painted lining over wall")
        return min(vals)

    corners = [(x,z),(x+.23,z),(x+.23,z+3.70),(x,z+3.70)]
    at = [x+.115,floor,z+1.85]
    vertices = [[px-at[0],y-floor,pz-at[2]] for top in [False,True] for px,pz in corners
                for y in [underside(px,pz) if top else floor]]
    # Separate vertices per face for flat plaster normals; one watertight solid.
    faces = [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)]
    wall = dict(component="workshop masonry",slot="partition",at=at,
                mesh=[vertices[i] for q in faces for i in q],
                indices=[4*n+i for n in range(6) for i in [0,1,2,0,2,3]])
    # Part of the annex: normal walker collision + historical garage-drive
    # obstacle collection. Never furniture, SKU, a toggle, or a second collider.
    a.append(wall)
    groups.remove(group("Long divider / tool storage"))
    d["aligned"]["sheets"][0][2]=d["aligned"]["sheets"][0][2].replace(
        "leaf, jamb, steps and adjoining walls retained. Long garage storage is schematic, not a parked vehicle.",
        "fixed leaf and jamb retained; see the corrected finished-face step and workshop wall dimensions.")
    for row in d["aligned"]["roomAudit"]:
        if row[0]=="Garage workshop / circulation":
            row[1]="p.1: fixed 230 mm workshop wall, open at both ends. Separate bench and wall rack retained."
    d["garageWall"]=dict(parent_sha256=PARENT,basis="Ground plan, section A–A and inside finished faces",
                         visual="Sectioned to the lining at A–A; the cap follows the existing painted pitch elsewhere. No structural specification.")
    d["notes"].insert(0,"Workshop: inside width 3.50 + 0.23 + 1.42 + 0.30 = 5.45 m; depth 1.00 + 3.70 + 0.97 = 5.67 m. "
                      "Plan p.1 and A–A p.4. Full-height at the cut; continuation to the model lining is visual, not a structural detail. No object is inferred from the adjacent unhatched outline.")
    d["hash"]=digest({"inherited":d["hash"],"parent":PARENT,"annex":a,"garageWall":d["garageWall"]})


def export(source, output):
    raw=source.read_bytes()
    require(hashlib.sha256(raw).hexdigest()==PARENT,"Expected frozen adjustable export")
    require(output.name.lower()==NAME and source.resolve()!=output.resolve(),"Use distinct "+NAME)
    marker='id="scene-data">'
    before,body=raw.decode("utf-8").split(marker)
    scene,script=body.split("</script>",1)
    data=json.loads(scene)
    amend_scene(data)

    def edit(old,new,n=1):
        nonlocal script
        require(script.count(old)==n,"Unexpected wall hook: "+old[:90])
        script=script.replace(old,new)

    edit(",divider=group('Long divider')","")
    edit("bench:bench.children,divider:divider.children","bench:bench.children,masonry:annex.children.filter(m=>m.userData.part.component==='workshop masonry')")
    edit("wall:[...annex.children.filter(m=>!m.userData.part.door",
         "wall:[...annex.children.filter(m=>m.userData.part.component!=='workshop masonry'&&!m.userData.part.door")
    edit("divider:'separator'","masonry:'peretele fix al atelierului'")
    edit("pit:'cuve lângă mobilier'","pit:'marginea cuvei lângă banc sau peretele fix'")
    edit("  const panelSet=()=>","  "+(ROOT/"web/garage_wall_fit.js").read_text("utf-8")+"\n  const panelSet=()=>")
    edit("const pitClear=Math.min(recess.min.x-sets.bench.b.max.x,sets.divider.b.min.x-recess.max.x);",
         "const pitBench=recess.min.x-sets.bench.b.max.x,pitWall=sets.masonry.b.min.x-recess.max.x,pitClear=Math.min(pitBench,pitWall);")
    edit("ends,pitClear,limits,","ends,pitBench,pitWall,pitClear,limits,")
    edit("divider:gap(ct,sets.divider)","masonry:wallGap(f.ts,dy)")
    edit("divider:gap(t,sets.divider)","masonry:wallGap(lt,0)")
    edit("pitClear:f.pitClear,rise:","pitClear:f.pitClear,pitBench:f.pitBench,pitWall:f.pitWall,rise:")
    edit("if(c&&!c.ok)return", "if(c&&!c.ok&&c.by==='masonry')return `${label(st.id)} · peretele fix: ${fmt(c.masonry)} m lateral cu oglinzi (rezervă de studiu 0,025 m)`;\n    if(c&&!c.ok)return")
    edit("['La banc / separator',(_,f)=>[f.bench,f.divider].map(fmt).join(' / ')]",
         "['La banc (3D)',(_,f)=>f.bench],['La peretele fix · lateral, cu oglinzi',(_,f)=>f.masonry],"
         "['Ramă cuvă → banc / perete (în plan)',(_,f)=>[f.pitBench,f.pitWall].map(fmt).join(' / ')]")
    edit("Cuve–mobilier ${fmt(fit.pitClear)} m.",
         "Mecanism mobil → perete ${fmt(fit.lift.masonry)} m; ramă cuvă → perete ${fmt(fit.pair[st.id].pitWall)} m. "
         "Distanțele laterale sunt semnate: negativ = suprapunere. "
         "Peretele este fix, inclusiv cu mobilierul ascuns.")
    edit("if(fit.pitClear<margin||", "if(fit.pair[st.id].pitWall<margin)return `ramă cuvă – perete fix: ${fmt(fit.pair[st.id].pitWall)} m`;\n    if(fit.pitClear<margin||")
    edit("House · platforme reglabile';apply()", "House · perete fix în atelier';apply()")
    require(before.count('<div id="v-comparison">')==1,"Missing comparison panel")
    before=before.replace('<div id="v-comparison">','<p><b>Corecție plan · atelier</b><br>'
        'Înainte: corp jos, 3,24 × 0,39 × 1,06 m. Acum: perete fix, 3,70 × 0,23 m, până la plafonul în pantă. '
        'Între fețe: 3,50 + 0,23 + 1,42 + 0,30 = 5,45 m. În lungime: 1,00 + 3,70 + 0,97 = 5,67 m. '
        'Ambele capete rămân libere; nu este modelat niciun corp lipit de perete. '
        'La axul inițial, în repaus (Dacia / S 500 L): înainte 0,630 / 0,475 m până la corpul jos; '
        'acum 0,665 / 0,510 m până la perete, cu oglinzile desfășurate. Valorile de mai jos urmăresc reglajele.</p><div id="v-comparison">')
    html=before+marker+json.dumps(data,ensure_ascii=True,allow_nan=False,separators=(",",":")).replace("<","\\u003c")+"</script>"+script
    h=hashlib.sha256(html.encode()).hexdigest()
    if output.exists():
        require(hashlib.sha256(output.read_bytes()).hexdigest()==h,"Existing output is different; choose a fresh directory")
    else:
        write_html(output,html)
    return h


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("parent",type=Path)
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args()
    try:
        h=export(args.parent,args.out)
    except (ValueError,OSError) as e:
        parser.exit(1,f"Render error: {e}\n")
    print(f"{args.out.resolve()}\nSHA-256 {h}")
