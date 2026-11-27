"""Candidate-specific dependencies for three inherited walks; keep all their stops and assertions."""
import argparse
from pathlib import Path
from tempfile import TemporaryDirectory

from walk_review import review, ROOT


def prepare(folder, name):
    tests=ROOT/"tests"
    sources={"aligned_interior":["house_aligned_legs"],
             "aligned_details":["house_aligned_legs"],
             "aligned_baths":["house_aligned_legs","house_refined_baths"]}[name]+["house_"+name]
    for n in sources:
        text=(tests/(n+".js")).read_text("utf-8")
        if n=="house_aligned_legs":
            old="via([-1.17,5.85],[-3.15,5.85])"
            assert text.count(old)==1
            text=text.replace(old,"via([-1.17,5.48],[-3.15,5.48])")
        if n=="house_aligned_details":
            old="'Garage circulation and storage':['garage-divider',[-2.13,.48,7.89]],"
            assert text.count(old)==1
            text=text.replace(old,"")
            mark="    if(inventoryTargets[name])"
            assert text.count(mark)==1
            text=text.replace(mark,"    if(name==='Garage circulation and storage')example('fixed-workshop-wall',[-2.06,1.70,7.89]);\n"+mark)
        (folder/(n+".js")).write_text(text,"utf-8")
    return folder/("house_"+name+".js")


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("browser");p.add_argument("html",type=Path)
    p.add_argument("route",choices=["aligned_interior","aligned_baths","aligned_details"])
    p.add_argument("--evidence-dir",type=Path)
    a=p.parse_args()
    with TemporaryDirectory() as temp:
        review(a.browser,a.html,evidence_dir=a.evidence_dir,route=prepare(Path(temp),a.route))
