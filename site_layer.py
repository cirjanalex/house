"""Original procedural garden studies. Geometry is compiled offline, in metres."""
import math
import random

from geometry import number, positive, require, vector


COLORS = {
    "s_oak": "#a38264", "s_gate": "#84654c", "s_posts": "#565b55", "s_plinth": "#b2ada0",
    "s_bark": "#786757", "s_setts": "#b6b0a5", "s_path": "#d2c8b7", "s_apron": "#aaa9a1",
    "s_sage0": "#83936d", "s_sage1": "#96a47c", "s_sage2": "#a1aa80",
    "s_olive0": "#74805d", "s_olive1": "#879467", "s_olive2": "#98a473",
    "s_green0": "#657c61", "s_green1": "#788d6a", "s_green2": "#8f9e79",
}


class Batch:
    """Indexed surfaces share a material and a local origin, not one draw per batten/branch."""
    def __init__(self):
        self.v, self.indices = [], []

    def face(self, *points):
        i = len(self.v)
        self.v.extend([[round(c, 4) for c in p] for p in points])
        self.indices.extend([i, i+1, i+2])
        if len(points) == 4:
            self.indices.extend([i, i+2, i+3])

    def box(self, x, y, z, w, h, d):
        a,b = x-w/2, x+w/2
        c,e = y-h/2, y+h/2
        f,g = z-d/2, z+d/2
        corners = [(a,c,f),(b,c,f),(b,e,f),(a,e,f),(a,c,g),(b,c,g),(b,e,g),(a,e,g)]
        for ids in [(0,3,2,1),(4,5,6,7),(0,4,7,3),(1,2,6,5),(3,7,6,2),(0,1,5,4)]:
            self.face(*(corners[i] for i in ids))

    def part(self, slot, at, yaw=0, solid=False):
        # A mesh is a walk collider; an indexed face is drawing only. High boughs
        # must not turn a whole crown's bounding rectangle into a wall at grade.
        return {("mesh" if solid else "face"): self.v, "indices": self.indices,
                "at": at, "yaw": yaw, "slot": slot}


def fence(a, b, grade, first_post=True, last_post=True):
    dx,dz = b[0]-a[0], b[1]-a[1]
    length = positive(math.hypot(dx,dz))
    require(.45 <= length <= 80, "Frontage runs must be 0.45–80 metres")
    yaw, at = -math.degrees(math.atan2(dz,dx)), [(a[0]+b[0])/2, grade, (a[1]+b[1])/2]
    bays = math.ceil(length/1.82)
    batten, iron, plinth = Batch(), Batch(), Batch()
    plinth.box(0,.085,0,length,.17,.145)
    for i in range(int(not first_post), bays+int(last_post)):
        iron.box(-length/2+i*length/bays,.6375,0,.10,1.275,.105)
    for y in (.32,1.07):
        iron.box(0,y,-.022,length,.046,.048)
    for i in range(bays):
        clear = length/bays-.10
        n = max(1, round(clear/.133))
        for j in range(n):
            x = -length/2+i*length/bays+.05+(j+.5)*clear/n
            batten.box(x,.702,.019,.076,1.025,.04)
    # One continuous collision envelope per run. It includes the spaces between palings.
    # Posts are local offsets; the centred plinth supplies the full span in plan.
    return [plinth.part("s_plinth",at,yaw,True), iron.part("s_posts",at,yaw,True), batten.part("s_oak",at,yaw)]


def gate(leaf, grade):
    x,z = vector(leaf["center"],2)
    w,h = positive(leaf["width"]),positive(leaf["height"])
    require(.8 <= w <= 2 and 1 <= h <= 2 and leaf["hand"] in {"start-","end-","start+","end+"},
            "Invalid pedestrian leaf")
    wood = Batch()
    n = 2*round(w/.21)+1  # An actual batten faces the centre of the approach.
    batten_z, batten_depth = -.013, .044
    for j in range(n):
        wood.box(-w/2+(j+.5)*w/n,0,batten_z,w/n-.018,h,batten_depth)
    for y in (-h*.32,h*.29):
        wood.box(0,y,.024,w,.095,.032)
    # The spindle passes through the second full batten from the latch, not a slat gap.
    sign = 1 if leaf["hand"].startswith("start") else -1
    spindle_x = sign*(w/2-1.5*w/n)
    y = min(1.02,h*.55)-h/2
    gap, lever_depth, embed = .028, .05, .004
    hardware = [{"box":[spindle_x,y,batten_z],"size":[.022,.02,batten_depth+2*(gap+embed)]}]
    for side in (-1,1):
        lever_z = batten_z+side*(batten_depth/2+gap+lever_depth/2)
        hardware.append({"box":[spindle_x+sign*.034,y,lever_z],"size":[.115,.023,lever_depth]})
    return {"box":[x,grade+.045+h/2,z],"size":[w,h,.08],"slot":"s_gate",
            "profile":[wood.v[i] for i in wood.indices],
            "door":{"kind":"gate","hand":leaf["hand"],"inferred":True,"hardware":hardware}}


def limb(batch, a, b, r, tip):
    # Rings run horizontally: a taper can lean from trunk fork to crown.
    def ring(p, radius):
        return [(p[0]+radius*math.cos(t*math.tau/8),p[1],p[2]+radius*math.sin(t*math.tau/8)) for t in range(8)]
    lo, hi = ring(a,r),ring(b,tip)
    for i in range(8):
        batch.face(lo[i-1],hi[i-1],hi[i],lo[i])
    for i in range(1,7):
        batch.face(hi[0],hi[i+1],hi[i])


def foliage(batch, rng, x, y, z, rx, ry, rz, n=9):
    """Lobed, irregular leaf masses with different silhouettes in plan and elevation."""
    phase = rng.random()*math.tau
    rings = []
    for i,(dy,rad) in enumerate([(-.70,.57),(-.28,.97),(.20,1),(.70,.65)]):
        ring = []
        for j in range(n):
            angle = phase+(j+.48*(i%2)+rng.uniform(-.12,.12))*math.tau/n
            k = rad*rng.uniform(.82,1.13)
            ring.append((x+rx*k*math.cos(angle),y+ry*(dy+rng.uniform(-.10,.10)),z+rz*k*math.sin(angle)))
        rings.append(ring)
    for j in range(n):
        batch.face((x,y-ry,z),rings[0][j-1],rings[0][j])
        for lo,hi in zip(rings,rings[1:]):
            batch.face(lo[j-1],hi[j-1],hi[j])
            batch.face(lo[j-1],hi[j],lo[j])
        batch.face(rings[-1][j-1],(x,y+ry,z),rings[-1][j])


def tree(spec, grade):
    x,z = vector(spec["xz"],2)
    h,r,t = (positive(spec[k]) for k in ("height","radius","trunk"))
    require(4.5 <= h <= 12 and .7 <= r <= h/2 and .06 <= t <= .35, "Invalid garden tree sizes")
    leaf = spec["leaf"]
    require(leaf in {"sage","olive","green"} and type(spec["seed"]) is int, "Invalid garden tree palette/seed")
    profiles = {"upright":(.78,1.10), "spreading":(1.13,.77), "rounded":(.97,1.0)}
    require(spec["habit"] in profiles, "Unknown crown habit")
    spread, fullness = profiles[spec["habit"]]
    rng = random.Random(spec["seed"])
    stem, wood = Batch(), Batch()
    crown = [Batch() for _ in range(3)]
    at = [x,grade,z]
    fork = min(3.0, max(2.22, h*.405))
    bend = (t*.32,fork*.58,-t*.30)
    limb(stem,(0,0,0),(0,.22,0),t*1.25,t)
    limb(stem,(0,.22,0),bend,t,t*.88)
    limb(stem,bend,(0,fork,0),t*.88,t*.76)
    elbow = (r*.08,fork+.46,r*.07)
    limb(wood,(0,fork,0),elbow,t*.77,t*.57)
    limb(wood,elbow,(r*.12,h*.89,-r*.10),t*.57,.025)
    turn = rng.random()*math.tau
    for j in range(7):
        angle = turn+j*2.39996+rng.uniform(-.16,.16)
        reach = r*spread*rng.uniform(.52,.72)
        ex,ez = reach*math.cos(angle),reach*math.sin(angle)
        base = fork+(h-fork)*(.02+.046*j)
        top = fork+(h-fork)*(.38+.049*j)
        knee = (ex*.42,base+.29,ez*.35)
        limb(wood,(r*.035,base,r*.02),knee,t*.52,t*.35)
        limb(wood,knee,(ex,top,ez),t*.36,.019)
        foliage(crown[j%3],rng,ex,top+.20,ez,r*spread*rng.uniform(.37,.54),
                (h-fork)*.29*fullness,r*spread*rng.uniform(.38,.57))
        # A smaller lateral spray at each fork breaks up the single solid crown outline.
        twig = angle+rng.uniform(-.72,.72)
        sx,sz = ex+.36*r*math.cos(twig),ez+.36*r*math.sin(twig)
        sy = top+rng.uniform(-.08,.24)
        limb(wood,(ex*.73,top-.12,ez*.73),(sx,sy,sz),t*.22,.012)
        foliage(crown[(j+1)%3],rng,sx,sy+.14,sz,r*.25,(h-fork)*.135,r*.24,6)
    foliage(crown[1],rng,r*.1,h-(h-fork)*.27,-r*.09,r*.57,(h-fork)*.27,r*.59)
    return [stem.part("s_bark",at,solid=True),wood.part("s_bark",at),
            *(batch.part(f"s_{leaf}{j}",at) for j,batch in enumerate(crown))]


def site_layer(layer, shell_hash, grade):
    require(layer["geometry_sha256"] == shell_hash, "Site layer belongs to another geometry revision")
    groups = []
    def add(name, pages, parts):
        groups.append({"name":name, "level":-1, "site":True,
                       "basis":"Illustrative · not surveyed", "pages":pages, "parts":parts})

    front = layer["frontage"]
    ends = set()
    for i,(a,b) in enumerate(front["runs"],1):
        a,b = vector(a,2),vector(b,2)
        add(f"Timber frontage · run {i}", [1,7,8], fence(a,b,grade,tuple(a) not in ends))
        ends.update(map(tuple,(a,b)))
    add("Pedestrian gate · inward swing", [1,7,8], [gate(front["leaf"],grade)])
    for p in layer["paving"]:
        ring = [vector(v,2) for v in p["ring"]]
        require(len(ring)>=3 and p["slot"] in {"s_apron","s_path","s_setts"}, "Invalid approach paving")
        add(p["name"],[1],[{"slab":[ring],"base":grade-.045,"depth":.045,"slot":p["slot"]}])
    for s in layer["trees"]:
        add(s["name"]+" · illustrative broadleaf", [1,6,7,8,9], tree(s,grade))
    start = dict(layer["start"],floor=grade)
    vector(start["xz"],2); number(start["heading"]); number(start.get("look_up",0))
    require(layer["notes"] and all(isinstance(s,str) for s in layer["notes"]), "Describe the site assumptions")
    return groups, {k:{"color":v} for k,v in COLORS.items()}, start, layer["notes"]
