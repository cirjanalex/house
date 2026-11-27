"""Private-reference House amendment. The pinned parent is the complete offline build input."""
import hashlib
import json
import math
from pathlib import Path
import random

from geometry import box, clip, require, wall
from refined_layer import Fixture, ellipse, section
from site_layer import Batch, foliage


ROOT = Path(__file__).resolve().parent
PARENT = "854f8ea487d71787c1a2d25c19a05c31ecded3479e4b2f7d4b2b7475e37502b2"
ID = "house-architect-v1"


def annex(one, add):
    parts = one("Attached annex")["parts"]
    old = [p for p in parts if p.get("yaw")==-90 and p.get("box",[None])[0]==-5.9]
    spec = dict(wall=[[-5.9,4.7],[-5.9,13]], t=.22, h=2.60)
    require(old == wall(dict(spec,openings=[[1.32,1,.8,2.3,"window"],[4.05,1,.8,2.3,"window"]]),
                        -.30,"render"), "Unrecognised west annex wall")
    parts[:] = [p for p in parts if p not in old]
    new = wall(dict(spec,openings=[[s,1,.55,2.60,"window"] for s in (1.30,4.00)]),-.30,"render")
    coat = one("Annex and living projection")["parts"]
    coat[:] = [p for p in coat if not all(abs(v[0]+6.012)<1e-6 for v in p["face"])]
    for p in new:
        x,y,z=p["box"]; w,h,d=p["size"]
        if p["slot"]=="glass":
            # One through-frame transom, with separate panes meeting its rebates on both faces.
            low,high=y-h/2,y+h/2; mid=1.36; half=.019
            for a,b,slot,depth in [(low,mid-half,"glass",d),(mid-half,mid+half,"frame",.080),
                                   (mid+half,high,"glass",d)]:
                parts.append(box([x,(a+b)/2,z],[w,b-a,depth],slot,-90))
            continue
        if p["slot"]=="render":
            if w==1:  # Seat the compiled through-sill in the masonry, not coplanar with it.
                p["size"][1]-=.025;p["box"][1]-=.0125
            cy,H=p["box"][1],p["size"][1]
            coat.append(dict(slot="a_plaster",face=[[-6.012,cy+j*H/2,z+i*w/2]
                              for i,j in [(-1,-1),(1,-1),(1,1),(-1,1)]]))
        parts.append(p)
    for name in ("west A","west B","hobby south"):
        one("Annex · multi-light bars "+name)["parts"].clear()
    # Keep the approved tool bench outside the vehicle bay, but on solid wall between lights.
    for p in one("BROR workbench",room="Garage workshop")["parts"]:
        p["box"][2]-=1.81
    lining=one("Annex · painted inner pitches")["parts"]
    for p in lining:
        if all(abs(x+5.789)<1e-6 for x,_,_ in p["face"]):
            for v in p["face"]:v[1]=max(v[1],2.30)
    heads=one("Annex · multi-light bars west A")
    heads.update(name="West annex · full-depth heads under gable",parts=[
        dict(face=[[x,2.30,z+dz] for x,dz in [(-6.024,-.5),(-5.789,-.5),(-5.789,.5),(-6.024,.5)]],
             slot="a_lining") for z in (6.50,9.20)])
    hobby=one("Annex · multi-light bars hobby south")
    hobby.update(name="Hobby · primary rear lights",parts=[
        box([x,1.30,12.9],[.046,1.30,.084],"frame") for x in (-4.1,-1.9)])

    leaf,=[p for p in parts if p.get("door",{}).get("kind")=="garage"]
    leaf["slot"]="r_section"
    entry,=[p for p in parts if p.get("door",{}).get("kind")=="door"]
    entry.update(slot="glass",leafStyle="terraceGlass")
    f=Fixture(0,0,0)
    for x in (-5.58,-2.14):
        f.box(x,2.03,4.658,.105,.17,.086,"r_section",.012)
        f.box(x,1.951,4.646,.079,.011,.057,"b_lamp",.005)
    add("Workshop entry · shielded downlights",[1,6],f.parts)

    gable=one("West annex gable")
    outline=one("Annex asymmetric")["parts"][2]["face"]
    boards=Batch()
    for i in range(108):
        pitch=8.30/108
        poly=clip(clip(outline,2,4.7+i*pitch+.002,1),2,4.7+(i+1)*pitch-.002,-1)
        if len(poly)<3:continue
        back=[(-6.002,y,z) for _,y,z in poly];front=[(-6.024,y,z) for _,y,z in poly]
        for j in range(1,len(poly)-1): boards.face(front[0],front[j],front[j+1])
        for j in range(len(poly)): boards.face(back[j-1],front[j-1],front[j],back[j])
    gable.update(parts=[boards.part("r_oak",[0,0,0])],roof=True)
    # Close the projecting rake, underside and eave returns without overlaying either roof plane.
    trim=Batch()
    for end in (4.7,13.0):
        ext=end+(-.065 if end<10 else .065); ridge=10.785
        height=lambda z: 2.30+2.08*(z-end)/(ridge-end)
        def strip(x,X,z,Z,drop):
            trim.face((x,height(z)+.006,z),(X,height(z)+.006,z),
                      (X,height(Z)+.006,Z),(x,height(Z)+.006,Z))
            trim.face((x,height(z)-drop,z),(x,height(Z)-drop,Z),
                      (X,height(Z)-drop,Z),(X,height(z)-drop,z))
        strip(-6.11,-6,ext,ridge,.091)
        trim.face(*[(-6.11,height(z)+d,z) for z,d in [(ext,.006),(ridge,.006),(ridge,-.091),(ext,-.091)]])
        strip(-6,0,ext,end,.091)
        trim.face(*[(x,height(ext)+d,ext) for x,d in [(-6.11,.006),(0,.006),(0,-.091),(-6.11,-.091)]])
    add("Annex · folded rake caps and returning eaves",[3,4,7], [trim.part("e_fascia",[0,0,0])],roof=True)


def entrance(one):
    for key,station in [("Coat storage",5.04),("KALLAX four-cube shelf",3.99)]:
        # Both shelves have local fronts on +Z; turn their fronts into the hall (+X).
        g=one(key,room="Entrance hall");ps=g["parts"]
        backing=max(p["box"][0]+p["size"][2]/2 for p in ps)
        floor=min(p["box"][1]-p["size"][1]/2 for p in ps)
        start=min(p["box"][2]-p["size"][0]/2 for p in ps)
        end=max(p["box"][2]+p["size"][0]/2 for p in ps)
        for p in ps:
            x,y,z=p["box"]
            require(p["yaw"]==-90,"Unexpected storage orientation")
            p.update(box=[.40+backing-x,y-floor,station+(start+end)/2-z],yaw=90)


def porch(one):
    paving=one("Site paving and terrace")["parts"]
    landing,=[p for p in paving if p.get("box")==[1.5075,-.225,1.94]]
    require(landing["size"]==[1.985,.45,2.08],"Unexpected entrance landing")
    # Butt the landing against the structural slab rather than running it through the plinth.
    landing["box"][2]=1.84;landing["size"][2]=1.88  # z=.90 … 2.78
    footprint=one("Ground footprint")["parts"]
    wood,=[p for p in footprint if p["slot"]=="floor"]
    ring=wood["slab"][0]
    require(ring[-2:]==[[0,2.78],[2.5,2.78]],"Unexpected porch notch")
    ring[-1:]=[[.515,2.78],[.515,2.98],[2.5,2.98]]
    footprint.append(dict(slab=[[[.515,2.78],[2.5,2.78],[2.5,2.98],[.515,2.98]]],
                          base=wood["base"],depth=wood["depth"],slot="stone"))

    f=Fixture(0,0,0)
    def rectangle(x,X,z,Z,y,Y,slot):
        f.box((x+X)/2,(y+Y)/2,(z+Z)/2,X-x,Y-y,Z-z,slot)
    # p.1 leaves a narrow pocket beside (not on) the steps. 01/09 show a planted masonry rim.
    for outside,inside,y,Y,slot in [((.045,.515,.31,2.78),(.177,.443,.39,2.70),-.45,.432,"a_plaster"),
                                    ((.035,.515,.30,2.78),(.185,.435,.40,2.69),.432,.47,"stone")]:
        x,X,z,Z=outside;i,I,j,J=inside
        for r in [(x,i,z,Z),(I,X,z,Z),(i,I,z,j),(i,I,J,Z)]:rectangle(*r,y,Y,slot)
    rectangle(.177,.443,.39,2.70,-.45,.397,"r_soil")
    blades=Batch();rng=random.Random(609)
    for i in range(7):
        for j in range(28):
            a=rng.random()*math.tau;s,c=math.sin(a),math.cos(a)
            x=.310+.041*s;z=.57+i*.321+.071*c
            h=rng.uniform(.19,.42);w=rng.uniform(.008,.015);dx=.082*s;dz=.103*c
            tip=(x+dx,.396+h,z+dz)
            mid=(x+dx*.42,.396+h*.76,z+dz*.42)
            blades.face((x-w*c,.390,z+w*s),(x+w*c,.390,z-w*s),
                        (mid[0]+w*.58*c,mid[1],mid[2]-w*.58*s),(mid[0]-w*.58*c,mid[1],mid[2]+w*.58*s))
            blades.face((mid[0]-w*.58*c,mid[1],mid[2]+w*.58*s),(mid[0]+w*.58*c,mid[1],mid[2]-w*.58*s),tip)
    one("West entrance · masonry side parapet")["parts"]=f.parts+[blades.part("r_leaf",[0,0,0])]


def living(one,add):
    shell=one("Ground envelope")["parts"]
    sill,=[p for p in shell if p["slot"]=="stone" and p["box"][2]==14 and p["size"][0]>3]
    x,y,z=sill["box"];w,h,d=sill["size"]
    # Keep the weather sill to the glass; return a low timber perch into the room.
    sill["box"][2]=z+d/4;sill["size"][2]=d/2
    f=Fixture(x,0,z)
    f.box(0,.271,-.266,w,.058,.532,"a_ash",.009)
    for u in (-w*.40,0,w*.40):f.box(u,.208,-.265,.051,.07,.155,"r_oak")
    add("Living · deep timber window board",[1,5,9],f.parts)
    f=Fixture(2.49,0,13.245);f.box(0,2.32,0,2.74,.073,.082,"a_reveal")
    blades=Batch()
    for j in range(10):
        y=2.26-j*.053
        blades.face((-1.326,y,-.021),(1.326,y,-.021),(1.326,y-.014,.034),(-1.326,y-.014,.034))
    for x in (-1.337,1.337):f.box(x,1.70,0,.022,1.20,.033,"a_bronze")
    add("Rear kitchen · part-lowered exterior blind",[1,9],f.parts+[blades.part("a_bronze",[2.49,0,13.245])])
    screen=Batch()
    for i in range(48):
        screen.box(4.146,1.351,7.106+i*.046,.022,2.702,.033)
    add("Pantry return · fluted timber facing",[1],[
        box([4.137,1.351,8.19],[.004,2.702,2.23],"r_shadow"),screen.part("r_oak",[0,0,0])])
    lamp=one("Living · practical");f=Fixture(0,0,0)
    for x in (8.27,10.22):
        f.box(x,2.690,11.34,.043,.030,2.58,"r_shadow")
        for j in range(5):
            z=10.24+j*.55
            f.tube([(x,2.674,z),(x,2.584,z)],.037,"r_shadow")
            f.tube([(x,2.585,z),(x,2.580,z)],.029,"b_lamp")
    lamp["parts"]=f.parts
    table=one("Low rounded coffee table");f=Fixture(0,.007,0)
    for x,d,h in [(8.17,.68,.365),(8.87,.51,.425)]:
        f.shell("r_table",[section(ellipse(d*s,d*s,32),h+dy,11.38,x)
                          for s,dy in [(.80,-.040),(.99,-.015),(1,0)]],True,True,True)
        for a in range(3):
            angle=math.tau*a/3
            f.box(x+.32*d*math.cos(angle),(h-.025)/2,11.38+.32*d*math.sin(angle),
                  .024,h-.025,.024,"r_shadow",.005)
    table.update(parts=f.parts,size=[1.295,.425,.68],note="Pair of occasional tables on the original rug; original proxies.")
    for p in one("L sectional, west return")["parts"]:
        p["slot"]={"a_felt":"r_flax","a_cushion":"r_linen"}.get(p["slot"],p["slot"])


def outside(one,add):
    perg=one("Timber pergolas")
    for p in perg["parts"]:p["slot"]="r_oak"
    one("Terrace · glulam ledger")["parts"][0]["slot"]="r_oak"
    collars=Batch()
    for p in perg["parts"]:
        x,y,z=p["box"];w,h,d=p["size"]
        if z<7 and h>2:
            collars.box(x,y-h/2+.102,z,w+.005,.204,d+.005)
    add("Approach pergola · metal shoes",[1,6], [collars.part("b_silver",[0,0,0])])
    rng=random.Random(107)
    for x,z in [(-7.65,z) for z in (5.45,7.17,8.89,10.61,12.33,14.05)]+[
            (x,-2.37) for x in (3.77,5.55,7.38,9.31)]:
        b=Batch()
        height=rng.uniform(.36,.43)
        foliage(b,rng,0,height*.91,0,.40,height,.52,14)
        for i in range(8):
            a=(i+rng.random()*.45)*math.tau/8;r=rng.uniform(.18,.28)
            foliage(b,rng,.26*math.cos(a),r*.9,.38*math.sin(a),r,r,r*1.22,10)
        # Share the generated vertices so foliage shades continuously instead of like cut stone.
        unique=list(dict.fromkeys(map(tuple,b.v))); index={v:i for i,v in enumerate(unique)}
        b.indices=[index[tuple(b.v[i])] for i in b.indices];b.v=unique
        add("Low planted border · clipped shrub",[1,7],[b.part("r_leaf",[x,-.45,z],solid=True)],site=True)


def export(source,output,write_html):
    raw=source.read_bytes()
    require(hashlib.sha256(raw).hexdigest()==PARENT,"Expected the exact House aligned repair-3 export")
    protected={"shell","index","furnished","landscaped","house-refined","house-aligned"}
    require(output.resolve()!=source.resolve() and output.stem.casefold() not in protected,"Choose a new candidate output")
    text=raw.decode("utf-8")
    before,marker,rest=text.partition('id="scene-data">')
    payload,end,viewer=rest.partition("</script>")
    require(marker and end,"Missing embedded parent scene")
    data=json.loads(payload);groups=data["groups"]
    def one(name,room=None):
        g,=[g for g in groups if g["name"].startswith(name) and (not room or g.get("room")==room)]
        return g
    def add(name,pages,parts,**attrs):
        groups.append(dict(name=name,pages=pages,level=0,basis="Drawing and render comparison; original concept detailing",
                           parts=parts,**attrs))
    annex(one,add); entrance(one); porch(one); living(one,add); outside(one,add)
    groups[:]=[g for g in groups if g["parts"]]
    data["styles"].update({k:{"color":v} for k,v in {
        "r_oak":"#877661","r_shadow":"#50463d","r_section":"#8e8576","r_table":"#aa9884",
        "r_leaf":"#546d45","r_soil":"#5f4c38","r_flax":"#b9a98e","r_linen":"#d4c7ad"}.items()})
    data["architect"]={"id":ID,"repairs":["D01","T01","P01"],"parent_sha256":PARENT,"audit":json.loads(
        (ROOT/"examples/house/architect-audit.json").read_text("utf-8"))}
    anchor="    showCanopy('extended');"
    require(viewer.count(anchor)==1,"Unrecognised parent viewer")
    viewer=viewer.replace(anchor,anchor+"\n"+(ROOT/"web/architect.js").read_text("utf-8"))
    html=before+marker+json.dumps(data,ensure_ascii=True,allow_nan=False,separators=(",",":")).replace("<","\\u003c")+end+viewer
    write_html(output,html)
    return dict(output=str(output.resolve()),sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
                parent_sha256=PARENT,geometry_sha256=data["hash"])
