"""House comparison-only original metric proxies. +Z at front, tyre tangent Y=0."""
import math
from vehicle_models import Model, arch_skirt, hull, sudwind, wheel


def mirrors(m, half, root, z, y, paint):
    for s in (-1, 1):
        m.tube("mirror stalk", "v_dark", (s*root, y-.04, z), (s*(half-.08), y, z), .022)
        m.box("deployed mirror housing", paint, s*(half-.074), y+.02, z, .148, .098, .112)
        m.box("mirror lens", "v_silver", s*(half-.074), y+.02, z-.057, .129, .077, .004)


def dacia_mirrors():
    m=Model()
    mirrors(m,.945,.739,.824,.918,"v_chrome")
    return m.result()


def mercedes():
    m=Model()
    # Not a stretched Dacia. Dense lower cladding, a long rear door and high
    # square tail; separate narrow sill, wheelhouse arches, shoulder and hood.
    m.box("illustrative floor pressing","v_under",0,.2465,.01,1.48,.103,4.58)
    for s in (-1,1):
        arch_skirt(m,"lower door cladding","c_clad",s,.921,-2.49,2.49,.755,.275,
                   [(-1.60,.344),(1.54,.344)],.384)
        for z,track in [(-1.60,1.579),(1.54,1.606)]:
            wheel(m,s,z,track/2,.344,.235)
            # Original eight-hole alloy face and five lugs, not the Dacia hub.
            x=s*(track/2+.235/2+.013)
            m.tube("alloy wheel dish","v_silver",(x-s*.006,.344,z),(x,.344,z),.195,40,.182)
            for i in range(8):
                a=math.tau*i/8
                m.poly("alloy ventilation pockets","v_graphite",*[(x+s*.001,
                    .344+(.147+.018*math.cos(t))*math.cos(a)-.031*math.sin(t)*math.sin(a),
                    z+(.147+.018*math.cos(t))*math.sin(a)+.031*math.sin(t)*math.cos(a))
                    for t in [math.tau*j/12 for j in range(12)]])
            for i in range(5):
                a=math.tau*i/5;y=.344+.078*math.cos(a);zz=z+.078*math.sin(a)
                m.tube("lug recess","v_graphite",(x,y,zz),(x+s*.002,y,zz),.010,8)
        m.box("rocker cover","c_clad",s*.914,.278,-.03,.036,.046,2.30)
    hull(m,"shoulder hood and deck","c_blue",[
        (-2.533,.848,.84,.839,.434,.024),(-2.42,.915,.917,.912,.734,.029),
        (-1.86,.943,.92,.927,.734,.028),(-1.53,.941,.921,.94,.734,.024),
        (1.13,.939,.921,.894,.734,.026),(1.70,.943,.921,.862,.733,.035),
        (2.40,.906,.921,.808,.721,.031),(2.518,.843,.837,.775,.438,.026)])
    for end in (-1,1):
        hull(m,"molded bumper "+str(end),"c_clad",sorted([
            (end*2.6065,.801,.767,.552,.339,.014),(end*2.548,.89,.849,.568,.313,.019),
            (end*2.465,.918,.884,.565,.297,.015)]))
        m.box("bumper rubbing band","v_graphite",0,.502,end*2.596,1.62,.031,.018)
    for s in (-1,1):
        for z in (-1.42,-.12,1.10):
            # The top of the 6 mm-radius seam stays inside the 0.943 m shoulder.
            m.tube("coach door shut","v_dark",(s*.923,.305,z+.06),(s*.937,.892,z),.006,6)
        m.box("belt brightwork","v_chrome",s*.938,.889,-.11,.007,.015,2.90)
        for z in (-1.14,.122):
            m.box("recessed door pull","v_dark",s*.94,.826,z,.006,.037,.172)
            m.box("chrome grip","v_silver",s*.941,.837,z,.004,.013,.145)
    # Narrower roof than shoulders; glazing lies on sloping side faces rather
    # than decals inside an opaque cabin. B and C pillars separate four doors.
    stations=[(-1.77,.867,.942),(-1.18,.744,1.414),(-.97,.719,1.472),
              (.38,.712,1.472),(.552,.728,1.432),(1.32,.861,.909)]
    m.loft("long saloon cabin","c_blue",[[(-.875,.899,z),(.875,.899,z),(w,y,z),
        (0,y+(.014 if y==1.472 else .006),z),(-w,y,z)] for z,w,y in stations])
    for s in (-1,1):
        for n,pts in [
            ("fixed quarter pane",[(-1.57,.951,.864),(-1.15,1.382,.767),(-1.07,1.399,.755),(-1.16,.951,.874)]),
            ("long rear door glass",[(-1.13,.95,.875),(-1.04,1.404,.752),(-.165,1.42,.745),(-.15,.938,.876)]),
            ("front door glass",[(-.085,.937,.876),(-.092,1.42,.746),(.49,1.402,.750),(1.202,.935,.87)])]:
            points=[(s*w,y,z) for z,y,w in pts]
            m.poly(n+" surround","v_silver",*points)
            mid=[sum(p[i] for p in points)/4 for i in range(3)]
            m.poly(n,"c_glass",*[(mid[0]+.965*(x-mid[0])+s*.006,mid[1]+.941*(y-mid[1]),mid[2]+.963*(z-mid[2])) for x,y,z in points])
    for n,i,j,sg in [("windscreen",5,4,1),("rear glass",0,1,-1)]:
        a,b=stations[i],stations[j]
        def edge(t):
            z,w,y=[p+t*(q-p) for p,q in zip(a,b)]
            return [(s*(w-.044),y+.011,z+sg*.006) for s in (-1,1)]
        m.poly(n,"c_glass",*(edge(.06)+edge(.947)[::-1]))
    for s in (-1,1):
        m.poly("wide rectangular headlamp","v_lamp",(s*.337,.606,2.539),(s*.792,.583,2.527),
               (s*.809,.759,2.524),(s*.346,.776,2.541))
        m.box("corner turn signal","v_amber",s*.835,.675,2.506,.079,.15,.048)
        for h in (.635,.692):
            m.box("headlamp fluting","v_silver",s*.572,h,2.539,.418,.005,.002)
        m.tube("bonnet side crease","c_clad",(s*.743,.842,2.337),(s*.785,.908,1.325),.0045,6)
        m.tube("rear deck side crease","c_clad",(s*.761,.927,-2.387),(s*.79,.953,-1.827),.0045,6)
        m.box("fog lens","v_lamp",s*.624,.399,2.588,.17,.054,.016)
        m.poly("ribbed tail cluster","v_red",(s*.516,.627,-2.541),(s*.837,.616,-2.526),
               (s*.855,.813,-2.519),(s*.495,.826,-2.541))
        m.box("smoked rear indicator","v_graphite",s*.686,.781,-2.543,.322,.044,.009)
        m.box("reversing light","v_lamp",s*.547,.704,-2.545,.082,.036,.008)
        for y in (.649,.673,.733):
            m.box("tail lens fluting","v_red",s*.681,y,-2.546,.309,.009,.008)
    m.box("chrome grille frame","v_chrome",0,.696,2.526,.683,.22,.034)
    m.box("radiator opening","v_dark",0,.696,2.546,.646,.19,.01)
    for i in range(6):
        m.box("horizontal grille slat","v_silver",0,.622+i*.03,2.557,.632,.011,.015)
    m.box("grille centre rib","v_silver",0,.696,2.563,.014,.184,.01)
    m.box("tail plate recess","v_plate",0,.706,-2.54,.472,.11,.014)
    mirrors(m,1.10,.839,.997,.989,"c_blue")
    return m.result()


def caravan():
    """Keep original eaves & rear crown, flatten ONLY the AC mounting panel.

    The legacy flat section is 2.550 at the shoulder and 2.570 at
    the crown. Carry the shoulder plane under the unit, not the maximum.
    No change to the critical outboard rear corner or factory travel height.
    """
    parts=sudwind()
    m=Model()
    hull(m,"touring body","v_coach",[(z,w,w,hi,.825,crown) for z,w,hi,crown in [
        (-3.355,1.104,2.20,.02),(-3.27,1.141,2.40,.02),(-3.10,1.15,2.525,.02),
        (-2.95,1.15,2.55,.02),(-1.00,1.15,2.55,.02),(-.20,1.15,2.55,0),
        (1.14,1.15,2.55,0),(1.36,1.15,2.49,.02),(1.73,1.14,2.25,.02),
        (1.933,1.128,1.66,.02),(1.995,1.08,1.18,.02)]])
    return [m.result()[0] if p["component"]=="touring body" else p for p in parts]


def ac():
    # Geometry in mounting-skin coordinates; the UI scales only its height.
    m=Model()
    hull(m,"AC cowl","v_coach",[(-.376,.261,.252,.128,.016,.012),
        (-.306,.349,.32,.198,.012,.014),(-.205,.351,.32,.214,.012,.011),
        (.192,.351,.32,.213,.012,.012),(.327,.329,.308,.15,.012,.011),
        (.376,.277,.26,.082,.016,.008)])
    m.box("AC base gasket","v_graphite",0,.008,0,.636,.016,.675)
    for s in (-1,1):
        for i in range(12):
            m.box("AC intake louvers","v_graphite",s*.348,.144,-.194+i*.028,.004,.065,.012)
    return m.result()
