"""Guarded offline House adjustable-deck exporter; independent of historical CLI recipes."""
import argparse
import hashlib
from pathlib import Path

from geometry import require
from render import write_html

ROOT = Path(__file__).resolve().parent
PARENT = "e09e957a736f51ec5371e80a63a91ed3fcb82d2a6f0bbd83157844b641d43385"
NAME = "house-lift-adjustable.html"
REFERENCE = ("https://files.twinbusch.de/twimg/de/produkte/scherenheb/tws3-18ue-g/"
             "abmessungen/abmessungen_heb_s3-18ue-g_ohne.jpg")


def export(source, output):
    raw = source.read_bytes()
    require(hashlib.sha256(raw).hexdigest() == PARENT, "Expected frozen House lift comparison export")
    require(output.name.lower() == NAME and output.resolve() != source.resolve(),
            f"Use a distinct {NAME} output")
    # Do not reserialize the payload, change inventory/poses, or rebuild the
    # historical layers. Narrow, count-checked hooks inside the bound parent.
    html = raw.decode("utf-8")

    def web(name):
        return (ROOT / "web" / name).read_text("utf-8")

    def edit(old, new, n=1):
        nonlocal html
        require(html.count(old) == n, f"Unexpected adjustable hook: {old[:90]}")
        html = html.replace(old, new)

    def between(start, stop):
        require(html.count(start) == html.count(stop) == 1, f"Unexpected adjustable region: {start}")
        return html[html.index(start):html.index(stop, html.index(start))]

    edit('<button id="v-reset"', '<label for="v-len">Lungime platforme <output id="v-leno"></output></label>'
         '<input type="range" id="v-len" min="1.55" max="1.95" step=".01" value="1.75">\n<button id="v-reset"')
    edit("1,55–1,95 m (vizual 1,75 m)", "1,55–1,95 m (reglaj comun, inițial 1,75 m)")
    edit('<div id="v-sources">',
         '<p>Reper fix: axul X/Z al foarfecelor și al mașinii nu se schimbă. Muchia din spate rămâne la '
         'Z + 0,825 m; centrul perechii retrase este la Z + 0,050 m. '
         'Capătul auriu și cele două glisiere avansează numai spre fața mașinii, către ușa garajului (−Z). '
         'Gri = platou fix; între glisiere nu există placă portantă. Cota până la traversa mobilă este o distanță '
         'longitudinală, nu o suprafață continuă de sprijin. Cuva pentru cursa maximă, rama și umpluturile '
         'mobile la nivelul pardoselii sunt ipoteze grafice, nu detalii de montaj ale fabricantului.</p>'
         f'<div id="v-sources"><a href="{REFERENCE}" target="_blank" rel="noopener noreferrer">'
         'Twin Busch · TWS3-18UE-G · desen cotat (extensie la un capăt)</a><br>')
    edit("const defaults={x:L.x,", "const defaults={len:L.platform_length,x:L.x,")
    scissor = between("    const bottom=-.228, arm=1.36;", "\n  }\n  function place(){")
    edit(between("  const pit={x:{value:st.x}", "  // A joint is a material mark"),
         web("adjustable_decks.js").replace("/* INHERITED SCISSORS */", scissor) + "\n" + web("adjustable_ground.js") + "\n")
    edit(between("    for(const s of [-1,1])if(st.h>.018)", "    const old=new Set(solids)"),
         "    if(st.h>0)activeBoxes.push(...decks.map(pitGuard));\n")
    edit("staticLift.reduce((bounds,m)", "staticLift.filter(m=>m.visible).reduce((bounds,m)")
    edit("axleOutside:car.axles.map(a=>Math.abs(a)-L.platform_length/2)", "...longitudinal(car,z)")
    edit("const key=[x,z,!!panel.userData.open", "const key=[x,z,st.len,!!panel.userData.open")
    edit("const rows=[[L.stroke,'nominal']];",
         "const rows=[[L.stroke,'nominal']],wheel0=tyreAtRest(ts);\n"
         "    if(wheel0-margin<contact)rows.push([Math.max(0,wheel0-margin),'tyre']);")
    edit("const names={paint:", "const names={tyre:'pneu – platformă înainte de preluarea pe tampoane',paint:")
    edit("return {ts,ct,paint:head.m", "return {ts,ct,wheel0,paint:head.m")
    edit("rise:dy,panEdge:", "rise:dy,tyreGap:f.wheel0-Math.min(h,f.contact),panEdge:")
    edit("    if(c&&!c.ok)", "    if(c&&!c.longOk)return 'rezervă longitudinală sub 25 mm la tampon / platou';\n    if(c&&!c.ok)")
    edit("next.id&&prior&&['x','z','h']", "next.id&&Object.keys(next).length===1&&prior&&['x','z','h','len']")
    edit("['x','z','h','ach']", "['x','z','h','len','ach']", 2)
    edit("X ${fmt(ps.x)}, Z ${fmt(ps.z)}, cursă ${fmt(ps.h)} ·",
         "X ${fmt(ps.x)} m, Z ${fmt(ps.z)} m, cursă ${fmt(ps.h)} m · platforme ${fmt(ps.len)} m ·")
    edit("(_,f)=>f.ok?'încape':'REFUZ'", "(_,f)=>f.ok&&f.longOk?'încape':'REFUZ'")
    edit("['Axe în afara platoului 1,75 (sp./față)',(_,f)=>f.axleOutside.map(fmt).join(' / ')]",
         "['Axe dincolo de capete · față / spate (m)',(_,f)=>f.axleOutside.map(fmt).join(' / ')],\n"
         "      ['Tampon → capăt util · față / spate (mm)',(_,f)=>[f.padFront,f.padRear].map(mm).join(' / ')],\n"
         "      ['Tampon față → muchie placă fixă (mm)',(_,f)=>mm(f.fixedFrontReserve)],\n"
         "      ['Gol pneu–platou pe verticală (m)³',(_,f)=>f.tyreGap]")
    edit("  function bad(){", "  const mm=m=>(m*1000).toFixed(1).replace('.',',');\n  function bad(){")
    edit("cursă reală ${fmt(st.h)} m.", "cursă reală ${fmt(st.h)} m, lungime platforme ${fmt(st.len)} m.")
    edit("la capăt 0,081–0,281 m (aici 0,181 m). Puncte portante reale necunoscute pentru ambele.",
         "centre la Z ±0,610 m față de ax, fără repoziționare după mașină sau extensie. "
         "Dacia: depășire laterală 22,5 mm. Punctele portante și adaptoarele reale nu sunt verificate pentru niciuna. "
         "³ Dacă platforma intră sub pneu în proiecție, cursa se limitează înainte de contact (rezervă verticală de "
         "studiu 25 mm). Liniuță = fără suprapunere. Repausul nu garantează o cursă posibilă.")
    edit("textContent=message||(Math.min(...fit.approachSides)",
         "textContent=(message ? (message+' Lungime platforme: '+fmt(ps.len)+' m.') : '')||(Math.min(...fit.approachSides)")
    edit("House · comparație de gabarit';apply()", "House · platforme reglabile';apply()")
    write_html(output, html)
    return hashlib.sha256(output.read_bytes()).hexdigest()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("parent", type=Path); p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    try:
        digest = export(args.parent, args.out)
    except (ValueError, OSError) as exc:
        p.exit(1, f"Render error: {exc}\n")
    print(f"{args.out.resolve()}\nSHA-256 {digest}")
