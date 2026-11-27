"""Compile a metre-based evidence manifest into deterministic drawing primitives."""
import hashlib
import json
import math


def require(value, message):
    if not value:
        raise ValueError(message)


def number(x):
    require(type(x) in (float, int) and math.isfinite(x), f"Expected finite number, got {x!r}")
    return x


def vector(v, n):
    require(isinstance(v, list) and len(v) == n, f"Expected a {n}-component vector")
    return [number(x) for x in v]


def positive(x):
    require(number(x) > 0, "Expected a positive dimension")
    return x


def digest(data):
    encoded = json.dumps(data, allow_nan=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


def box(center, size, slot, yaw=0):
    require(all(positive(x) for x in vector(size, 3)), "Invalid box")
    return {"box": vector(center, 3), "size": size, "slot": slot, "yaw": number(yaw)}


def wall(e, base, slot, meet_ceiling=False):
    a, b = [vector(p, 2) for p in e["wall"]]
    dx, dz = b[0] - a[0], b[1] - a[1]
    length, h, t = positive(math.hypot(dx, dz)), positive(e["h"]), positive(e["t"])
    yaw = -math.degrees(math.atan2(dz, dx))
    parts = []

    def piece(left, right, low, high, depth, mat, fit=False):
        if right-left <= 1e-7:
            return
        s = (left + right) / (2 * length)
        x,z = a[0]+dx*s,a[1]+dz*s
        if fit and meet_ceiling:
            # Keep the footprint even when the opening head equals the nominal wall height.
            parts.append({"fit_from":[x,base+low,z], "span":[right-left,depth], "slot":mat, "yaw":yaw})
        elif high-low > 1e-7:
            parts.append(box([x,base+(low+high)/2,z],[right-left,high-low,depth],mat,yaw))

    stop = 0
    for start, width, sill, head, kind, *hand in sorted(e.get("openings", [])):
        end = number(start) + positive(width)
        require(stop <= start and end <= length + 1e-7 and 0 <= number(sill) < number(head) <= h,
                "Opening overlaps another or extends beyond its wall")
        require(kind in ("window", "door", "passage", "garage"), f"Unknown opening type {kind}")
        require(not hand or (kind == "door" and len(hand) == 1 and hand[0] in
                             ("start+", "start-", "end+", "end-")), "Invalid door handing")
        piece(stop, start, 0, h, t, slot, fit=True)
        piece(start, end, 0, sill, t, slot)
        piece(start, end, head, h, t, slot, fit=True)
        if kind == "window":
            f = min(.05, width/5, (head-sill)/5)
            piece(start, start+f, sill, head, .09, "frame")
            piece(end-f, end, sill, head, .09, "frame")
            piece(start+f, end-f, sill, sill+f, .09, "frame")
            piece(start+f, end-f, head-f, head, .09, "frame")
            piece(start+f, end-f, sill+f, head-f, .025, "glass")
            if width > 1.3:
                piece(start+width/2-f/2, start+width/2+f/2, sill+f, head-f, .09, "frame")
            if sill > .12:
                piece(start, end, sill-.025, sill, t+.065, "stone")
        elif kind != "passage":
            jamb = min(.04, width/8, (head-sill)/8)
            piece(start,start+jamb,sill,head,t+.012,"frame")
            piece(end-jamb,end,sill,head,t+.012,"frame")
            piece(start+jamb,end-jamb,head-jamb,head,t+.012,"frame")
            left, right = start+jamb, end-jamb
            # The example's wide entrance has one operable leaf and a fixed sidelight.
            if kind == "door" and e.get("sidelight", 0):
                sidelight = positive(e["sidelight"])
                require(sidelight+jamb < right-left, "Sidelight wider than door opening")
                piece(right-sidelight,right,sill,head-jamb,.028,"glass")
                right -= sidelight+jamb
                piece(right,right+jamb,sill,head-jamb,t,"frame")
            piece(left,right,sill+.006,head-jamb,.05,"frame" if kind=="garage" else "timber")
            parts[-1]["door"] = {"kind":kind,"hand":hand[0] if hand else "start+",
                                 "inferred":not hand and kind=="door"}
        stop = end
    piece(stop, length, 0, h, t, slot, fit=True)
    return parts


def clip(poly, axis, edge, sign):
    """Clip a convex 3D roof panel using a half-plane in plan coordinates."""
    result = []
    for a, b in zip(poly[-1:] + poly[:-1], poly):
        da, db = sign*(a[axis]-edge), sign*(b[axis]-edge)
        if (da < 0 < db) or (db < 0 < da):
            t = da/(da-db)
            result.append([v+t*(w-v) for v, w in zip(a, b)])
        if db >= 0:
            result.append(b)
    return result


def roof_parts(pts, cuts):
    polys = [pts]
    for cut in cuts:
        left, near, right, far = vector(cut, 4)
        require(left < right and near < far, "Invalid roof cut rectangle")
        pieces = []
        for poly in polys:
            for axis, edge, sign in [(0,left,1),(0,right,-1),(2,near,1),(2,far,-1)]:
                outside = clip(poly, axis, edge, -sign)
                if len(outside) >= 3:
                    pieces.append(outside)
                poly = clip(poly, axis, edge, sign)
                if len(poly) < 3:
                    break
        polys = pieces
    return [[poly[0], a, b] for poly in polys for a, b in zip(poly[1:], poly[2:])]


def prism(top, bottom, slot, bottom_slot=None):
    return ([{"face":top,"slot":slot}, {"face":bottom[::-1],"slot":bottom_slot or slot}] +
            [{"face":[top[i-1],top[i],bottom[i],bottom[i-1]],"slot":slot} for i in range(len(top))])


def face_parts(e, g, base, slot):
    """Uncut faces may form a solid pitch (vertical drop or flat bottom datum)
    or an open vertical screen (slat width, pitch and positive-normal depth).
    """
    pts = [[x,y+base,z] for x,y,z in (vector(p,3) for p in e["face"])]
    require(len(pts) in (3,4), "Use triangles or convex planar quads")
    lights = e.get("rooflights", [])
    cuts = e.get("cuts", []) + lights
    faces = roof_parts(pts, cuts) if cuts else [pts]
    parts = [{"face":f, "slot":slot} for f in faces]
    lining = e.get("lining", g.get("lining"))
    require(not lights or lining, "A rooflight needs an interior lining")
    if "solid" in e:
        solid=e["solid"]
        require(not lining and not cuts and ("drop" in solid) != ("bottom" in solid),
                "A solid pitch needs a vertical drop or flat bottom and an uncut face")
        drop=positive(solid["drop"]) if "drop" in solid else None
        bottom=[[x,y-drop if drop else base+number(solid["bottom"]),z] for x,y,z in pts]
        require(all(p[1]>q[1] for p,q in zip(pts,bottom)), "Solid pitch bottom must be below top")
        return prism(pts,bottom,slot,solid.get("soffit_slot"))
    if "slats" in e:
        # Slice the gable outline in plan so each batten actually stops at the rake.
        spec=e["slats"]
        axis=0 if all(p[0]==pts[0][0] for p in pts) else 2
        require(not lining and not cuts and all(p[axis]==pts[0][axis] for p in pts),
                "Use an axis-aligned vertical face for a slatted screen")
        run=2-axis
        pitch,width,depth=(positive(spec[k]) for k in ("pitch","width","depth"))
        require(width < pitch, "Slatted screen needs a clear gap between battens")
        start,end=min(p[run] for p in pts),max(p[run] for p in pts)
        require(0 < end-start <= 512*pitch, "Invalid slatted screen span or repeat count")
        vertices=[]
        for i in range(math.ceil((end-start)/pitch)):
            edge=start+i*pitch
            strip=clip(clip(pts,run,edge,1),run,edge+width,-1)
            if len(strip)<3:continue
            back=[p.copy() for p in strip]
            for p in back:p[axis]+=depth
            # Batch the slats as one mesh; the strip crossing the ridge can have five vertices.
            for part in prism(strip,back,slot):
                poly=part["face"]
                for j in range(1,len(poly)-1):
                    vertices.extend((poly[0],poly[j],poly[j+1]))
        return [{"profile":vertices,"slot":slot}]
    if not lining:
        return parts
    drop, cap = positive(lining["drop"]), number(lining["cap"])
    xmin,zmin,xmax,zmax = vector(lining["bounds"],4)

    def triangles(poly, mat, **attrs):
        for p,q in zip(poly[1:],poly[2:]):
            parts.append({"face":[poly[0],p,q], "slot":mat, **attrs})

    a,b,c = pts[:3]
    u,v = [k-j for j,k in zip(a,b)], [k-j for j,k in zip(a,c)]
    det = u[0]*v[2]-v[0]*u[2]
    shafts = []
    mouth_cuts = []
    for light in lights:
        x0,z0,x1,z1 = vector(light,4)
        require(abs(det)>1e-9 and xmin<x0<x1<xmax and zmin<z0<z1<zmax, "Invalid rooflight location")
        gx=(u[1]*v[2]-v[1]*u[2])/det
        gz=(v[1]*u[0]-u[1]*v[0])/det
        def roof_y(x,z):
            return a[1]+gx*(x-a[0])+gz*(z-a[2])
        def soffit(x,z):
            return min(roof_y(x,z)-drop,cap)
        axis=0 if abs(gx)>=abs(gz) else 2
        slope=gx if axis==0 else gz
        run=number(lining.get("head_run",0))
        require(run>=0 and (not run or abs(slope)>1e-6), "Splayed head needs a pitched roof")
        upper=(x1 if slope>0 else x0) if axis==0 else (z1 if slope>0 else z0)
        sign=1 if slope>0 else -1
        mouth=list(light)
        mouth[(0 if axis==0 else 1)+(2 if sign>0 else 0)]+=sign*run
        require(xmin<=mouth[0]<mouth[2]<=xmax and zmin<=mouth[1]<mouth[3]<=zmax,
                "Rooflight head runs outside the room lining")
        # Do not let a shaft grow through a hip, another light or a dormer cut.
        for x,z in [(mouth[0],mouth[1]),(mouth[2],mouth[1]),(mouth[2],mouth[3]),(mouth[0],mouth[3])]:
            turns=[(q[0]-p[0])*(z-p[2])-(q[2]-p[2])*(x-p[0]) for p,q in zip(pts,pts[1:]+pts[:1])]
            require(min(turns)>=-1e-8 or max(turns)<=1e-8, "Rooflight shaft crosses roof hip")
        for rect in e.get("cuts",[])+mouth_cuts:
            require(mouth[2]<=rect[0] or mouth[0]>=rect[2] or mouth[3]<=rect[1] or mouth[1]>=rect[3],
                    "Rooflight shaft overlaps another opening")
        mouth_cuts.append(mouth)

        def ring(inset, offset):
            return [[x,roof_y(x,z)+offset,z] for x,z in
                    [(x0+inset,z0+inset),(x1-inset,z0+inset),(x1-inset,z1-inset),(x0+inset,z1-inset)]]
        gauge=min(.052,(x1-x0)/5,(z1-z0)/5)
        rim, underside=ring(0,.018),ring(0,-.065)
        inner, back=ring(gauge,.018),ring(gauge,-.065)
        pane=ring(gauge,-.012)
        lip, bends=[],[]
        for p in underside:
            q=p.copy()
            at_head=p[axis]==upper
            if at_head:q[axis]+=sign*run
            q[1]=soffit(q[0],q[2])
            lip.append(q)
            elbow=p.copy()
            if at_head and run:
                elbow[axis]+=sign*min(run,abs(slope)*max(0,p[1]-q[1]))
                elbow[1]=q[1]
            bends.append(elbow)
        for i,j in [(0,1),(1,2),(2,3),(3,0)]:
            for outer,inside in [(rim,inner),(inner,back),(back,underside),(underside,rim)]:
                shafts.append({"face":[outer[i],outer[j],inside[j],inside[i]],"slot":"frame"})
            # Split the bottom edge where the pitched ceiling meets its flat portion.
            edge=[lip[j],lip[i]]
            da,db=[roof_y(x,z)-drop-cap for x,_,z in edge]
            if da*db<0:
                t=da/(da-db)
                edge.insert(1,[edge[0][0]+t*(edge[1][0]-edge[0][0]),cap,edge[0][2]+t*(edge[1][2]-edge[0][2])])
            # Each jamb follows the stepped head profile. Its eaves end is plumb.
            if underside[i][axis]!=underside[j][axis]:
                lo,hi=(i,j) if underside[j][axis]==upper else (j,i)
                if hi==i:edge.reverse()
                poly=[underside[hi],bends[hi],*edge]
                for p,q in zip(poly,poly[1:]):
                    if p!=q:shafts.append({"face":[underside[lo],p,q],"slot":"ceiling"})
            else:
                for p,q in [(underside,bends),(bends,lip)]:
                    if p[i]!=q[i] or p[j]!=q[j]:
                        shafts.append({"face":[p[i],p[j],q[j],q[i]],"slot":"ceiling"})
        shafts.append({"face":pane,"slot":"skylight"})

    # The cut in the interior lining stops at plaster, not the outer metal cheek.
    inner_cuts=e.get("lining_cuts",e.get("cuts",[]))
    require(len(inner_cuts)==len(e.get("cuts",[])), "Each lining cut needs a matching roof cut")
    ceiling_cuts=inner_cuts+mouth_cuts
    if "cheek_inset" in e:
        ix,iz=vector(e["cheek_inset"],2)
        axis=0 if ix else 2
        run=2-axis
        require(bool(ix)!=bool(iz) and all(abs(p[axis]-pts[0][axis])<1e-8 for p in pts),
                "A lined cheek needs a vertical face and an inward normal offset")
        skin=e.get("cladding_depth",g.get("cladding_depth"))
        if skin is not None:
            # The wall ends at the sheathing datum. Model the outer skin and its
            # folded nose/top returns, not a second visible face at that datum.
            require(len(pts)==3 and pts[0][run]==pts[1][run] and pts[0][1]<pts[1][1],
                    "Clad cheek needs a low nose, high nose and roof intersection")
            outer=[p.copy() for p in pts]
            for p in outer:p[axis]-=math.copysign(positive(skin),ix or iz)
            parts=[{"face":outer,"slot":slot}] + [
                {"face":[pts[i],pts[i+1],outer[i+1],outer[i]],"slot":slot} for i in (0,1)]
        parts[0]["cheek_join"]=(axis,pts[0][axis]+(ix or iz),min(p[run] for p in pts),max(p[run] for p in pts))
        return parts
    xmin,zmin,xmax,zmax=vector(e.get("lining_bounds",[xmin,zmin,xmax,zmax]),4)
    for face in (roof_parts(pts,ceiling_cuts) if ceiling_cuts else [pts]):
        poly = face
        for axis,edge,sign in [(0,xmin,1),(0,xmax,-1),(2,zmin,1),(2,zmax,-1)]:
            poly = clip(poly,axis,edge,sign)
        for sign in (-1,1):
            segment = clip(poly,1,cap+drop,sign)
            triangles([[x,min(y-drop,cap),z] for x,y,z in segment], "ceiling", overhead=True)

    return parts+shafts


def join_cheek(spec, shed, host):
    """Bridge the actual finished edges, including each pitch-to-flat transition."""
    axis,plane,start,end=spec
    along=2-axis
    def spans(panels):
        segments=[]
        for tri in panels:
            for a,b in zip(tri,tri[1:]+tri[:1]):
                if max(abs(a[axis]-plane),abs(b[axis]-plane))>1e-7:continue
                if a[along]>b[along]:a,b=b,a
                if min(b[along],end)-max(a[along],start)>1e-7:
                    segments.append((a[along],b[along],a[1],b[1]))
        return segments
    parts=[]
    for a,b,ya,yb in spans(shed):
        for c,d,yc,yd in spans(host):
            left,right=max(start,a,c),min(end,b,d)
            if right-left<1e-7:continue
            def at(s,y):
                return [plane,y,s] if axis==0 else [s,y,plane]
            hi=[at(s,ya+(yb-ya)*(s-a)/(b-a)) for s in (left,right)]
            lo=[at(s,yc+(yd-yc)*(s-c)/(d-c)) for s in (left,right)]
            if max(abs(p[1]-q[1]) for p,q in zip(hi,lo))>1e-7:
                parts.append({"face":[lo[0],lo[1],hi[1],hi[0]],"slot":"ceiling"})
    require(parts,"Dormer cheek has no adjoining host and shed ceiling edges")
    return parts


def fit_partition(span, panels):
    """Build from the span's lower face (e.g. the opening head) to the actual lining."""
    x,y,z=span["fit_from"]
    width,depth=span["span"]
    c,s=math.cos(math.radians(span["yaw"])),math.sin(math.radians(span["yaw"]))
    profile=[]
    covered=False
    for panel in panels:
        poly=[[(px-x)*c-(pz-z)*s,py-y,(px-x)*s+(pz-z)*c] for px,py,pz in panel]
        for axis,bound,sign in [(0,-width/2,1),(0,width/2,-1),(2,-depth/2,1),(2,depth/2,-1)]:
            poly=clip(poly,axis,bound,sign)
        poly=clip(poly,1,0,1)
        area=sum(a[0]*b[2]-b[0]*a[2] for a,b in zip(poly,poly[1:]+poly[:1]))
        if abs(area)<1e-10:
            continue
        covered=True
        if max(p[1] for p in poly)<=1e-7:
            continue
        if area>0:
            poly.reverse()
        floor=[[px,0,pz] for px,_,pz in poly]
        for i in range(1,len(poly)-1):
            profile.extend([poly[0],poly[i],poly[i+1],floor[0],floor[i+1],floor[i]])
        for j in range(len(poly)):
            i=j-1
            profile.extend([floor[i],floor[j],poly[j],floor[i],poly[j],poly[i]])
    require(covered,"No ceiling surface covers this partition or its lintel")
    if not profile:
        return None  # The lining is already flush with the opening head.
    height=max(p[1] for p in profile)
    part=box([x,y+height/2,z],[width,height,depth],span["slot"],span["yaw"])
    part["profile"]=[[px,py-height/2,pz] for px,py,pz in profile]
    return part


def compile_scene(scene):
    require(scene["version"] == 1 and scene["units"] == "m", "Expected v1 geometry in metres")
    levels, sheets = scene["levels"], scene["sheets"]
    require(isinstance(levels, list) and levels and all(isinstance(x, str) and x for x in levels),
            "Name each storey from lowest to highest")
    require(sheets and all(k.isdigit() and int(k) > 0 and isinstance(v, str) and v
                           for k, v in sheets.items()), "Map PDF page numbers to drawing titles")
    vector(scene["focus"], 3)
    positive(scene["viewDistance"])
    groups = []
    for g in scene["groups"]:
        try:
            level = g["level"]
            require(type(level) is int and -1 <= level < len(levels), "Invalid storey")
            require(g["basis"] in ("dimensioned", "traced", "inferred"), "Missing evidence basis")
            require(g["pages"] and all(str(p) in sheets for p in g["pages"]), "Unknown source page")
            parts = []
            for e in g["elements"]:
                slot = e.get("slot", g["slot"])
                base = number(e.get("base", g.get("base", 0)))
                if "wall" in e:
                    parts.extend(wall(e,base,slot,g.get("meet_ceiling",False)))
                elif "box" in e:
                    cx, cy, cz = vector(e["box"], 3)
                    count = e.get("count", 1)
                    require(type(count) is int and 1 <= count <= 512, "Invalid repeat count")
                    dx, dy, dz = vector(e.get("step", [0, 0, 0]), 3)
                    for i in range(count):
                        parts.append(box([cx+i*dx, base+cy+i*dy, cz+i*dz], e["size"], slot, e.get("yaw", 0)))
                        if e.get("walkable") is True:
                            parts[-1]["walkable"] = True
                elif "slab" in e:
                    rings = [e["slab"], *e.get("holes", [])]
                    for ring in rings:
                        require(len(ring) >= 3, "Slab contour needs at least three vertices")
                        for p in ring:
                            vector(p, 2)
                    slab={"slab":rings,"base":base,"depth":positive(e["depth"]),"slot":slot}
                    for key in ("edge_slot","soffit_slot"):
                        if key in e:
                            require(isinstance(e[key],str) and e[key],f"Invalid {key}")
                            slab[key]=e[key]
                    parts.append(slab)
                elif "face" in e:
                    parts.extend(face_parts(e,g,base,slot))
                else:
                    raise ValueError(f"Unrecognized element: {e}")
            require(parts, "Empty group")
            groups.append({"name": g["name"], "level": level, "roof": bool(g.get("roof", False)),
                           "parts": parts, "basis": g["basis"], "pages": g["pages"]})
        except (KeyError, TypeError, ValueError) as err:
            raise ValueError(f"{g.get('name', 'Unnamed group')}: {err}") from err
    require(groups, "No geometry to render")
    panels={}
    for group in groups:
        panels.setdefault(group["level"],[]).extend(p["face"] for p in group["parts"] if p.get("overhead"))
    for group in groups:
        joins=[p.pop("cheek_join") for p in group["parts"] if "cheek_join" in p]
        if joins:
            shed=[p["face"] for p in group["parts"] if p.get("overhead")]
            host=[p["face"] for g in groups if g is not group and g["level"]==group["level"]
                  for p in g["parts"] if p.get("overhead")]
            for join in joins:
                group["parts"].extend(join_cheek(join,shed,host))
    for group in groups:
        parts=[]
        for part in group["parts"]:
            if "fit_from" in part:
                part=fit_partition(part,panels[group["level"]])
            if part is not None:
                parts.append(part)
        group["parts"]=parts
    return groups
