"""Original furniture studies. Positive local Z faces the room; dimensions in metres."""
import math
from refined_layer import Fixture, ellipse, section
from site_layer import Batch


def disc(f,x,y,z,w,h,d,slot,solid=False):
    outline=ellipse(w,d,24)
    f.shell(slot,[section(outline,y-h/2,z,x),section(outline,y+h/2,z,x)],True,solid,True)


def table(f,w,h,d,slot="a_ash",storage=False):
    f.box(0,h-.021,0,w,.042,d,slot,.025)
    for u in (-1,1):
        for v in (-1,1):
            f.box(u*(w/2-.068),(h-.042)/2,v*(d/2-.067),.060,h-.042,.060,"a_frame",.009)
    if storage:
        for side in (-1,1):
            x=side*(w/2-.34)
            f.box(x,.381,-.015,.56,.681,d-.10,"a_putty",.016)
            for y in (.238,.54):
                f.box(x,y,d/2-.055,.535,.281,.03,"a_putty",.01)
                f.box(x,y+.09,d/2-.034,.19,.015,.022,"a_frame",.006)


def swivel(f):
    disc(f,0,.25,0,.074,.42,.074,"a_frame",True)
    for i in range(5):
        a=i*math.tau/5
        x,z=.235*math.cos(a),.235*math.sin(a)
        f.tube([(0,.14,0),(x,.069,z)],.017,"a_frame")
        f.box(x,.041,z,.067,.08,.063,"f_ink",.025)
    f.box(0,.462,0,.46,.085,.434,"a_felt",.067)
    f.box(0,.631,-.181,.065,.30,.043,"a_frame",.012)
    f.box(0,.793,-.197,.427,.30,.074,"a_felt",.03)


def media(f):
    f.box(0,.209,0,1.96,.29,.315,"a_ash",.02)
    for x in (-.70,0,.70):
        f.box(x,.041,0,.062,.082,.23,"a_frame")
    for x in (-.63,0,.63):
        f.box(x,.217,.160,.606,.224,.018,"a_putty",.008)
    f.box(0,.99,-.088,1.37,.785,.041,"a_frame",.016)
    f.box(0,.991,-.064,1.335,.75,.008,"a_screen",.003)
    for x in (-.41,.41):
        f.box(x,.488,-.087,.035,.267,.037,"a_frame")
        f.box(x,.371,-.04,.21,.023,.18,"a_frame",.01)


def corner_sofa(f):
    # Continuous plinth and corner cushion; not two overlapping complete sofas.
    for x,z,w,d in [(0,0,3.55,.91),(-1.315,1.04,.92,1.17)]:
        f.box(x,.125,z,w-.13,.16,d-.13,"a_frame",.034)
        f.box(x,.284,z,w,.223,d,"a_felt",.074)
        for u in (-1,1):
            for v in (-1,1):
                px,pz=x+u*(w/2-.16),z+v*(d/2-.14)
                # The textile starts at world (6.60,9.47); do not float a foot off the bare boards.
                base=.007 if 8+px>6.60 and 9.25+pz>9.47 else 0
                f.box(px,(base+.053)/2,pz,.073,.053-base,.065,"a_ash",.009)
    for x in (-1.315,-.44,.44,1.315):
        f.box(x,.428,.059,.866,.156,.753,"a_cushion",.073)
        f.box(x,.665,-.356,.87,.49,.185,"a_felt",.081)
    for z in (.745,1.338):
        f.box(-1.24,.428,z,.74,.156,.579,"a_cushion",.068)
        f.box(-1.669,.62,z,.19,.41,.59,"a_felt",.067)
    f.box(1.717,.547,.051,.116,.25,.75,"a_felt",.052)


def shelf(f,w,h,d):
    for x in (-1,1):
        f.box(x*(w/2-.022),h/2,0,.044,h,d,"a_ash")
    for y in (.13,h*.36,h*.64,h-.027):
        f.box(0,y,0,w-.075,.047,d,"a_ash",.009)
    f.box(0,h/2,-d/2+.011,w-.04,h,.022,"a_putty")


def wardrobe(f,w,h,d):
    f.box(0,h/2,-.019,w-.012,h-.012,d-.049,"a_ash",.012)
    n=math.ceil(w/.55)
    for i in range(n):
        x=w*((i+.5)/n-.5)
        f.box(x,h/2,d/2-.025,w/n-.007,h-.03,.042,"a_putty",.008)
        f.box(x+w/n*.32,h*.57,d/2+.002,.021,.206,.015,"a_frame",.006)


def laundry(f,dryer):
    f.box(0,.425,0,.586,.85,.58,"a_putty",.025)
    f.box(0,.746,.294,.55,.141,.02,"b_porcelain",.007)
    f.box(.105,.753,.307,.183,.046,.006,"a_screen",.003)
    for x,rad in [(-.081,.029),(.232,.012)]:
        f.tube([(x,.75,.303),(x,.75,.318)],rad,"a_frame")
    for z,r,slot in [(.291,.207,"b_silver"),(.305,.17,"a_frame"),(.310,.14,"a_window")]:
        f.tube([(0,.409,z),(0,.409,z+.012)],r,slot)
    f.box(.11,.160,.296,.206,.118,.014,"a_putty" if dryer else "b_porcelain",.005)


def terrace_chair(f):
    for x in (-.20,.20):
        for z in (-.19,.19):
            f.box(x,.203,z,.041,.406,.041,"a_teak",.006)
        f.box(x,.63,-.19,.04,.45,.04,"a_teak",.006)
    for i in range(5):
        f.box(0,.423,(i-2)*.083,.45,.035,.070,"a_teak",.01)
    for y in (.62,.72,.82):
        f.box(0,y,-.19,.45,.075,.037,"a_teak",.01)


def populate(add):
    def item(room,name,x,y,z,yaw,model,*args):
        f=Fixture(0,0,0)
        model(f,*args)
        # Overall proxy envelopes, measured unrotated from their generated geometry.
        ext=[[],[],[]]
        for p in f.parts:
            if "box" in p:
                for k,(v,s) in enumerate(zip(p["box"],p["size"])):
                    ext[k].extend([v-s/2,v+s/2])
            else:
                for pt in p["face"]:
                    for k,v in enumerate(pt):ext[k].append(v+p["at"][k])
        size=[round(max(a)-min(a),4) for a in ext]
        pose=Fixture(x,y,z,yaw)
        for p in f.parts:
            key="box" if "box" in p else "at"
            p[key]=pose.world(*p[key]);p["yaw"]=yaw
        add(name+" · dimensional PROXY",int(y>3),[2 if y>3 else 1],f.parts,
            furniture=True,room=room,size=size,use=name,note="Original drawing-guided massing; no retailer SKU.")

    e="Entrance hall"
    item(e,"Coat storage",2.32,0,4.65,-90,wardrobe,1.17,1.91,.37)
    item("Office","Two-place worktop",5.817,0,2.14,-90,table,2.78,.75,.55)
    for z in (1.20,2.70):
        item("Office","Swivel task chair",5.26,0,z,90,swivel)

    p="Plant room"
    def ventilation(f):
        f.box(0,.70,0,.64,1.34,.51,"a_putty",.027)
        for u in (-.233,.233):
            for v in (-.17,.17):f.box(u,.019,v,.071,.038,.071,"a_frame",.012)
        for x in (-.17,.17):
            disc(f,x,1.455,0,.133,.188,.133,"b_silver")
        for i in range(7):
            f.box(0,.81+i*.039,.256,.43,.013,.012,"a_frame")
        f.box(0,.46,.26,.20,.068,.013,"a_screen")
    def cylinder(f):
        loops=[section(ellipse(w,w),y) for w,y in [(.51,.013),(.644,.10),(.656,1.39),(.62,1.50),(.45,1.54)]]
        f.shell("b_porcelain",loops,True,True)
        f.box(0,.94,.33,.111,.139,.018,"a_frame",.008)
        disc(f,0,1.56,0,.19,.04,.19,"b_silver")
    item(p,"Heat-recovery ventilation unit",7.23,0,.72,0,ventilation)
    item(p,"Service cabinet (P.C. on plan)",8.14,0,.72,0,wardrobe,.49,1.09,.52)
    item(p,"DHW storage cylinder · plan label 300 L",9.15,0,.94,0,cylinder)

    k="Kitchen and dining"
    def island(f):
        f.box(0,.884,0,.80,.052,1.475,"a_ash",.025)
        for z in (-.49,.49):f.box(0,.421,z,.28,.84,.17,"a_putty",.025)
        f.box(0,.445,-.03,.22,.59,.79,"a_putty",.013)
    def stool(f):
        disc(f,0,.60,0,.389,.053,.389,"a_ash",True)
        for x in (-.112,.112):
            for z in (-.107,.107):f.box(x,.287,z,.035,.574,.035,"a_frame",.008)
            f.box(x,.202,0,.024,.024,.232,"a_frame")
    item(k,"Four-place work / breakfast peninsula",3.48,0,11.4075,0,island)
    for x in (3.10,3.91):
        for z in (10.99,11.73):item(k,"Round counter stool",x,0,z,0,stool)
    def dishwasher(f):
        f.box(0,.449,0,.598,.882,.596,"a_putty",.013)
        f.box(0,.89,0,.60,.04,.61,"f_pine",.005)
        f.box(0,.778,.30,.52,.094,.013,"b_silver",.006)
        f.box(0,.726,.304,.35,.015,.012,"a_frame")
    item(k,"Dishwasher on service return",1.56,0,9.04,0,dishwasher)
    item(k,"Peninsula return and landing top",3.49,0,12.45,180,table,.84,.91,.61)
    item(k,"Recessed counter bridge beyond sink door stroke",2.93,0,12.536,0,
         lambda f:f.box(0,.889,0,.28,.042,.438,"f_pine",.005))
    item("Pantry","North-wall food shelving",2.17,0,7.37,0,shelf,3.45,1.69,.36)
    item("Pantry","West return shelving",.61,0,8.04,90,shelf,.92,1.69,.34)
    l="Living room"
    item(l,"L sectional, west return",8.0,0,9.25,0,corner_sofa)
    item(l,"Low rounded coffee table",8.52,0,11.38,0,table,1.38,.405,.70)
    item(l,"Media display and low console",10.88,0,11.18,-90,media)
    add("Living · woven rug",0,[1],[dict(face=[[6.60,.007,9.47],[10.49,.007,9.47],[10.49,.007,13.07],[6.60,.007,13.07]],slot="a_rug")])
    item("Garage circulation and storage","Long divider / tool storage",-2.13,-.30,7.85,90,shelf,3.24,1.06,.39)
    item("Hobby room","Two-person craft counter",-3.03,-.30,12.42,180,table,5.08,.76,.69,"a_ash",True)
    item("Master bedroom","Foot-of-bed upholstered bench",7.80,3.15,2.80,0,table,1.44,.415,.44,"a_cushion")
    for x,z,yaw,w in [(1.26,3.40,0,1.59),(2.81,5.19,180,2.18)]:
        item("Dressing room","Sliding storage run",x,3.15,z,yaw,wardrobe,w,1.51,.49)
    item("Bedroom 2","Low folded-storage extension",2.86,3.15,9.58,0,wardrobe,1.84,1.16,.47)
    item("Bedroom 1","Low wardrobe return",8.46,3.15,12.52,180,wardrobe,2.10,1.16,.47)
    for x,dryer in [(1.02,False),(1.65,True)]:
        item("Laundry","Tumble dryer" if dryer else "Front-loading washer",x,3.15,6.69,180,laundry,dryer)
    def ironing(f):
        f.box(0,.89,0,1.31,.048,.367,"a_felt",.167)
        for side in (-1,1):
            for s in (-1,1):
                f.tube([(s*.44,.027,side*.124),(-s*.36,.867,side*.124)],.014,"b_silver")
    item("Laundry","Sorting top over laundry pair",1.335,3.15,6.69,0,
         lambda f:f.box(0,.876,0,1.28,.042,.62,"a_ash",.014))
    item("Laundry","Rounded ironing board",2.83,3.15,6.75,0,ironing)
    t="Rear terrace"
    def dining(f):
        for x in (-.305,.305):
            for z in (-.745,.745):f.box(x,.352,z,.067,.704,.067,"a_teak",.008)
        for i in range(10):
            f.box(0,.728,(i-4.5)*.181,.86,.05,.172,"a_teak",.012)
    item(t,"Slatted outdoor dining table",2.92,-.02,15.10,0,dining)
    for x,z,a in [(2.28,14.68,90),(2.28,15.52,90),(3.56,14.68,-90),(3.56,15.52,-90),
                  (2.92,13.98,0),(2.92,16.22,180)]:
        item(t,"Outdoor dining chair",x,-.02,z,a,terrace_chair)
