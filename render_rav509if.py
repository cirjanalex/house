"""Compose the selected 50 Hz RAV509IF onto the exact, frozen wall checkpoint."""
import argparse
import hashlib
import json
from pathlib import Path

from geometry import digest, require
from render import write_html

ROOT = Path(__file__).resolve().parent
NAME = "house-garage-wall-rav509if.html"
PARENT = "928ea25b589ae83d131ecb20ec8b70a587786279d57b8bfd63069dc050a55250"
PRODUCT = "https://ravaglioli.com/product/double-scissor-lift-rav509if-230-400-v-3-ph-50-hz/"
MEDIA = "https://ravaglioli.com/wp-content/uploads/brb_media/"
DRAWING = MEDIA+"00510333_scissor-lift-rav509if-td-0580_0708_0_00-it-2004-09.pdf"
BROCHURE = MEDIA+"00528352_scissor-lifts-rav507-08-09-10-br-multi-2024-07-screen.pdf"
MANUAL = MEDIA+"00550003_double-scissor-lifts-rav505-if-rav506-i-rav507-if-rav508-i-mi-rav509-if-rav510-i-ilb-0580-m020-0-rev9-multi-im-om-2020-05.pdf"


def amend(d):
    spec = d["vehicles"]
    spec["lift"] = dict(mpn="RAV.509IF.196071", kg=3500, hz=50, x=-3.90, z=7.80, floor=-.30,
                        platform_width=.510, platform_length=1.580, platform_gap=.900,
                        pit_width=.545, pit_length=1.610, pit_gap=.880, embedded=.265, stroke=1.825,
                        study_margin=.025, pad_width=.120, pad_length=.160, pad_x=.550, pad_z=.600,
                        pad_sets={"S505A9": .060, "S505A7": .020, "S505A6": .040, "S505A5": .120, "S505A1": .200})
    spec["references"] = [v for v in spec["references"] if "twinbusch" not in v["url"]]
    spec["references"].extend(dict(name=name, url=u) for name, u in [
        ("Ravaglioli · RAV.509IF.196071 · 50 Hz", PRODUCT),
        ("RAV509 IF · desen 0580/0708/0", DRAWING), ("RAV · seturi de tampoane · broșură 2024", BROCHURE),
        ("RAV · manual 0580-M020-0 rev.9 §3.5 · setul 412071", MANUAL)])
    g, = [g for g in d["groups"] if g.get("vehicle") == "lift"]
    require(not g["parts"], "Unexpected baked lift geometry")
    g["name"] = "Ravaglioli RAV509IF · studiu de amplasare"
    # Separate fixed item, NOT a child of the translated lift, the furniture
    # layer, or a phantom unrendered keep-out. Cabinet faces stay in its envelope.
    cx, cz, floor = -5.575, 6.55, spec["lift"]["floor"]
    def item(label, slot, x,y,z,w,h,l):
        return dict(component=label,slot=slot,box=[cx+x,floor+y,cz+z],size=[w,h,l])
    d["groups"].append(dict(name="RAV509IF · pupitru",level=0,pages=[],basis="Gabarit IF; poziție ipotetică.",
        parts=[item("console plinth","v_graphite",0,.025,0,.281,.05,.254),
               item("console cabinet","v_coach",-.008,.649,0,.245,1.198,.237),
               item("console head","v_graphite",0,1.2865,0,.281,.077,.254),
               item("console fascia","v_seam",.12,1.14,0,.012,.14,.185),
               item("console indicator","v_amber",.13,1.16,.047,.008,.031,.031)]))
    d["rav509if"] = dict(parent_sha256=PARENT,drawing="0580/0708/0",console="Fixed concept position, not surveyed")
    d["hash"] = digest([d["hash"],d["rav509if"],spec["lift"],d["groups"][-1]])


def export(source, output):
    raw = source.read_bytes()
    require(hashlib.sha256(raw).hexdigest()==PARENT, "Expected frozen corrected-wall HTML")
    require(output.name.lower()==NAME and source.resolve()!=output.resolve(), "Use distinct "+NAME)
    marker='id="scene-data">'
    before,body=raw.decode("utf-8").split(marker)
    scene,script=body.split("</script>",1)
    data=json.loads(scene); amend(data)
    def web(name):return (ROOT/"web"/name).read_text("utf-8").strip()
    def change(text,old,new,n=1):
        require(text.count(old)==n,"Unexpected RAV hook: "+old[:95])
        return text.replace(old,new)
    def region(text,a,b,repl):
        require(text.count(a)==text.count(b)==1, "Unexpected region: "+a)
        return text[:text.index(a)]+repl+text[text.index(b,text.index(a)):]
    before=region(before,'<label for="v-len">','<button id="v-reset"',
                  '<label for="v-pads">Set ilustrativ · 4 tampoane</label><select id="v-pads">'+
                  ''.join(f'<option value="{k}">{k} · {round(h*1000)} mm</option>'
                          for k,h in data['vehicles']['lift']['pad_sets'].items())+'</select>\n')
    before=change(before,'id="v-h" min="0" max="1.80" step=".01"',
                  'id="v-h" min="0" max="1.825" step=".005"')
    before=change(before,'Cursă cerută <output','Platou față de pardoseală <output')
    before=change(before,'Două mașini · același elevator','Două mașini · Ravaglioli RAV509IF')
    before=region(before,'<p>Twin Busch','</div></details></details>', web("rav509if_panel.html")+'\n')
    script=region(script,"    // The garage pose reverses", "  const paving=box(slabParking);",
                  web("rav509if.js")+"\n")
    def edit(old,new,n=1):
        nonlocal script
        script=change(script,old,new,n)
    edit("len:L.platform_length,", "pads:'S505A9',")
    edit("  const bayPos=", """  const padH=()=>L.pad_sets[st.pads];
  const flat=Object.fromEntries(sels.map(id=>[id,Math.min(...shape[id].filter(t=>
    ['floor pan','illustrative floor pressing'].includes(t.object.userData.part.component)).map(t=>t.b.min.y))]));
  const bayPos=""")
    edit("h+L.pad-C.cars[id].pickup","h-Math.max(0,flat[id]-padH())")
    edit("bench:bench.children,masonry:", "console:group('RAV509IF · pupitru').children,bench:bench.children,masonry:")
    edit("const names={tyre:", "const names={support:'tampon / planșeu ilustrativ',body:'caroserie / platou',console:'pupitru',tyre:")
    edit("const head=VFit.vertical(ts,ceiling),contact=C.cars[id].pickup-L.pad;",
         "const head=VFit.vertical(ts,ceiling),study=supportStudy(ts,z),{contact,wheel0}=study;")
    edit("const rows=[[L.stroke,'nominal']],wheel0=tyreAtRest(ts);","""const rows=[[L.stroke,'nominal']];
    if(contact<-.000001||study.pad0<contact-.00001||!study.longOk)rows.push([-1,'support']);
    if(study.body0-margin<contact)rows.push([Math.max(0,study.body0-margin),'body']);""")
    # Prefer the specific tyre witness if it's the first steel interference.
    edit("if(wheel0-margin<contact)rows.push(", "if(wheel0-margin<contact)rows.unshift(")
    script=region(script,"    const recess=staticLift", "    const ends=[b.min.z-fore", """    const pits=decks.map(d=>box(d.base));
    const clear=key=>Math.min(...pits.map(p=>planGap(p,sets[key].b)));
    const pitBench=clear('bench'),pitWall=clear('masonry'),pitConsole=clear('console'),
      pitClear=Math.min(pitBench,pitWall,pitConsole);
    if(pitClear<margin-1e-7)rows.push([-1,'pit']);
""")
    edit("Math.floor((first+1e-9)*100)/100", "Math.floor((first+1e-8)*200)/200")
    edit("return {ts,ct,wheel0,paint:", "return {ts,ct,...study,pitConsole,paint:")
    edit("x,z,st.len,", "x,z,st.pads,")
    edit("      const car=C.cars[id],padX=.675-.12,padHalf=.145/2,halfPan=car.panWidth/2;\n","")
    edit("door:gap(ct,baselines.doorSet),bench:", "door:gap(ct,baselines.doorSet),console:gap(ct,sets.console),bench:")
    script=region(script, "rise:dy,tyreGap:f.wheel0", "ok:f.max!==null", """pitConsole:f.pitConsole,rise:dy,
        contact:f.contact,tyreGap:f.wheel0+dy-h,bodyGap:f.body0+dy-h,verticalPadGap:f.contact+dy-h,
        firstPadGap:f.pad0+dy-h,padFront:f.padFront,padRear:f.padRear,panEdge:f.panEdge,padOverlap:f.padOverlap,
        inner:f.inner,outer:f.outer,tyreEnds:f.tyreEnds,bumperOutside:f.bumperOutside,axleOutside:f.axleOutside,longOk:f.longOk,""")
    edit("lift:{paint:", "lift:{console:gap(t,sets.console),paint:")
    edit("if(fit.pair[st.id].pitWall<margin)", "if(fit.pair[st.id].pitWall<margin-1e-7)")
    edit("if(fit.pitClear<margin||", "if(fit.pitClear<margin-1e-7||")
    edit("['x','z','h','len']", "['x','z','h','pads']")
    edit("return {state,fit:()=>fit,lastRefusal:", "return {state,measureWallGap:wallGap,fit:()=>fit,lastRefusal:")
    edit("['x','z','h','len','ach']", "['x','z','h','ach']",2)
    edit("const opts={car:st.id,", "const opts={pads:st.pads,car:st.id,")
    edit("[['car','id'],", "[['pads','pads'],['car','id'],")
    edit("pair:fit.pair,bays:fit.bays", "pair:fit.pair,lift:fit.lift,bays:fit.bays")
    edit("'propunere comună'","'comparație ipotetică la același ax'")
    edit("platforme ${fmt(ps.len)} m", "platouri fixe · ${ps.pads}")
    edit("['Perete / ramă (3D)'","['La pupitru · mașină (3D)',(_,f)=>f.console],['Cuvă → pupitru (plan)',(_,f)=>f.pitConsole],['Perete / ramă (3D)'")
    edit("table(`Atelier ·", "table(`RAV509IF · atelier ·")
    edit("['Poziție statică',(_,f)=>", "['Gabarit simulat, nu aprobare de ridicare',(_,f)=>")
    edit("['Toc la intrare", """['Platou mobil → perete la cota cerută',()=> (proposal?.lift||fit.lift).masonry],
      ['Toc la intrare""")
    edit("Sprijin ilustrativ · patru tampoane 0,145 × 0,169","Sprijin ilustrativ · patru tampoane 0,120 × 0,160")
    edit("['Tampon față → muchie placă fixă (mm)',(_,f)=>mm(f.fixedFrontReserve)],",
         """['Tampon → margini platou · interior / exterior (mm)',(_,f)=>[f.inner,f.outer].map(mm).join(' / ')],
      ['Proiecții pneu → capăt oțel · față / spate',(_,f)=>f.tyreEnds.map(fmt).join(' / ')],
      ['Depășire bare → capăt oțel · față / spate',(_,f)=>f.bumperOutside.map(fmt).join(' / ')],
      ['Platou → vehicul întreg · vertical',(_,f)=>f.bodyGap],
      ['Cursă la contactul tampon–planșeu proxy',(_,f)=>f.contact],""")
    edit("lungime platforme ${fmt(st.len)} m.", "platouri fixe de 1,580 m, set ${st.pads} (${mm(padH())} mm).")
    edit("Mecanism mobil → perete", "Mecanism mobil → pupitru ${fmt(fit.lift.console)} m; → banc ${fmt(fit.lift.bench)} m; → perete")
    script=region(script,"      `² Negativ", "    const t=fit.trailer;", """      `² Negativ = tamponul depășește planșeul proxy. Centre ipotetice la X ±0,550 / Z ±0,600 m; nici punctele portante, nici adaptoarele reale nu sunt verificate. `+
      `³ Liniuță la pneuri = fără suprapunere în plan. Valorile din tabel pentru cealaltă mașină sau pentru o cerere refuzată sunt ipotetice, nu o a doua mașină în scenă.`;
""")
    edit("(message ? (message+' Lungime platforme: '+fmt(ps.len)+' m.') : '')", "message")
    edit("    if(c&&!c.longOk)return 'rezervă longitudinală sub 25 mm la tampon / platou';",
         """    if(c&&!c.longOk)return 'suprapunere sau margine insuficientă la tampoanele ilustrative';
    if(c?.by==='support'&&!c.ok)return `set ${st.pads}: interferență de la repaus sau contact în afara planșeului proxy (${fmt(c.verticalPadGap)} m)`;""")
    edit("House · perete fix în atelier';apply()", "House · atelier / RAV509IF';apply()")
    html=before+marker+json.dumps(data,ensure_ascii=True,allow_nan=False,separators=(",",":")).replace("<","\\u003c")+"</script>"+script
    for token in ["TWS3","Twin Busch","twinbusch","v-leno","telescopic runner","sliding crosshead","fmt(st.len)"]:
        require(token not in html,"Stale product hook "+token)
    h=hashlib.sha256(html.encode()).hexdigest()
    if output.exists():
        require(hashlib.sha256(output.read_bytes()).hexdigest()==h, "Existing output differs; use a fresh directory")
    else:
        write_html(output,html)
    return h


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("parent",type=Path); p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    try: h=export(a.parent,a.out)
    except (OSError,ValueError) as e: p.exit(1,f"Render error: {e}\n")
    print(f"{a.out.resolve()}\nSHA-256 {h}")
