"""Drawing-guided House amendment; applied after the approved furniture/site/refinement."""
import json
import math
from geometry import clip, digest, require
from layers import furniture
from site_layer import Batch
from refined_layer import Fixture, ellipse, section
from aligned_furniture import populate


COLORS={"a_ash":"#c7a582","a_teak":"#aa8161","a_frame":"#454846","a_putty":"#d6d2c0",
        "a_felt":"#75877b","a_cushion":"#a1ac94","a_rug":"#c5b7a3","a_screen":"#27383f",
        "a_window":"#586973","a_wood":"#c79a70","a_bench":"#d7b389","a_trim":"#a77752",
        "a_coal":"#545454","a_stone":"#797a72","a_canvas":"#f2e4c9","a_bronze":"#79665a",
        "a_reveal":"#b3b0a7","a_plaster":"#dad9d1"}


def sauna(add,groups):
    a,b,c,d=.404,.404,2.211,1.620
    floor=3.15
    hips=next(g["parts"] for g in groups if g["name"].startswith("Hipped roof"))
    ceiling=[]
    for p in hips:
        if not p.get("overhead"):continue
        poly=p["face"]
        for axis,edge,sign in [(0,a,1),(0,c,-1),(2,b,1),(2,d,-1)]:
            poly=clip(poly,axis,edge,sign)
        for i in range(1,len(poly)-1):
            tri=[[x,y-.017,z] for x,y,z in (poly[0],poly[i],poly[i+1])]
            if abs(sum(x*Z-X*z for (x,y,z),(X,Y,Z) in zip(tri,tri[1:]+tri[:1])))>1e-8:
                ceiling.append(dict(face=tri,slot="a_wood",overhead=True))
    require(ceiling,"Sauna ceiling must follow the actual host lining")
    add("Sauna · fitted timber ceiling",1,[2,4,5],ceiling)
    bat,back=Batch(),Batch()
    def boards(x,z,X,Z,lower=0):
        length=math.hypot(X-x,Z-z)
        def apex(px,pz):return 4.47+min(px+1,pz+1)*(8.14-4.47)/6-.48-.016
        ox=-.002 if x==X==a else .002 if x==X==c else 0
        oz=-.002 if z==Z==b else .002 if z==Z==d else 0
        back.face((x+ox,floor+lower,z+oz),(X+ox,floor+lower,Z+oz),
                  (X+ox,apex(X,Z),Z+oz),(x+ox,apex(x,z),z+oz))
        for i in range(math.ceil(length/.088)):
            u=i*.088+.0008;v=min(length,(i+1)*.088-.0008)
            if v<=u:continue
            coords=[(x+(X-x)*s/length,z+(Z-z)*s/length) for s in (u,v)]
            (x0,z0),(x1,z1)=coords
            if min(apex(x0,z0),apex(x1,z1))<floor+lower:continue
            bat.face((x0,floor+lower,z0),(x1,floor+lower,z1),(x1,apex(x1,z1),z1),(x0,apex(x0,z0),z0))
    # Continuous lining, except at the actual glazed opening and its head.
    boards(a,b,c,b);boards(a,d,a,b);boards(c,b,c,d)
    boards(c,d,1.943,d);boards(1.157,d,a,d);boards(1.943,d,1.157,d,1.903)
    add("Sauna · vertical wood lining to the sloping soffit",1,[2,4],
        [back.part("a_trim",[0,0,0]),bat.part("a_wood",[0,0,0]),
         dict(face=[[a,floor+.001,b],[a,floor+.001,d],[c,floor+.001,d],[c,floor+.001,b]],slot="b_tile")])
    f=Fixture(0,floor,0)
    for x,z,w,dep in [(1.085,.628,1.306,.407),(.644,1.219,.405,.755)]:
        along=w>dep
        for i in range(5):
            f.box(x if along else x+(i-2)*.082,.515,z+(i-2)*.082 if along else z,
                  w if along else .073,.041,.073 if along else dep,"a_bench",.01)
        for side in (-1,1):
            u=x+side*(w/2-.081) if along else x
            t=z if along else z+side*(dep/2-.058)
            f.box(u,.456,t,.055 if along else w-.04,.075,dep-.04 if along else .055,"a_trim")
            for s in (-1,1):
                f.box(u if along else u+s*.145,.226,t+s*.14 if along else t,.047,.452,.047,"a_trim",.006)
    for h in (.76,.891,1.022):
        f.box(1.085,h,.457,1.306,.089,.045,"a_bench",.012)
        f.box(.456,h,1.035,.045,.089,1.11,"a_bench",.012)
    for x in (.64,1.54):f.box(x,.895,.423,.04,.45,.031,"a_trim")
    for z in (.79,1.44):f.box(.422,.895,z,.031,.45,.04,"a_trim")
    add("Sauna · L bench and backrests · dimensional PROXY",1,[2],f.parts,
        furniture=True,room="Sauna",size=[1.3315,1.12,1.193],use="Joined slatted seating in the master bath enclosure",
        note="Original cabin study; seat profiles and materials schematic.")
    f=Fixture(2.001,floor,.657)
    f.shell("a_frame",[section(ellipse(w,t),h) for w,t,h in [
        (.223,.237,.001),(.223,.237,.051),(.238,.258,.06),(.273,.284,.14),
        (.32,.33,.52),(.324,.334,.57)]],True,True,True)
    for h in (.185,.29,.395,.508):
        f.shell("b_silver",[section(ellipse(.292+(h-.18)*.12,.299+(h-.18)*.12),h),
                              section(ellipse(.294+(h-.18)*.12,.301+(h-.18)*.12),h+.009)])
    for i in range(10):
        r=.103 if i<7 else .044;ang=i*math.tau/7
        x,z=r*math.cos(ang),r*math.sin(ang);y=.573+(.049 if i>=7 else 0)
        f.shell("a_stone" if i%3 else "a_coal",[section(ellipse(w,d,7),y+k,z,x)
                for w,d,k in [(.056,.05,-.021),(.10,.091,.012),(.073,.064,.046),(.029,.031,.061)]],True)
    for x in (-.212,.17):
        for z in (-.203,.214):
            f.box(x,.324,z,.036,.646,.036,"a_trim",.006)
    for h in (.32,.575):
        for z in (-.203,.214):f.box(-.021,h,z,.421,.047,.035,"a_bench",.008)
        f.box(-.212,h,.005,.034,.047,.423,"a_bench",.008)
    add("Sauna · schematic stone heater and timber guard",1,[2],f.parts)
    f=Fixture(2.153,floor,.657,-90)
    f.box(0,1.32,-.022,.19,.276,.066,"a_trim",.015)
    f.box(0,1.325,.020,.147,.219,.026,"b_lamp",.012)
    for y in (1.223,1.282,1.341,1.400):f.box(0,y,.051,.192,.025,.052,"a_bench",.01)
    for x in (-.086,.086):f.box(x,1.32,.031,.023,.24,.055,"a_trim",.006)
    add("Sauna · shielded warm wall light (illustrative)",1,[2],f.parts)
    wall=next(g for g in groups if g["name"].startswith("Mansard partitions"))
    leaf,=[p for p in wall["parts"] if "door" in p and abs(p["box"][2]-1.67)<.001]
    leaf["slot"]="b_glass";leaf["saunaLeaf"]=True


def canopy(add,groups):
    perg=next(g for g in groups if g["name"].startswith("Timber pergolas"))
    # Only the rear edge changes; the annotation is from finished floor to the member top.
    for p in perg["parts"]:
        x,y,z=p["box"]
        if z>13 and y>2.7:p["box"][1]=2.97-p["size"][1]/2
    f=Fixture(0,0,0)
    f.box(3.01,2.835,13.21,5.60,.26,.115,"timber")
    for x in (.36,3.01,5.66):
        f.box(x,2.767,15.1,.059,.089,3.84,"a_bronze",.012)
    f.box(3.01,2.746,13.31,5.34,.192,.204,"a_bronze",.037)
    add("Terrace · glulam ledger, headbox and guides",0,[2,5,7,8],f.parts)
    def fold_length(travel,drop):
        return sum(math.hypot(travel/84,drop*(math.sin(i*math.pi/12)-math.sin((i+1)*math.pi/12)))
                   for i in range(12))
    lo,hi=.094,.35
    for _ in range(28):
        mid=(lo+hi)/2
        if fold_length(.48,mid)<fold_length(3.59,.094):lo=mid
        else:hi=mid
    for state,travel,drop in [("extended",3.59,.094),("stowed",.48,(lo+hi)/2)]:
        parts=[];sail=Batch()
        for x,X in [(.392,2.981),(3.039,5.628)]:
            for n in range(7):
                for j in range(12):
                    def pt(u,k):
                        t=(j+k)/12
                        return (u,2.734-drop*math.sin(t*math.pi),13.40+travel*(n+t)/7)
                    sail.face(pt(x,0),pt(X,0),pt(X,1),pt(x,1))
        parts.append(sail.part("a_canvas",[0,0,0]))
        bars=Batch()
        for i in range(8):bars.box(3.01,2.739,13.40+travel*i/7,5.33,.034,.031)
        parts.append(bars.part("a_bronze",[0,0,0]))
        add("Terrace · "+state+" pleated outdoor fabric",0,[2,5,7,8],parts,canopyState=state)


def details(add,groups):
    # The low annex floor had a second, 1.80-world-Y lintel behind the same 2.10 m
    # house door. Continue that door's reveal through the annex skin (p.1 / A–A).
    annex=next(g for g in groups if g["name"].startswith("Attached annex"))
    lintel,=[p for p in annex["parts"] if "box" in p and
             all(abs(a-b)<.001 for a,b in zip(p["box"],[-.11,2.05,6.30]))]
    lintel["box"][1]=2.20;lintel["size"][1]=.20
    paint=[]
    for group,planes in [(annex,[(0,-6.01,-1),(2,4.70,-1),(2,13.01,1)]),
            (next(g for g in groups if g["name"].startswith("Ground envelope")),
             [(0,11.49,1),(2,14.20,1),(2,7.80,-1),(0,5.45,-1)])]:
        for p in group["parts"]:
            if p["slot"]!="render" or "box" not in p:continue
            x,y,z=p["box"];w,h,d=p["size"];r=math.radians(p["yaw"])
            dx=(abs(math.cos(r))*w+abs(math.sin(r))*d)/2
            dz=(abs(math.sin(r))*w+abs(math.cos(r))*d)/2
            for axis,plane,sign in planes:
                if abs((x if axis==0 else z)+sign*(dx if axis==0 else dz)-plane)>.001:continue
                coord=plane+sign*.002;lo,hi=(z-dz,z+dz) if axis==0 else (x-dx,x+dx)
                # Meet the two offset finish faces at the same outer arris.
                if axis==0 and plane==5.45 and abs(hi-14.20)<1e-8:hi=14.202
                if axis==2 and plane==14.20 and abs(lo-5.45)<1e-8:lo=5.448
                paint.append(dict(slot="a_plaster",face=[
                    [coord,v,u] if axis==0 else [u,v,coord]
                    for u,v in [(lo,y-h/2),(hi,y-h/2),(hi,y+h/2),(lo,y+h/2)]]))
    add("Annex and living projection · light grey outer render",0,[6,7,8,9],paint)
    f=Fixture(0,0,0)
    treads=next(g["parts"] for g in groups if g["name"]=="Return stair and landing")
    for z,start,end in [(7.88,(6.14,1.04),(8.27,2.375)),(5.75,(5.91,3.97),(8.27,2.375))]:
        (a,y),(b,Y)=start,end
        f.tube([(a,y,z),(b,Y,z),(9.40,Y,z)],.032,"a_ash")
        for x in [a+(b-a)*i/5 for i in range(6)]+[9.40]:
            tread,=[p for p in treads if p.get("walkable") and
                   all(abs(v-p["box"][k])<p["size"][k]/2 for k,v in [(0,x),(2,z)])]
            floor=tread["box"][1]+tread["size"][1]/2
            left=max(x-.036,tread["box"][0]-tread["size"][0]/2)
            right=min(x+.036,tread["box"][0]+tread["size"][0]/2)
            f.box((left+right)/2,floor+.008,z,right-left,.016,.072,"b_silver",.004)
            top=y+(Y-y)*min(1,(x-a)/(b-a))
            f.box(x,(top+floor+.012)/2,z,.029,top-floor-.012,.029,"a_frame")
    f.tube([(9.4,2.375,5.75),(9.4,2.375,7.88)],.032,"a_ash")
    add("Stair · sloping handrails and landing return",0,[1,2,4],f.parts)
    for x,z,w,sill,head,level in [(8.0275,14.206,3.055,.30,2.30,0),(4.59,13.206,1.74,3.45,5.45,1)]:
        f=Fixture(x,0,z);f.box(0,head+.019,0,w+.047,.10,.079,"a_reveal",.009)
        for u in (-1,1):f.box(u*(w/2-.015),(sill+head)/2,.009,.025,head-sill,.036,"a_bronze")
        slats=Batch()
        for i in range(23):slats.box(0,head-.071-i*.054,.012,w-.059,.024,.044)
        add("Rear exterior blinds · "+("bedroom" if level else "living room"),level,[5,9],
            f.parts+[slats.part("a_bronze",[x,0,z])])
    # Grids are surface-applied at the existing pane, not solid panels over daylight.
    for name,x,z,w,yaw,n in [("west A",-5.93,6.52,1,90,3),("west B",-5.93,9.25,1,90,3),
                              ("hobby south",-3,12.936,4.4,0,15)]:
        f=Fixture(x,0,z,yaw);base=.60 if yaw==0 else .50;h=2.0-base
        for i in range(1,n):f.box(-w/2+w*i/n,base+h/2,0,.027,h,.028,"frame")
        for frac in (.21,.79):f.box(0,base+h*frac,0,w,.029,.028,"frame")
        add("Annex · multi-light bars "+name,0,[1,7,9],f.parts)
    f=Fixture(0,0,0);bat=Batch()
    for i in range(80):
        z=4.75+i*.103
        hi=2.30+2.08*((z-4.7)/(10.785-4.7) if z<10.785 else (13-z)/(13-10.785))
        if hi>2.32:bat.box(-6.011,(hi+2.3)/2,z,.020,hi-2.30,.074)
    add("West annex gable · vertical timber battens",0,[7],[bat.part("a_teak",[0,0,0])])
    f.box(.15,.16,1.78,.21,.56,2.94,"a_plaster");f.box(.15,.451,1.78,.23,.038,2.94,"stone")
    add("West entrance · masonry side parapet",0,[1,7],f.parts)
    # P.6 assigns widths/heights, not recess depth. Cut only the outside 35 mm.
    g=next(g for g in groups if g["name"].startswith("Mansard perimeter"))
    p,=[p for p in g["parts"] if p.get("box")==[2.15,4.1,.2] or
        (abs(p["box"][0]-2.15)<1e-6 and abs(p["box"][2]-.2)<1e-6 and p["slot"]=="render")]
    g["parts"].remove(p);f=Fixture(0,0,0)
    f.box(2.15,4.10,.2175,3.90,1.90,.365,"render")
    cuts=[(.91,1.16),(1.40,1.65),(1.89,2.14)]
    for lo,hi,open_ in [(3.15,3.44,False),(3.44,3.79,True),(3.79,3.98,False),
                         (3.98,4.33,True),(4.33,5.05,False)]:
        spans=list(zip([.2,*[b for a,b in cuts]],[*[a for a,b in cuts],4.10])) if open_ else [(.2,4.10)]
        for a,b in spans:f.box((a+b)/2,(lo+hi)/2,.0175,b-a,hi-lo,.035,"render")
        if open_:
            for a,b in cuts:f.box((a+b)/2,(lo+hi)/2,.034,b-a,hi-lo,.002,"a_reveal")
    add("North entrance · six recessed render panels",1,[6],f.parts)
    f=Fixture(0,0,0)
    # Trace the projecting living volume only, not a second dwelling roof.
    for x,z,w,d in [(11.432,11.,.115,6.40),(8.46,14.142,5.95,.116),(10.74,7.858,1.49,.116),
                    (5.513,13.70,.116,1.0)]:
        f.box(x,3.261,z,w,.323,d,"a_plaster");f.box(x,3.442,z,w+.015,.039,d+.016,"e_fascia")
    for z in (4.62,9.025):
        for h in (3.82,4.02,4.20):
            f.box(10.075,h,z,.028,.028,1.62,"frame")
        for s in (-.78,.78):f.box(10.061,4.00,z+s,.078,.426,.029,"frame")
    add("Living parapet and east metal window guards",1,[2,5,6,8,9],f.parts)
    f=Fixture(0,0,0);x,z=12.34,13.16
    f.box((11.45+x)/2,3.19,z,x-11.45,.105,.112,"e_fascia")
    f.box(x,3.13,z,.151,.078,.143,"a_bronze")
    for i in range(48):
        h=3.04-i*.071
        pts=[(x+(.031*math.cos(j*math.tau/12) if i%2 else 0),h+.049*math.sin(j*math.tau/12),
              z+(0 if i%2 else .031*math.cos(j*math.tau/12))) for j in range(13)]
        f.tube(pts,.006,"a_bronze")
    f.box(x,-.441,z,.46,.017,.46,"stone",.045)
    for i in range(7):f.box(x,-.43,z+(i-3)*.039,.26,.005,.018,"a_frame")
    add("East return · scupper, rain chain and stone catch",0,[1,2,6,8,9],f.parts)
    for x in (-17.86,-12.72):
        f=Fixture(x,-.45,-5.875)
        for i in range(9):f.box((i-4)*.275,1.25,0,.029,2.44,.037,"a_teak")
        for i in range(7):f.box(0,.15+i*.38,0,2.52,.031,.04,"a_teak")
        add("Carport · open timber privacy lattice",0,[1,6],f.parts,site=True)
    f=Fixture(-12.98,-.45,-6.61)
    f.box(0,.019,0,2.29,.038,.96,"stone")
    for x,w,z,d in [(0,2.24,-.44,.04),(-1.11,.04,0,.9),(1.11,.04,0,.9)]:
        n=math.ceil(max(w,d)/.091)
        for i in range(n):
            t=(i+.5)/n-.5
            f.box(x+(w*t if w>d else 0),.611,z+(d*t if d>w else 0),
                  w/n-.014 if w>d else w,1.178,d/n-.014 if d>w else d,"a_teak")
        f.box(x,1.18,z,w,.04,d,"a_trim")
    for x in (-.70,0,.70):
        f.box(x,.465,0,.535,.84,.586,"a_frame",.051)
        f.box(x,.908,-.005,.567,.065,.616,"a_felt",.037)
    f.box(0,1.24,0,2.31,.078,.98,"e_fascia")
    for i in range(20):f.box((i-9.5)*.10,.041,.409,.068,.005,.067,"a_frame")
    add("Carport · covered three-bin platform and 1.20 m screens",0,[1,7,8],f.parts,site=True)


def align(spec,data,groups,styles,shell,placements,refinement,site,root,brief):
    catalog=json.loads((root/placements["catalog"]).read_text(encoding="utf-8-sig"))
    require(spec["bindings"]==dict(geometry=shell,furniture=digest(placements),catalog=digest(catalog),
            site=digest(site),refinement=digest(refinement)),"Alignment belongs to a different source revision")
    require([p for p,_,_ in spec["sheets"]]==list(range(1,10)),"Nine numbered sheets required")
    for room,uses in spec["replace"].items():
        old=[g for g in groups if g.get("furniture") and g.get("room")==room and (uses=="*" or g["use"] in uses)]
        require(old and (uses=="*" or len(old)==len(uses)), "Unmatched base placement in "+room)
        for g in old:groups.remove(g)
    items=[]
    for room,use,ref,x,z,yaw in spec["refs"]:
        level=int(room in ("Master bedroom","Bedroom 1"))
        y=3.15 if level else -.30 if room=="Hobby room" else 0
        items.append(dict(room=room,use=use,ref=ref,at=[x,y,z],yaw=yaw,level=level))
    refs,_=furniture(dict(placements,items=items),brief,root,shell,2);groups.extend(refs)
    def add(name,level,pages,parts,**attrs):
        groups.append(dict(name=name,level=level,pages=pages,parts=parts,basis="Sheet-guided; original concept detailing",**attrs))
    from aligned_exterior import join_living_return, repair
    join_living_return(groups)  # Generate exterior render faces from the joined wall spans.
    populate(add);sauna(add,groups);canopy(add,groups);details(add,groups)
    repair(add,groups,styles)
    styles.update({k:{"color":v} for k,v in COLORS.items()})
    data["notes"]=[s.replace(" The sauna bench stays.","") for s in data["notes"]]
    data["aligned"]={k:spec[k] for k in ("id","bindings","sheets","roomAudit")}
    for row in data["aligned"]["sheets"]:
        note=spec["repairAudit"].get(str(row[0]))
        if note:row[2]+=" "+note
    data["aligned"]["repair"]=3
