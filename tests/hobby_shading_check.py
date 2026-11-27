"""Reproduce the fixed, illuminated hobby-wall witness; no supersampling or material suppression."""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter, ImageStat


def metrics(folder):
    results={}
    for mode in ("normal","lamp-off","no-received-shadow","boundary-shift-only"):
        with Image.open(folder/(mode+".png")) as im:
            assert im.size==(1000,600)
            # Interior patch of the south face; excludes the lamp, edges, joinery and highlights.
            luma=im.convert("L").crop((723,70,782,274))
        delta=ImageChops.difference(luma,luma.filter(ImageFilter.MedianFilter(3)))
        results[mode]=dict(speckles=sum(delta.histogram()[12:]),mean_luma=round(ImageStat.Stat(luma).mean[0],3))
    return results


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("after",type=Path);p.add_argument("--before",type=Path)
    args=p.parse_args();after=metrics(args.after)
    assert after["normal"]["speckles"]<=4 and after["normal"]["mean_luma"]>after["lamp-off"]["mean_luma"]+15,after
    result={"repaired":after}
    if args.before:
        before=metrics(args.before)
        assert before["normal"]["speckles"]>100 and before["no-received-shadow"]["speckles"]>100
        assert before["boundary-shift-only"]["speckles"]<5 and before["lamp-off"]["speckles"]<5
        result["reviewed_round_one"]=before
    print(json.dumps(result,indent=2))
