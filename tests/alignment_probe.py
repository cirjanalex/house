"""Run a trusted local supplemental mesh/image probe. Never writes review decisions."""
import argparse
import base64
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
from tempfile import TemporaryDirectory


def observe(browser,site,probe,out):
    source=site.read_bytes()
    out.mkdir(parents=True,exist_ok=True)
    if any(out.iterdir()):raise ValueError("Choose a fresh probe directory")
    hook="  } catch(e) { error(`The 3D view could not start"
    code=probe.read_text(encoding="utf-8")
    js="""window.addEventListener('load',()=>{
      const report={photos:{},measurements:{},errors:[]};
      try {
        const meshes=model.children.flatMap(g=>g.children);
        const ray=(p,d,objects=meshes)=>new T.Raycaster(new T.Vector3(...p),new T.Vector3(...d))
          .intersectObjects(objects,false);
        const check=(ok,msg)=>{if(!ok)throw Error(msg);};
        renderer.setPixelRatio(1);renderer.setSize(1000,600,false);
        function photo(name,eye,aim,fov=52,png=false){
          const c=camera.clone();c.position.fromArray(eye);c.aspect=5/3;c.near=.012;c.fov=fov;
          c.lookAt(...aim);c.updateProjectionMatrix();renderer.render(scene,c);
          report.photos[name]=renderer.domElement.toDataURL(png?'image/png':'image/jpeg',.94);
        }
    """+code+"""
      }catch(e){report.errors.push(String(e));}
      const out=document.createElement('pre');out.id='probe-result';out.textContent=JSON.stringify(report);
      document.body.replaceChildren(out);
    });"""
    assert source.decode().count(hook)==1
    with TemporaryDirectory(dir=out) as name:
        root=Path(name).resolve();page=root/"probe.html"
        page.write_text(source.decode().replace(hook,js+"\n"+hook),encoding="utf-8")
        res=subprocess.run([browser,"--headless=new","--no-first-run","--disable-background-networking",
            "--use-angle=swiftshader","--enable-unsafe-swiftshader",f"--user-data-dir={root/'profile'}",
            "--dump-dom",page.as_uri()],capture_output=True,timeout=240)
    match=re.search(rb'<pre id="probe-result">(.*?)</pre>',res.stdout,re.S)
    if not match:raise RuntimeError("Probe did not complete: "+res.stderr[-500:].decode(errors="replace"))
    report=json.loads(html.unescape(match[1].decode()))
    for label,url in report.pop("photos").items():
        assert re.fullmatch(r"[a-z0-9-]+",label)
        (out/(label+(".png" if url.startswith("data:image/png") else ".jpg"))).write_bytes(base64.b64decode(url.split(",")[1]))
    report["build_sha256"]=hashlib.sha256(source).hexdigest()
    (out/"probe.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
    assert source==site.read_bytes()
    if report["errors"]:raise ValueError(report["errors"])
    print(out/"probe.json")


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("browser");p.add_argument("site",type=Path)
    p.add_argument("probe",type=Path);p.add_argument("out",type=Path)
    args=p.parse_args();observe(args.browser,args.site,args.probe,args.out)
