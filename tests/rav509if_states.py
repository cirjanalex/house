"""Run the complete historical two-car interaction probe on the new control lattice."""
import argparse
from pathlib import Path
from tempfile import TemporaryDirectory
from alignment_probe import observe


def run(browser, site, out):
    text=Path(__file__).with_name("comparison_states.js").read_text("utf-8")
    def edit(old,new,n=1):
        nonlocal text
        assert text.count(old)==n,old
        text=text.replace(old,new)
    edit("if(top<1.80){set('h',+(top+.01).toFixed(2))", "if(top<1.825){set('h',+(top+.005).toFixed(3))")
    edit("first disallowed cm","first disallowed 5 mm")
    edit("set('h',1.80)", "set('h',1.825)",3)
    edit("cursă 1,800","cursă 1,825")
    edit("near(S().h,1.8,'unloaded stroke')","near(S().h,1.825,'unloaded stroke')")
    with TemporaryDirectory() as temp:
        probe=Path(temp)/"states.js";probe.write_text(text,"utf-8");observe(browser,site,probe,out)


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("browser");p.add_argument("site",type=Path);p.add_argument("out",type=Path)
    a=p.parse_args();run(a.browser,a.site,a.out)
