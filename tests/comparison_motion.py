"""Apply the existing swept path instruments to the actual selected comparison car.

No drawing, geometry or renderer edits. A colliding trial is a measured outcome,
not permission to change the centre or substitute a different approach.
"""
from argparse import ArgumentParser
from pathlib import Path
from tempfile import TemporaryDirectory
from alignment_probe import observe

HERE=Path(__file__).resolve().parent


def adapt(text,old,new):
    assert text.count(old)==1,old
    return text.replace(old,new)


def run(browser,site,out,car,bay,kind,alternate=False):
    activate=f"""
const setControl=(id,value)=>{{const e=$(id);e.value=value;e.dispatchEvent(new Event('change'));}};
setControl('v-bay','{bay}');setControl('v-car','{car}');
check(vehicleStudy.state().id==='{car}'&&vehicleStudy.state().bay==='{bay}','Scenario selection failed');
const carSpec=data.comparison.cars['{car}'];
"""
    if kind=="turn":
        text=(HERE/"vehicle_approach.js").read_text("utf-8")
        if alternate:
            # Additional full-car trial only, not a replacement for the default
            # approach and trailer/store checks at the selected parking pose.
            text=adapt(text,"for(const key of ['trailer','car'])","for(const key of ['car'])")
            text=adapt(text,"entry=-5.7","entry=-4.5")
        text=adapt(text,"[endX,,bay]=data.vehicles.carport[key]",
            "[endX,,bay]=key==='car'?G.car.position.toArray():data.vehicles.carport.trailer")
        # A witnessed intersection is conclusive, including between endpoints.
        text=adapt(text,"const bound=got.m-", "if(best===0){lower=0;return;} const bound=got.m-")
        text=adapt(text,"check(clear.lower>0&&kerb.lower>0&&turnHead>0&&straightHead.m>0,'Approach conflict: '+JSON.stringify(out));",
            """out.trial=clear.upper===0||kerb.upper===0?'contact':clear.lower>0&&kerb.lower>0&&turnHead>0&&straightHead.m>0?'separated':'unresolved';
            check(out.trial!=='unresolved','Refine ambiguous sweep');""")
    else:
        text=(HERE/"vehicle_garage_drive.js").read_text("utf-8")
        text=adapt(text,"let actual=Infinity","const [rear,front]=carSpec.axles,R=carSpec.wheelbase===3.14?.344:.289,W=carSpec.wheelbase,H=carSpec.height,half=carSpec.length/2;let actual=Infinity")
        text=text.replace("1.23*Math.cos(t)","(-rear)*Math.cos(t)").replace("1.21*Math.cos(t)","front*Math.cos(t)").replace("2.44*Math.cos(t)","W*Math.cos(t)").replace("1.21*Math.sin(t)+.289*","front*Math.sin(t)+R*")
        text=adapt(text,".152/2.44,dy=(2.173+1.23)*sin+.289*(1-Math.sqrt(1-sin*sin)),dz=2.173+1.435*sin",
                   ".152/W,dy=(half+Math.max(front,-rear))*sin+R*(1-Math.sqrt(1-sin*sin)),dz=half+H*sin")
        text=adapt(text,"Math.abs(lower-.3425)<.0002&&Math.abs(actual-lower)<.0002",
                   "lower>.025&&actual>=lower-.0002&&Math.abs(lower-(1.16-carSpec.mirrors/2))<.0002")
        text=adapt(text,"up>.74&&up<.76","up>.025&&up<1.1")
    with TemporaryDirectory() as folder:
        probe=Path(folder)/"selected.js";probe.write_text(activate+text,"utf-8")
        observe(browser,site,probe,out)


if __name__=="__main__":
    p=ArgumentParser(description=__doc__);p.add_argument("browser");p.add_argument("site",type=Path);p.add_argument("out",type=Path)
    p.add_argument("car",choices=["dacia","mercedes"]);p.add_argument("bay",choices=["original","center"]);p.add_argument("kind",choices=["turn","garage"])
    p.add_argument("--alternate",action="store_true",help="also test the explicit x=-4.50 entry line, car only, no changed parking centre")
    a=p.parse_args();run(a.browser,a.site,a.out,a.car,a.bay,a.kind,a.alternate)
