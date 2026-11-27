"""Original metre-scale polygon models. Local +z is front / coupling, +y is up."""
import math
from collections import defaultdict


class Model:
    def __init__(self):
        self.parts = defaultdict(lambda: ([], []))

    def poly(self, name, slot, *points):
        v, ix = self.parts[name, slot]
        k = len(v)
        v.extend([[round(c, 7) for c in p] for p in points])
        for j in range(1, len(points)-1):
            ix.extend((k, k+j, k+j+1))

    def loft(self, name, slot, rings):
        self.poly(name, slot, *reversed(rings[0]))
        self.poly(name, slot, *rings[-1])
        for a, b in zip(rings, rings[1:]):
            for j in range(len(a)):
                i = (j+1) % len(a)
                self.poly(name, slot, a[j], a[i], b[i], b[j])

    def box(self, name, slot, x, y, z, w, h, d):
        self.loft(name, slot, [[(x+i*w/2, y+j*h/2, z+k*d/2)
                               for i,j in [(1,-1),(1,1),(-1,1),(-1,-1)]] for k in (-1,1)])

    def tube(self, name, slot, a, b, r, n=12, radius_b=None):
        def norm(v):
            l=math.hypot(*v)
            return [c/l for c in v]
        def cross(v,w):
            return [v[1]*w[2]-v[2]*w[1],v[2]*w[0]-v[0]*w[2],v[0]*w[1]-v[1]*w[0]]
        u=norm([h-g for g,h in zip(a,b)])
        v=norm(cross(u, [0,0,1] if abs(u[2])<.8 else [0,1,0]))
        w=cross(u,v)
        self.loft(name,slot,[[[o[j]+radius*(math.cos(2*math.pi*i/n)*v[j]+math.sin(2*math.pi*i/n)*w[j])
                               for j in range(3)] for i in range(n)] for o,radius in [(a,r),(b,r if radius_b is None else radius_b)]])

    def result(self):
        return [dict(component=n,slot=s,face=v,indices=ix) for (n,s),(v,ix) in self.parts.items()]


def wheel(m, s, z, axle, radius, tyre):
    x=s*axle; y=radius
    def disk(name,slot,u,v,r,r2=None,n=32):
        m.tube(name,slot,(x+s*u,y,z),(x+s*v,y,z),r,n,r2)
    disk("tyre","v_tyre",-tyre/2,tyre/2-.019,radius)
    disk("rounded sidewall","v_tyre",tyre/2-.019,tyre/2,radius,radius-.02)
    disk("rim flange","v_chrome",tyre/2,tyre/2+.004,radius*.645)
    disk("pressed steel wheel","v_wheel",tyre/2+.004,tyre/2+.009,radius*.59)
    disk("hub cap","v_chrome",tyre/2+.009,tyre/2+.022,radius*.36,radius*.29)
    for i in range(8):
        a=math.tau*i/8
        yy=y+.48*radius*math.sin(a); zz=z+.48*radius*math.cos(a)
        m.tube("wheel vents","v_dark",(x+s*(tyre/2+.008),yy,zz),(x+s*(tyre/2+.011),yy,zz),radius*.071,8)


def hull(m,name,slot,stations):
    # z, shoulder half-width, bottom half-width, shoulder y, bottom y, crown rise
    m.loft(name,slot,[[(-b,lo,z),(b,lo,z),(w,hi-.045,z),(w-.026,hi,z),
                        (0,hi+rise,z),(-w+.026,hi,z),(-w,hi-.045,z)]
                      for z,w,b,hi,lo,rise in stations])


def arch_skirt(m,name,slot,s,w,z0,z1,top,bottom,axes,r):
    profile=[(z0,bottom)]
    for z,y in axes:
        profile.append((z-r,bottom))
        for i in range(17):
            a=math.pi*(1-i/16)
            profile.append((z+r*math.cos(a),y+r*math.sin(a)))
        profile.append((z+r,bottom))
    profile.append((z1,bottom))
    for (a,ya),(b,yb) in zip(profile,profile[1:]):
        if b-a<1e-6:continue
        x=s*w
        m.poly(name,slot,(x,ya,a),(x,yb,b),(x,top,b),(x,top,a))
        m.poly(name+" return",slot,(x,ya,a),(x-s*.035,ya,a),(x-s*.035,yb,b),(x,yb,b))


def dacia():
    m=Model()
    # A longitudinal keel leaves actual cut-outs behind the four wing openings.
    m.box("floor pan","v_under",0,.317,0,1.21,.164,3.91)
    for s in (-1,1):
        arch_skirt(m,"curved wing and sill","v_ivory",s,.796,-2.03,2.015,.674,.31,[(-1.23,.289),(1.21,.289)],.342)
        for z in (-1.23,1.21):wheel(m,s,z,.699,.289,.176)
        m.box("sill molding","v_chrome",s*.797,.335,-.008,.01,.017,1.72)
    hull(m,"shoulder, bonnet and boot","v_ivory",[
        (-2.09,.743,.717,.752,.379,.012),(-2.03,.797,.796,.812,.663,.01),
        (-1.42,.8175,.796,.841,.663,.015),(-1.09,.816,.796,.853,.663,.015),
        (.78,.808,.796,.829,.663,.022),(1.32,.813,.796,.814,.663,.018),
        (2.015,.794,.796,.756,.663,.016),(2.084,.761,.723,.726,.376,.009)])
    # Greenhouse pillars are bodywork; each inset pane has its own dark gasket.
    stations=[(-1.40,.755,.837),(-.81,.635,1.367),(-.62,.60,1.418),
              (.45,.587,1.420),(.62,.616,1.361),(1.088,.749,.819)]
    m.loft("notchback greenhouse","v_ivory",[[(-.752,.812,z),(.752,.812,z),(w,top,z),
             (0,top+(.015 if z in (-.62,.45) else 0),z),(-w,top,z)] for z,w,top in stations])
    def frame(name,pts,shrink=.925):
        m.poly(name+" gasket","v_dark",*pts)
        ctr=[sum(p[j] for p in pts)/len(pts) for j in range(3)]
        # offset glass from the rubber, along the outward face normal
        dx,dy,dz=ctr
        normal=(math.copysign(.002,dx),0,0) if abs(dx)>.3 else (0,.002,math.copysign(.002,dz))
        m.poly(name,"v_glass",*[tuple(ctr[j]+shrink*(p[j]-ctr[j])+normal[j] for j in range(3)) for p in pts])
    for s in (-1,1):
        def pane(name,coords):
            frame(name,[(s*(w+.004),y,z) for z,y,w in coords])
        pane("rear quarterlight",[(-1.29,.862,.735),(-.827,1.324,.652),(-.79,1.33,.647),(-.92,.862,.755)])
        pane("rear door window",[(-.895,.862,.756),(-.766,1.333,.651),(-.164,1.36,.646),(-.16,.855,.759)])
        pane("front door window",[(-.115,.855,.759),(-.123,1.36,.646),(.502,1.346,.642),(.86,.85,.756)])
        pane("vent window",[(.889,.848,.757),(.611,1.265,.663),(1.015,.848,.757)])
        # Dark door shut lines, belt strip and two small period handles per side.
        for z,bot in [(-1.31,-.82),(-.14,-.13),(.994,.94)]:
            m.tube("door shut line","v_seam",(s*.798,.329,bot),(s*.813,.816,z),.004,6)
        m.tube("belt brightwork","v_chrome",(s*.813,.802,-1.50),(s*.811,.795,1.34),.0045,8)
        for z in (-.795,.02):m.box("door handles","v_chrome",s*.81,.756,z,.015,.023,.114)
    for name,a,b,lo,hi in [("rear screen",stations[0],stations[1],.076,.958),
                             ("windscreen",stations[-1],stations[-2],.076,.958)]:
        def edge(t):
            z,w,y=[i+t*(j-i) for i,j in zip(a,b)]
            return [(s*(w-.037),y+.007,z) for s in (-1,1)]
        frame(name,edge(lo)+edge(hi)[::-1])
    for s in [-1,1]:
        m.tube("wiper","v_dark",(s*.42,.88,1.047),(s*.42+.30,.937,.998),.007,6)
    m.box("black grille","v_dark",0,.607,2.084,1.49,.226,.027)
    for i in range(7):m.box("grille louvres","v_graphite",0,.527+i*.025,2.101,.673,.009,.011)
    for x in [-.626,-.399,.399,.626]:
        m.tube("four headlamp bezels","v_chrome",(x,.625,2.09),(x,.625,2.116),.104,32)
        m.tube("four round headlamps","v_lamp",(x,.625,2.116),(x,.625,2.129),.087,32,.077)
    for s in [-1,1]:
        m.box("front indicator","v_amber",s*.635,.459,2.081,.164,.055,.029)
        m.box("rear pod trim","v_chrome",s*.60,.664,-2.091,.293,.122,.024)
        m.box("early stop lamp","v_red",s*.547,.665,-2.108,.154,.086,.02)
        m.box("outboard indicator","v_amber",s*.680,.665,-2.108,.097,.086,.02)
        m.box("separate reversing lens","v_lamp",s*.625,.498,-2.095,.088,.037,.017)
        for end in [-1,1]:
            m.box("bumper overriders","v_dark",s*.504,.365,end*2.1425,.082,.14,.06)
    for end in [-1,1]:
        m.box("slim bumper","v_chrome",0,.378,end*2.112,1.558,.06,.083)
        for s in [-1,1]:m.box("bumper corner return","v_chrome",s*.776,.378,end*2.014,.033,.056,.215)
    m.box("boot bright strip","v_chrome",0,.766,-2.09,1.431,.015,.012)
    m.box("unlettered rear plate","v_plate",0,.578,-2.104,.438,.108,.012)
    m.tube("fuel cap","v_chrome",(-.32,.609,-2.09),(-.32,.609,-2.107),.045,20)
    return m.result()


def sudwind():
    m=Model()
    # The envelope centre, NOT the axle or the body centre, is the parking datum.
    rear, nose, axle=-3.355,1.995,-.77
    rings=[(rear,1.104,2.20,.58),(-3.27,1.141,2.40,.52),(-3.10,1.15,2.525,.50),
           (-2.95,1.15,2.55,.50),(1.14,1.15,2.55,.50),(1.36,1.15,2.49,.50),
           (1.73,1.14,2.25,.50),(1.933,1.128,1.66,.50),(nose,1.08,1.18,.56)]
    # Upper shell springs from above the wheel wells. Lower valance has true openings.
    hull(m,"touring body","v_coach",[(z,w,w,hi,.825,.02) for z,w,hi,b in rings])
    for s in [-1,1]:
        arch_skirt(m,"wheel arch valance","v_silver",s,1.15,-3.27,1.932,.828,.493,[(axle,.325)],.372)
        wheel(m,s,axle,1.015,.325,.19)
        # Thin original waist stripes, rain rails; separate glazed acrylic windows and gasket.
        for y,h,slot in [(1.1,.06,"v_stripe"),(1.158,.013,"v_silver"),(2.472,.02,"v_silver")]:
            m.box("side line","%s"%slot,s*1.152,y,-.91,.008,h,4.19)
        for z,w in ([(-2.22,1.05),(-.67,.66),(1.00,.69)] if s>0 else [(-2.22,.99),(.85,.85)]):
            m.box("window surround","v_graphite",s*1.151,1.83,z,.011,.635,w)
            m.box("tinted acrylic window","v_camperglass",s*1.158,1.83,z,.004,.56,w-.066)
        if s<0:
            z=-.094
            m.box("habitation door frame","v_graphite",-1.151,1.419,z,.012,1.795,.627)
            m.box("habitation door","v_coach",-1.1565,1.419,z,.003,1.746,.582)
            m.box("door glazing","v_camperglass",-1.1596,1.87,z,.0008,.544,.345)
            m.box("door latch","v_graphite",-1.1596,1.36,z+.221,.0008,.102,.042)
    for name,a,b in [("rear skirt",rings[0],rings[1]),("bow skirt",rings[-2],rings[-1])]:
        hull(m,name,"v_silver",[(z,w,w-.02,.825,bottom,0) for z,w,_,bottom in (a,b)])
    for end,z in [(1,1.845),(-1,rear-.0)]:
        if end>0:
            for slot,w,off in [("v_dark",.91,0),("v_camperglass",.849,.004)]:
                m.poly("bow glazing",slot,(-w,1.69,1.931+off),(w,1.69,1.931+off),(w,2.191,1.759+off),(-w,2.191,1.759+off))
        else:
            for s in [-1,1]:m.box("rear lighting","v_red",s*.94,.946,z+.004,.282,.073,.008)
    m.box("underframe","v_under",0,.49,-.6,1.65,.13,4.92)
    for s in [-1,1]:
        m.tube("A frame "+str(s),"v_wheel",(s*.83,.45,1.50),(s*.045,.465,3.155),.059,6)
    m.tube("overrun shaft","v_chrome",(0,.465,3.02),(0,.465,3.265),.072,16)
    m.box("coupling head","v_silver",0,.461,3.263,.138,.112,.184)
    m.tube("coupling lever","v_dark",(0,.505,3.19),(0,.606,3.092),.023,8)
    m.tube("jockey jack","v_wheel",(.153,.158,2.71),(.153,.672,2.71),.025)
    m.tube("jockey wheel","v_tyre",(.12,.104,2.71),(.186,.104,2.71),.104,24)
    return m.result()
