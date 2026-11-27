"""Run every historical browser check; account for the new foreground on six gable rays."""
from pathlib import Path
from tempfile import TemporaryDirectory
import argparse
import re
import subprocess
from html import unescape

from browser_check import CHECK


def run(browser,site):
    a="const direction=[-eye[0],y-eye[1],z-eye[2]],hits=cast(eye,direction,outerEnvelope);"
    b="""const direction=[-eye[0],y-eye[1],z-eye[2]];
    const actualWall=outerEnvelope.filter(m=>m.userData.part.component==='workshop masonry');
    check(actualWall.length===1,'Expected the fixed wall');
    const foreground=cast(eye,direction,actualWall),through=cast(eye,direction,outerEnvelope);
    // Same six rays, same sources, same original far-face and seam tests.
    // Two of each source's three rays cross the wall; the third clears its end.
    check(!!foreground.length===(z<11),'Unexpected occlusion at '+eye+' to '+z);
    if(foreground.length)check(through[0].object===actualWall[0] &&
      Math.abs(through[0].point.x+2.29)<.0001,'Wrong new foreground');
    const hits=through.filter(h=>h.object!==actualWall[0]);"""
    c="const first=cast(eye,direction)[0];check(first?.object===hits[0].object"
    e="""const visibleHits=cast(eye,direction);
      if(foreground.length)check(visibleHits[0].object===actualWall[0],'Hidden new foreground');
      const first=visibleHits.find(h=>h.object!==actualWall[0]);check(first?.object===hits[0].object"""
    assert CHECK.count(a)==CHECK.count(c)==1
    js=CHECK.replace(a,b).replace(c,e)
    source=site.read_text("utf-8")
    assert '"garageWall":' in source
    with TemporaryDirectory() as temp:
        root=Path(temp);page=root/"check.html"
        page.write_text(source.replace("</body>",js+"</body>"),"utf-8")
        res=subprocess.run([browser,"--headless=new","--no-first-run","--disable-background-networking",
            "--use-angle=swiftshader","--enable-unsafe-swiftshader",f"--user-data-dir={root/'profile'}",
            "--dump-dom",page.as_uri()],capture_output=True,timeout=180)
    m=re.search(rb'<body[^>]*data-check="([^"]+)"',res.stdout)
    message=unescape(m[1].decode()) if m else "No browser result"
    if res.returncode or message!="passed":raise ValueError(message)
    print(message)


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("browser");p.add_argument("html",type=Path)
    a=p.parse_args();run(a.browser,a.html)
