"""Optional, original House finish studies. Metres; no proprietary meshes or drawings."""
import math
from geometry import require, roof_parts
from site_layer import Batch, fence


COLORS = {
    "b_porcelain":"#f5f2e9","b_seat":"#fbfaf4","b_water":"#99beb9",
    "b_silver":"#acb8b8","b_mirror":"#b9c9c7","b_glass":"#bbe2dc",
    "b_edges":"#659991","b_oak":"#bc9874","b_sage":"#9fae9e","b_gap":"#5a655d",
    "b_tile":"#bcbbb1","b_glaze":"#e0e3d7","b_lamp":"#fff0d6","b_drain":"#697673",
    "e_fascia":"#50565a","e_fold":"#394146","e_board_x":"#b78d69","e_board_z":"#b78d69",
}


def rounded(w,d,r,n=6):
    pts=[]
    for x,z,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for i in range(n+1):
            a=math.radians(start+90*i/n)
            pts.append((x+r*math.cos(a),z+r*math.sin(a)))
    return pts


def ellipse(w,d,n=28):
    return [(w/2*math.cos(i*math.tau/n),d/2*math.sin(i*math.tau/n)) for i in range(n)]


def section(loop,y,z=0,x=0):
    return [(u+x,y,v+z) for u,v in loop]


class Fixture:
    """Local +Z faces the room. Keep curved solids navigable with their own bounds."""
    def __init__(self,x,y,z,yaw=0):
        self.x,self.y,self.z,self.yaw=x,y,z,yaw
        self.parts=[]

    def world(self,x,y,z):
        c,s=math.cos(math.radians(self.yaw)),math.sin(math.radians(self.yaw))
        return [round(self.x+c*x+s*z,5),round(self.y+y,5),round(self.z+c*z-s*x,5)]

    def box(self,x,y,z,w,h,d,slot,r=0,**attrs):
        p=dict(box=self.world(x,y,z),size=[w,h,d],yaw=self.yaw,slot=slot,**attrs)
        if r:p["corner_radius"]=r
        self.parts.append(p)
        return p

    def shell(self,slot,loops,cap=False,solid=False,cap_back=False):
        b=Batch()
        for lo,hi in zip(loops,loops[1:]):
            for i in range(len(lo)):
                b.face(lo[i-1],hi[i-1],hi[i],lo[i])
        if cap:
            for i in range(1,len(loops[-1])-1):
                b.face(loops[-1][0],loops[-1][i+1],loops[-1][i])
        if cap_back:
            for i in range(1,len(loops[0])-1):
                b.face(loops[0][0],loops[0][i],loops[0][i+1])
        if solid:
            bounds=[(min(q[k] for q in b.v),max(q[k] for q in b.v)) for k in range(3)]
            center=[(a+c)/2 for a,c in bounds]
            pts=[[round(v[k]-center[k],5) for k in range(3)] for v in b.v]
            p=self.box(*center,*(c-a for a,c in bounds),slot)
            p["profile"]=[pts[i] for i in b.indices]
        else:
            self.parts.append(b.part(slot,self.world(0,0,0),self.yaw))

    def tube(self,points,r,slot):
        # Swept circular sections, parallel to the local path; rounded elbowed spouts.
        loops=[]
        for i,p in enumerate(points):
            a,b=points[max(0,i-1)],points[min(len(points)-1,i+1)]
            dx,dy,dz=[v-u for u,v in zip(a,b)]
            l=math.hypot(dx,dy,dz); dx,dy,dz=dx/l,dy/l,dz/l
            u=(0,-dz,dy) if abs(dx)<.85 else (-dy,dx,0)
            l=math.hypot(*u); ux,uy,uz=[v/l for v in u]
            v=(dy*uz-dz*uy,dz*ux-dx*uz,dx*uy-dy*ux)
            loops.append([tuple(p[k]+r*(u[k]/l*math.cos(j*math.tau/12)+v[k]*math.sin(j*math.tau/12)) for k in range(3)) for j in range(12)])
        self.shell(slot,loops,True)


def tap(f,x,y,z):
    f.tube([(x,y,z),(x,y+.102,z),(x,y+.138,z+.013),(x,y+.15,z+.037),
            (x,y+.15,z+.111),(x,y+.142,z+.127),(x,y+.125,z+.134)],.0155,"b_silver")
    f.box(x+.022,y+.091,z,.060,.019,.027,"b_silver",.009)


def vanity(spec,floor):
    x,z,yaw,w=spec; f=Fixture(x,floor,z,yaw)
    f.box(0,.443,-.014,w-.024,.47,.425,"b_oak",.024)
    for side in (-1,1):
        f.box(side*(w/2-.022),.714,-.014,.020,.073,.424,"b_oak",.007)
    for y in (.369,.631):
        f.box(0,y,.206,w-.037,.248,.029,"b_sage",.010)
        f.box(0,y+.082,.231,.225,.016,.028,"b_oak",.008)
    # One continuous ceramic surface: deck, rolled lip, recess and waste.
    deck=rounded(w,.485,.036)
    inner=rounded(min(w-.15,.56),.304,.113)
    f.shell("b_porcelain",[section(deck,.751),section(deck,.814),section(inner,.814,.024),
            section(inner,.797,.024),section(rounded(.324,.169,.074),.716,.028),
            section(rounded(.070,.062,.025),.699,.034)],True)
    f.tube([(0,.698,.034),(0,.703,.034)],.021,"b_silver")
    tap(f,0,.814,-.177)
    f.box(0,1.431,-.221,min(w-.03,.78),.645,.037,"b_oak",.018)
    mirror=f.box(0,1.431,-.199,min(w-.06,.75),.615,.011,"b_mirror",.011)
    mirror["mirror"]=True
    f.box(0,1.769,-.209,min(w-.09,.70),.027,.058,"b_silver",.013)
    f.box(0,1.767,-.175,min(w-.12,.67),.017,.014,"b_lamp",.005)
    return f.parts, f.world(0,1.765,-.15)


def closet(spec,floor):
    x,z,yaw=spec; f=Fixture(x,floor,z,yaw)
    f.box(0,.42,.071,.463,.83,.135,"b_glaze",.022)
    f.box(0,.704,.144,.153,.079,.014,"b_silver",.005)
    for u,w in [(-.030,.068),(.038,.048)]:
        f.box(u,.705,.153,w,.038,.007,"b_seat",.003)
    ring=lambda w,d,y,z: section(ellipse(w,d),y,z)
    f.shell("b_porcelain",[ring(.222,.315,.018,.333),ring(.244,.335,.164,.325),
        ring(.309,.444,.245,.355),ring(.374,.501,.350,.369),ring(.372,.50,.40,.37),
        ring(.263,.356,.401,.381),ring(.22,.274,.312,.384),ring(.131,.149,.245,.383)],True,True)
    f.shell("b_water",[ring(.14,.155,.249,.383),ring(.144,.16,.253,.383)],True)
    f.shell("b_seat",[ring(.366,.479,.405,.373),ring(.368,.481,.434,.373),
        ring(.253,.34,.439,.385),ring(.249,.336,.410,.385)])
    for u in (-.093,.093):
        f.box(u,.402,.163,.052,.025,.073,"b_silver",.008)
    return f.parts


def bathtub(spec,floor):
    x,z,yaw,w,d=spec; f=Fixture(x,floor,z,yaw)
    sec=lambda a,b,r,y:section(rounded(a,b,r),y)
    f.shell("b_porcelain",[sec(w-.07,d-.07,.084,.013),sec(w-.03,d-.03,.088,.085),
        sec(w,d,.099,.489),sec(w,d,.103,.524),sec(w-.152,d-.133,.202,.529),
        sec(w-.172,d-.145,.207,.506),sec(w-.310,d-.241,.222,.265),
        sec(w-.472,d-.312,.217,.151)],True,True)
    f.tube([(w*.29,.151,0),(w*.29,.155,0)],.029,"b_silver")
    tap(f,w*.32,.527,-d/2+.033)
    return f.parts


def shower_mount(g,walls,u,y,tip,rose,shank):
    """Turn a continuous rose and connector from finished tile into the receiver."""
    nx,nz=math.sin(math.radians(g.yaw)),math.cos(math.radians(g.yaw))
    x,_,z=g.world(u,y,0)
    if abs(nx)>.99999: axis,normal,origin,along="x",nx,x,z
    elif abs(nz)>.99999: axis,normal,origin,along="z",nz,z,x
    else: raise ValueError("Shower mounts require an axis-aligned tiled backing")
    backs=[(plane-origin)/normal for wall,plane,a,b,h in walls if wall==axis
           and a<=along-rose and along+rose<=b and y+rose<=h and -.12<(plane-origin)/normal<0]
    require(len(backs)==1,"Shower mount needs one continuous finished tile backing")
    back=backs[0]
    require(back+.012<tip,"Insufficient space for shower connection")
    profile=[(back-.0025,rose-.001),(back+.001,rose),(back+.0045,rose),
             (back+.009,rose*.79),(back+.011,shank),(tip,shank)]
    loops=[[(u+dx,y-dy,t) for dx,dy in ellipse(2*r,2*r,24)] for t,r in profile]
    g.shell("b_silver",loops,cap=True,cap_back=True)


def shower(spec,floor,walls):
    a,b,c,d=spec["rect"]; w,z=c-a,d-b
    f=Fixture((a+c)/2,floor,(b+d)/2)
    rim=lambda dw,dd,y: section(rounded(w-dw,z-dd,.049),y)
    f.box(0,.012,0,w,.014,z,"b_porcelain",.049,walkable=True)
    f.shell("b_porcelain",[rim(0,0,.019),rim(0,0,.044),rim(.052,.052,.044),
        rim(.080,.080,.027),rim(.214,.216,.019)])
    f.box(.0,.022,z*.27,.245,.007,.054,"b_silver",.014)
    for i in range(8):
        f.box((i-3.5)*.026,.026,z*.27,.012,.002,.029,"b_drain",.005)
    # Short fixed return + sliding panel shown parked, with a genuine entry.
    h=spec["height"]
    def screen(x1,z1,x2,z2):
        dx,dz=x2-x1,z2-z1
        for y,thick,slot in [((h+.055)/2,h-.055,"b_glass"),(.055,.016,"b_silver"),(h,.015,"b_edges")]:
            f.box((x1+x2)/2,y,(z1+z2)/2,abs(dx) or .012,thick,abs(dz) or .012,slot)
        for x,t in [(x1,z1),(x2,z2)]:
            f.box(x,(h+.055)/2,t,.018,h-.055,.018,"b_silver")
    if spec["open"]=="NW":
        screen(-w/2+.018,-z/2+.018,-w/2+.018,z/2-.022)
        screen(w/2-.295,-z/2+.018,w/2-.022,-z/2+.018)
    else:
        screen(w/2-.848,z/2-.022,w/2-.024,z/2-.022)
    x,t,yaw=spec["head"]; g=Fixture(x,floor,t,yaw)
    g.box(0,.994,.017,.24,.055,.058,"b_silver",.016)
    g.tube([(0,1.02,.04),(0,h-.111,.04),(0,h-.084,.056),
            (0,h-.073,.085),(0,h-.073,.184),(0,h-.099,.207)],.012,"b_silver")
    g.tube([(0,h-.115,.207),(0,h-.103,.207)],.080,"b_silver")
    g.tube([(0,h-.119,.207),(0,h-.115,.207)],.072,"b_drain")
    g.tube([(.079,.99,.053),(.10,.74,.08),(.153,.694,.096),(.195,.753,.112),(.19,1.12,.087)],.008,"b_silver")
    g.tube([(.19,1.11,.087),(.19,1.264,.064)],.016,"b_silver")
    for u in (-.075,.075):
        shower_mount(g,walls,u,.994,-.006,.032,.014)
    shower_mount(g,walls,0,h-.39,.039,.025,.009)
    return f.parts+g.parts


def tiles(room):
    f=room["floor"]; ring=room["ring"]
    # Convex sections of the L-shaped bath stop on the sauna's actual wall faces.
    if len(ring)==6:
        a,b,c,d,e,g=ring
        strips=[[a,b,[b[0],g[1]],g],[e,[c[0],g[1]],c,d]]
    else: strips=[ring]
    parts=[dict(face=[[x,f+.004,z] for x,z in r[::-1]],slot="b_tile") for r in strips]
    for axis,plane,a,b,h in room["walls"]:
        corners=[(a,.005),(b,.005),(b,h),(a,h)]
        parts.append(dict(face=[[plane,f+y,t] if axis=="x" else [t,f+y,plane] for t,y in corners],slot="b_glaze"))
    return parts


def sliding_gate(spec,grade):
    x,z=spec["center"]; w=spec["width"]; h=1.28; bars=Batch()
    n=round(w/.127)
    for j in range(n):
        bars.box(w*((j+.5)/n-.5),0,0,.081,h-.09,.045)
    steel=[dict(box=[0,y,.018],size=[w,.076,.085]) for y in (-h/2+.038,h/2-.038)]
    steel += [dict(box=[u,0,.025],size=[.065,h-.14,.072]) for u in (-w/2+.033,0,w/2-.033)]
    steel += [dict(box=[w/2-.175,.153,side*.046],size=[.15,.043,.072]) for side in (-1,1)]
    return dict(box=[x,grade+.06+h/2,z],size=[w,h,.17],profile=[bars.v[i] for i in bars.indices],
                slot="s_gate",door=dict(kind="slider",hand="start-",travel=spec["travel"],hardware=steel,inferred=True))


def area(ring):
    return abs(sum(x*b-a*z for (x,z),(a,b) in zip(ring,ring[1:]+ring[:1])))/2


def envelope(scene):
    main=next(g for g in scene["groups"] if g["name"].startswith("Hipped roof"))
    dorm=next(g for g in scene["groups"] if g["name"].startswith("Four shed"))
    parts=[]
    def add(face,slot):
        parts.append({"face":[[round(v,6) for v in p] for p in face],"slot":slot})
    def down(p,h):return [p[0],p[1]-h,p[2]]
    def edge(a,b,h):
        add([a,b,down(b,h-.025),down(a,h-.025)],"e_fascia")
        add([down(a,h-.025),down(b,h-.025),down(b,h),down(a,h)],"e_fold")
    for i,e in enumerate(main["elements"]):
        axis=2 if i%2==0 else 0
        plane=(-1,11,14.2,-1)[i]
        # A–A's intrados leader terminates on the horizontal line under the west
        # house eave above the workshop. Carry that datum around the main hip.
        board="e_board_x" if axis==2 else "e_board_z"
        def underside(p):return [p[0],4.47-.177,p[2]]
        for tri in roof_parts(e["face"],e.get("cuts",[])+[[.012,.012,9.988,13.188]]):
            if abs(sum(p[0]*q[2]-q[0]*p[2] for p,q in zip(tri,tri[1:]+tri[:1])))<1e-8:continue
            add([underside(p) for p in reversed(tri)],board)
            for a,b in zip(tri,tri[1:]+tri[:1]):
                outer=a[axis]==b[axis]==plane
                returns=any(abs(a[2-axis]-v)<1e-8 and abs(b[2-axis]-v)<1e-8
                    for cut in e.get("cuts",[]) for v in (cut[(2-axis)//2],cut[(2-axis)//2+2]))
                if outer or returns:edge(a,b,.177)
                if returns and not outer:
                    add([down(a,.177),down(b,.177),underside(b),underside(a)],board)
    for e in dorm["elements"]:
        if "cheek_inset" in e:continue
        pts=e["face"]; axis=2 if pts[0][2]==pts[1][2] and pts[0][1]==pts[1][1] else 0
        nose=min(pts,key=lambda p:p[1]); run=2-axis
        tip=nose[axis]; lo=min(p[run] for p in pts); hi=max(p[run] for p in pts)
        end=max(pts,key=lambda p:p[1]); back=end[axis]; slope=(end[1]-nose[1])/(back-tip)
        def at(u,t):return [u,nose[1]+(t-tip)*slope,t] if axis==2 else [t,nose[1]+(t-tip)*slope,u]
        wall=0 if tip<0 else 13.2 if axis==2 else 10
        inner=wall+math.copysign(.012,back-tip); thick=.139
        board="e_board_x" if axis==2 else "e_board_z"
        # Soffit only in front of the facade. Side caps finish the existing
        # cheek sheathing and die into the host pitch; never extrude a hip.
        add([down(at(u,t),thick) for u,t in [(lo,tip),(hi,tip),(hi,inner),(lo,inner)]],board)
        edge(at(lo-.054,tip),at(hi+.054,tip),thick)
        for u,s in [(lo,-1),(hi,1)]:
            out=u+s*.054
            add([at(u,tip),at(out,tip),at(out,back),at(u,back)],"roof")
            cap=[at(out,tip),at(out,back)]
            edge(*cap,thick)
            add([down(at(u,tip),thick),down(cap[0],thick),down(cap[1],thick),down(at(u,back),thick)],board)
    return parts


def refine(spec,site,shell_hash,data,groups,styles,scene):
    require(spec["geometry_sha256"]==shell_hash,"Refinement belongs to another geometry revision")
    parcel=spec["parcel"]; grade=data["grade"]
    require(abs(area(parcel["ring"])-parcel["annotation_m2"])<1,"Inferred lot must respect the area annotation")
    data["notes"]=[s for s in data["notes"] if s not in site["notes"]]+[
        "P. 1: Suprafata teren = 1703 mp. The 6.25 m parking depth calibrates the visible oblique west line. The approach and short front follow the previous concept; the east and rear corners close an area-matched 1,703 m² study, not a survey. Gate tracks, handing, trees and paths are illustrative.",
        "Pp. 1–2: sanitaryware types and wall positions follow the symbols. Floor and splash-zone ceramic follows the wet-room section note (p. 4); tile modules, joinery, fittings and glass are original schematic choices, not licensed IKEA models. Three VESKEN shelves are replaced by three integrated vanities. The sauna bench stays.",
        "Pp. 3–9: original roof planes, notches, window heads and rooflight wells are retained. In A–A the treated-board intrados leader points to the horizontal west dwelling eave above the workshop. Continuing it around the hips and using timber at the dormers are proposals; board module, metal hem and fascia depths are not measured construction details.",
        "Directional sky/daylight, shadowing, opening bounce and switchable warm practicals are illustrative, not a solar-date or photometric simulation."]
    def group(name,level,pages,parts,**attrs):
        groups.append(dict(name=name,level=level,pages=pages,parts=parts,basis="Drawing-guided · schematic finish",**attrs))
    for i,(a,b) in enumerate(parcel["extension"]):
        parts=fence(a,b,grade,False,last_post=i!=3)
        group("Parcel · "+["front extension","east side","rear","west return"][i],-1,[1,5,7,8],parts,site=True)
    group("Vehicle gate · sliding west",-1,[1],[sliding_gate(parcel["slider"],grade)],site=True)
    drive=parcel["slider"]; gx,gz=drive["center"]
    guide=Fixture(0,grade,0)
    guide.box(gx+drive["travel"]/2,.004,gz,drive["width"]-drive["travel"],.008,.043,"s_posts")
    guide.box(gx-drive["width"]/2-.23,.16,gz+.23,.27,.32,.24,"s_posts",.035)
    group("Vehicle gate · flush rail and operator",-1,[1],guide.parts,site=True)
    front_end=max(x for x,z in parcel["ring"])+.55
    apron=next(p["ring"] for p in site["paving"] if p["slot"]=="s_apron")
    old_end=max(x for x,z in apron); z0,z1=min(z for x,z in apron),max(z for x,z in apron)
    group("Street apron · east continuation",-1,[1],[dict(slab=[[[old_end,z0],[front_end,z0],
        [front_end,z1],[old_end,z1]]],base=grade-.045,depth=.045,slot="s_apron")],site=True)
    group("Dwelling · folded eaves and boarded intrados",1,[3,4,5,6,7,8,9],envelope(scene),roof=True)
    zones=list(spec["interiorZones"])
    for r in spec["rooms"]:
        name=r["name"]; level=r["level"]; floor=r["floor"]; pages=r["pages"]
        old=[g for g in groups if g.get("room")==name and "VESKEN" in g["name"].upper()]
        require(len(old)==1,"Expected the accepted wet-room shelf in "+name)
        groups.remove(old[0])
        group(name+" · ceramic floor and wall finish",level,pages,tiles(r))
        group(name+" · WC and flush plate",level,pages,closet(r["wc"],floor))
        v,lamp=vanity(r["vanity"],floor)
        group("Inset basin and drawer vanity · schematic",level,pages,v,room=name,furniture=True,
              size=[r["vanity"][3],1.785,.485],use="Compact floating storage, inset basin, mirror and light",
              note="Original concept joinery replacing VESKEN, not an IKEA product.")
        group(name+(" · bath and mixer" if "tub" in r else " · screened shower"),level,pages,
              bathtub(r["tub"],floor) if "tub" in r else shower(r["shower"],floor,r["walls"]))
        zones.append(dict(name=name,bounds=r["lightZone"],floor=floor,day=r["day"],lamp=lamp,
                          wet=True,exclude=r.get("exclude")))
    for z in spec["interiorZones"]:
        x,y,t=z["lamp"]; f=Fixture(x,y,t); wall=z.get("mount")=="wall"
        if wall:
            a,b,c,d=z["bounds"]; side=min([(abs(x-a),90),(abs(x-c),-90),(abs(t-b),0),(abs(t-d),180)])[1]
            f.yaw=side; f.box(0,0,-.013,.29,.108,.081,"b_silver",.016)
            f.box(0,0,.031,.26,.085,.025,"b_lamp",.010)
        else:
            f.box(0,.025,0,.315,.077,.315,"b_oak",.084)
            f.box(0,-.021,0,.29,.019,.29,"b_lamp",.082)
        group(z["name"]+" · practical",int(z["floor"]>1),[1,2,4,5],f.parts)
    data["refined"]=dict(zones=zones,lot=parcel["ring"],area_m2=round(area(parcel["ring"]),2))
    styles.update({k:{"color":v} for k,v in COLORS.items()})
