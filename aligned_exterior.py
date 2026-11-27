"""Second House alignment pass: finished bearings, thresholds and traced exterior circulation."""
import math
from geometry import box, clip, require
from site_layer import Batch
from refined_layer import Fixture


def pitched_paving(x0,x1,stations,base,slot):
    """Top strips first: the offline viewer samples these same vertices for walking."""
    m=Batch()
    for (z,y),(Z,Y) in zip(stations,stations[1:]):
        m.face((x0,y,z),(x0,Y,Z),(x1,Y,Z),(x1,y,z))
    for (z,y),(Z,Y) in zip(stations,stations[1:]):
        for x in (x0,x1):m.face((x,base,z),(x,base,Z),(x,Y,Z),(x,y,z))
    for z,y in (stations[0],stations[-1]):
        m.face((x0,base,z),(x1,base,z),(x1,y,z),(x0,y,z))
    return dict(m.part(slot,[0,0,0]),groundStrips=len(stations)-1,walkBase=base)


def deck_y(z):
    return -.01*(z-13.20)


def scribe_foot(p,top,datum):
    """Plumb post, horizontal top, base cut to the local fall at all four corners."""
    x,_,z=p["box"];w,_,d=p["size"];r=math.radians(p.get("yaw",0))
    ring=[(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2)]
    heights=[datum(z+v*math.cos(r)-u*math.sin(r)) for u,v in ring]
    h=top-min(heights);cy=top-h/2
    hi=[(u,top-cy,v) for u,v in ring];lo=[(u,y-cy,v) for (u,v),y in zip(ring,heights)]
    b=Batch();b.face(*hi[::-1]);b.face(*lo)
    for i in range(4):b.face(lo[i-1],hi[i-1],hi[i],lo[i])
    p["profile"]=[b.v[i] for i in b.indices];p["box"][1]=cy;p["size"]=list(p["size"]);p["size"][1]=h
    p.pop("corner_radius",None)


def rear(add,groups):
    paving=next(g["parts"] for g in groups if g["name"]=="Site paving and terrace")
    deck,=[p for p in paving if p.get("box",[0,0,0])[2]==15.12]
    step,=[p for p in paving if p.get("box",[0,0,0])[2]==17.39]
    paving.remove(deck);paving.remove(step)
    # Notch at the living-room projection; keep the kitchen threshold at ±0.00.
    for a,c,b,d in [(.175,5.455,13.20,14.20),(.175,5.955,14.20,17.20)]:
        paving.append(pitched_paving(a,c,[(b,deck_y(b)),(d,deck_y(d))],-.455,"stone"))
    for edge,direction,near,far in [(.175,-1,15.59,16.59),(5.955,1,14.20,15.20)]:
        for i in (0,1):
            l,r=sorted((edge+direction*i*.30,edge+direction*(i+1)*.30))
            top=lambda z:-.45+(deck_y(z)+.45)*(2-i)/3
            paving.append(pitched_paving(l,r,[(near,top(near)),(far,top(far))],-.455,"stone"))
    for g in groups:
        if g.get("room")!="Rear terrace":continue
        feet=[p for p in g["parts"] if abs(p["box"][1]-p["size"][1]/2+.02)<1e-6]
        require(len(feet)==4,"Expected four terrace feet")
        level=deck_y(sum(p["box"][2] for p in feet)/4)
        for p in g["parts"]:
            p["box"][1]+=level+.02
            if p in feet:scribe_foot(p,p["box"][1]+p["size"][1]/2,deck_y)
    perg=next(g["parts"] for g in groups if g["name"].startswith("Timber pergolas"))
    old=[p for p in perg if p["box"][2]==17 and p["size"][1]>2]
    for p in old:perg.remove(p)
    header,=[p for p in perg if p["box"][2]==17 and p["size"][0]>5]
    header["box"][0]=3.05;header["size"]=[5.72,.26,.16]
    for p in perg:
        if abs(p["box"][2]-15.12)<.001 and p["size"][2]>3.9:
            p["box"][2]=(13.2675+16.92)/2;p["size"]=[p["size"][0],.17,16.92-13.2675]
            if p["box"][0]<.35 or p["box"][0]>5.60:
                p["size"][0:2]=[.16,.26];p["box"][1]=2.84
                if p["box"][0]>5.60:p["box"][0]=5.79
    # West and east side returns are separate from the closely paired mid-beam bearings.
    for x,z in [(x,17.) for x in (.31,3.98,4.23,5.79)]+[
            (.31,z) for z in (13.32,13.64,13.96,16.68)]+[(5.79,16.68)]:
        p=box([x,1.3,z],[.16,2.7,.16],"timber")
        scribe_foot(p,2.71,deck_y);perg.append(p)
    # Rear ledger over the east notch: the last edge bearer must actually engage it.
    ledger=next(g["parts"][0] for g in groups if "glulam ledger" in g["name"])
    ledger["size"][0]=5.70;ledger["box"][0]=3.04
    # The corresponding p.1/p.6 north row has eight, not an even five-post repeat.
    old=[p for p in perg if p["box"][2]==-1.45 and p["size"][1]>2]
    for p in old:perg.remove(p)
    for x in (.31,.565,2.81,4.52,6.24,7.96,9.68,11.39):
        perg.append(box([x,1.09,-1.45],[.15,3.08,.15],"timber"))
    for p in perg:
        if 0<p["box"][2]<7 and p["size"][1]>2:
            top=2.53 if p["box"][2]<.1 else 2.63
            p["size"]=[.15,top+.45,.15];p["box"][1]=(top-.45)/2


def approach(add):
    head=4.70;toe=head-.15/.035
    rise=lambda z:-.30+(z-head)*.035
    stations=[(toe,-.45)]
    for i in range(47):
        z=toe+.067+i*.088
        for delta,groove in [(0,0),(.004,-.0017),(.009,-.0017),(.013,0)]:
            stations.append((z+delta,rise(z+delta)+groove))
    stations.append((head,-.30))
    add("Garage · transverse-striated concrete ramp",0,[1,4,6],
        [pitched_paving(-6,0,stations,-.465,"a_concrete")])
    f=Fixture(0,0,0)
    f.box(-3,-.456,toe-.055,6,.012,.104,"a_frame",walkable=True)
    grate=Batch()
    for i in range(116):grate.box(-5.976+i*.052,-.4497,toe-.055,.027,.001,.094)
    add("Garage · low-side linear drain",0,[1],f.parts+[grate.part("b_silver",[0,0,0])])
    f=Fixture(0,0,0)
    def stone(x,z,angle):
        p=f.box(x,-.461,z,.80,.052,.307,"a_flag",.019,walkable=True)
        p["yaw"]=angle
    # Fan from the parking apron; rectangular flags continue around both annex sides.
    for i in range(13):
        a=(i+.45)*math.pi/26
        stone(-10.52+3.99*math.sin(a),4.74-3.99*math.cos(a),90-math.degrees(a))
    for i in range(27):stone(-6.53,4.86+i*.435,0)
    for i in range(14):stone(-5.945+i*.42,16.17,90)
    add("Annex · west and rear stepping-stone path",0,[1,7,9],f.parts)


def opening_and_lining(add,groups):
    wall=next(g["parts"] for g in groups if g["name"].startswith("Mansard perimeter"))
    old=[p for p in wall if p["box"][0]==9.8 and 5.97<p["box"][2]<7.88]
    require(len(old)==8,"Unexpected existing east stair bay")
    for p in old:wall.remove(p)
    x=9.8;z0,z1=5.97,7.77;floor,head,cap=3.15,4.47,5.05
    def span(a,b,y,Y,depth,slot):
        wall.append(box([x,(y+Y)/2,(a+b)/2],[b-a,Y-y,depth],slot,-90))
    span(z1,7.88,floor,cap,.4,"render");span(z0,z1,head,cap,.4,"render")
    rim=.095
    for a,b in [(z0,z0+rim),(z1-rim,z1)]:span(a,b,floor,head,.091,"frame")
    for y,Y in [(floor,floor+rim),(head-rim,head)]:span(z0+rim,z1-rim,y,Y,.091,"frame")
    span(z0+rim,z1-rim,floor+rim,head-rim,.025,"glass")
    doors=next(g["parts"] for g in groups if g["name"].startswith("Ground envelope"))
    for z,slot,style in [(2.98,"a_panel","greyPanel"),(13.0,"glass","terraceGlass")]:
        p,=[p for p in doors if p.get("door") and p["box"][2]==z]
        p["slot"]=slot;p["leafStyle"]=style
    roof=next(g["parts"] for g in groups if g["name"].startswith("Annex asymmetric"))
    boards=[];roof_y=lambda z:2.30+2.08*((z-4.70)/6.085 if z<10.785 else (13-z)/2.215)
    for p in roof[:2]:
        poly=p["face"]
        for axis,edge,sign in [(0,-5.796,1),(0,-.214,-1),(2,4.914,1),(2,12.795,-1)]:
            poly=clip(poly,axis,edge,sign)
        poly=[[x,y-.16,z] for x,y,z in poly]
        boards.extend(dict(face=[poly[0],a,b],slot="a_lining",overhead=True) for a,b in zip(poly[1:],poly[2:]))
    x=-5.789
    for z,Z in [(4.914,10.785),(10.785,12.795)]:
        gable=clip([[x,2.28,z],[x,roof_y(z)-.16,z],[x,roof_y(Z)-.16,Z],[x,2.28,Z]],1,2.293,1)
        boards.extend(dict(face=[gable[0],a,b],slot="a_lining") for a,b in zip(gable[1:],gable[2:]))
    z=12.789
    boards.append(dict(face=[[u,y,z] for u,y in [(-5.796,2.293),(-.214,2.293),
        (-.214,roof_y(z)-.16),(-5.796,roof_y(z)-.16)]],slot="a_lining"))
    add("Annex · painted inner pitches and west gable",0,[4,7],boards,roof=True)


def repair(add,groups,styles):
    rear(add,groups);approach(add);opening_and_lining(add,groups)
    styles.update({k:{"color":v} for k,v in {"a_concrete":"#bbb8af","a_flag":"#c7c2ae",
        "a_lining":"#e8e4d8","a_panel":"#717378","a_panelface":"#898b89"}.items()})


def join_living_return(groups):
    """P.1: butt the short west return against the inside of the south wall."""
    walls=next(g["parts"] for g in groups if g["name"]=="Ground envelope and openings")
    west,=[p for p in walls if p.get("box")==[5.65,1.51,13.5] and p["slot"]=="render"]
    south,=[p for p in walls if p.get("box")==[6.075,1.51,14.0] and p["slot"]=="render"]
    require(west["yaw"]==-90 and south["yaw"]==0 and west["size"]==[1,3.02,.4]
            and south["size"]==[.85,3.02,.4],"Expected the traced living-room corner")
    cx,cz=west["box"][0],south["box"][2]
    half=south["size"][2]/2
    west["box"][2]-=half/2;west["size"]=[west["size"][0]-half,*west["size"][1:]]
    south["box"][0]-=half/2;south["size"]=[south["size"][0]+half,*south["size"][1:]]

    # Keep the structural slab intact. Assign only the 195 × 200 mm under the
    # completed junction to the existing plinth finish, at the same two datums.
    footprint=next(g["parts"] for g in groups if g["name"]=="Ground footprint")
    finish,=[p for p in footprint if p["slot"]=="floor"]
    ring=finish["slab"][0]
    i=ring.index([5.455,14.2]);edge,end=ring[i]
    require(ring[i-1][1]==end and ring[i+1][0]==edge and
            abs(cz+half-end)<1e-8,"Unexpected south plinth outline")
    finish["slab"]=[[*ring[:i],[cx,end],[cx,cz],[edge,cz],*ring[i+1:]]]
    footprint.append(dict(slab=[[[edge,cz],[cx,cz],[cx,end],[edge,end]]],
                          base=finish["base"],depth=finish["depth"],slot=finish["edge_slot"]))
