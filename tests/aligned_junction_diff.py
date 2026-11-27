"""Verify that the JCT-01 candidate differs from the reviewed round-two export only at the return."""
import argparse
import hashlib
import json
from pathlib import Path
import re
from aligned_check import scene


def compare(prior,candidate):
    a,b=scene(prior),scene(candidate)
    def viewer(p):
        return re.sub(rb'(<script[^>]+id="scene-data"[^>]*>).*?(</script>)',rb'\1\2',p.read_bytes(),flags=re.S)
    assert viewer(prior)==viewer(candidate)
    changed={k for k in a.keys()|b.keys() if a.get(k)!=b.get(k)}
    assert changed=={"groups","aligned"}
    assert {k for k in a["aligned"] if a["aligned"][k]!=b["aligned"][k]}=={"repair","sheets"}
    assert b["aligned"]["repair"]==3 and a["aligned"]["sheets"][1:]==b["aligned"]["sheets"][1:]
    footprint="Ground footprint";walls="Ground envelope and openings";coat="Annex and living projection · light grey outer render"
    delta={}
    for g,h in zip(a["groups"],b["groups"],strict=True):
        assert g|{"parts":None}==h|{"parts":None}
        if g==h:continue
        gone=[p for p in g["parts"] if p not in h["parts"]]
        added=[p for p in h["parts"] if p not in g["parts"]]
        delta[g["name"]]=(len(gone),len(added))
        if g["name"]==walls:
            for p in gone+added:
                assert p["slot"]=="render" and p["box"][1]==1.51 and p["size"][1]==3.02
                assert 5.64<p["box"][0]<6.08 and 13.39<p["box"][2]<=14 and not p.get("door")
        elif g["name"]==coat:
            assert all(p["slot"]=="a_plaster" and all(5.447<=x<=6.501 and 13<=z<=14.203
                       for x,y,z in p["face"]) for p in gone+added)
        elif g["name"]==footprint:
            boards,=[p for p in added if p["slot"]=="floor"]
            plinth,=[p for p in added if p["slot"]=="stone"]
            ring=gone[0]["slab"][0];i=ring.index([5.455,14.2])
            assert boards==dict(gone[0],slab=[ring[:i]+[[5.65,14.2],[5.65,14],[5.455,14]]+ring[i+1:]])
            assert plinth==dict(slab=[[[5.455,14],[5.65,14],[5.65,14.2],[5.455,14.2]]],
                                base=-.02,depth=.02,slot="stone")
    assert delta=={footprint:(1,2),walls:(2,2),coat:(2,3)},delta
    return dict(viewer_unchanged=True,unchanged_groups=len(a["groups"])-len(delta),
                changed_parts_removed_added=delta,board_area_reassigned_m2=.039)


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reviewed",type=Path);parser.add_argument("candidate",type=Path)
    args=parser.parse_args();print(json.dumps(compare(args.reviewed,args.candidate),indent=2))
