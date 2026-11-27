"""Optional real-browser check: python tests/browser_check.py <Chrome/Edge executable> <export.html>."""
from html import unescape
from pathlib import Path
import re
import subprocess
import sys
from tempfile import TemporaryDirectory

CHECK = r"""
<script>
try {
  const $=id=>document.getElementById(id), check=(ok,msg)=>{if(!ok)throw Error(msg)};
  check($('error').hidden && $('viewport').querySelector('canvas'),'Viewer did not initialize');
  const support=WalkSpace.prototype.support;
  let space;
  WalkSpace.prototype.support=function(...args){space??=this;return support.apply(this,args);};
  $('level').value='0';$('level').onchange();$('walk').click();
  check($('walk').getAttribute('aria-pressed')==='true' && $('level').disabled,'Walk controls');
  check(space,'No navigation geometry');
  const pos=new THREE.Vector3(1.72,space.grade,-3.4);
  $('viewport').dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));check(space.flight,'Space did not start jump');
  $('start').onchange();$('jump').click();check(space.flight,'Touch jump did not start jump');$('start').onchange();
  function walkProfile(dx,dz,n){
    const heights=[pos.y];
    for(let i=0;i<n;i++){space.move(pos,dx/n,dz/n);if(Math.abs(pos.y-heights.at(-1))>.005)heights.push(pos.y);}
    return heights.map(h=>Math.round(h*100)).join(',');
  }
  function go(x,z,height,leg) {
    space.move(pos,x-pos.x,z-pos.z);
    check(Math.hypot(x-pos.x,z-pos.z)<.08 && Math.abs(pos.y-height)<.09,
      leg+' stopped at '+pos.toArray().join(',')+' target '+[x,height,z]);
  }
  check(walkProfile(0,5.3,120)==='-45,-30,-15,0','Entrance does not have three 15 cm rises');
  go(1.72,1.9,0,'Outside to porch');
  space.move(pos,0,1.2);check(pos.z<2.86,'Closed entrance did not block walker');
  const group=space.solids[0].group.parent;
  const meshes=group.children.flatMap(g=>g.children);
  const gate=meshes.find(m=>m.parent.userData.site && m.userData.toggle);
  if(gate){
    const {size:[w,h,d]}=gate.userData.part, closed=gate.position.clone(), hingeX=closed.x-w/2;
    const walker=(x,z,y=space.grade)=>new THREE.Vector3(hingeX+x,y,closed.z+z);
    function probe(label,feet,allowed){
      const before=!!gate.userData.open, center=gate.position.clone(),yaw=gate.rotation.y,at=feet.clone();
      check(gate.userData.toggle(feet)===allowed && !!gate.userData.open===(allowed?!before:before) &&
        feet.equals(at) && (allowed || (gate.position.equals(center) && gate.rotation.y===yaw)),label);
    }
    // Both endpoints are free here. Test the actual 45-degree witness in either direction.
    for(let i=0;i<2;i++){
      probe('SITE-02: mid-sweep',walker(w/2,w/2),false);
      probe('SITE-02: clear street stance',walker(w/2,-1),true);
    }
    const angle=.407, tangent=Math.hypot(w,d/2)+.18;
    const tip=r=>walker(r*Math.cos(angle),r*Math.sin(angle));
    probe('SITE-02: outer corner grazes walker between endpoints',tip(tangent-.0001),false);
    probe('SITE-02: clear beyond finite tip',tip(tangent+.0001),true);
    probe('SITE-02: outside sector behind hinge',walker(-.4,-.4),true);
    probe('SITE-02: hinge corner',walker(-.16,-.09),false);
    probe('SITE-02: clear above leaf',walker(w/2,w/2,closed.y+h/2+.001),true);

    // House's two levers and their common spindle must form a solid chain to actual timber,
    // not just touch the rectangular collider (which includes air between battens).
    for(let i=0;i<2;i++){
      gate.updateMatrixWorld(true);
      const hardware=gate.children.map(m=>{
        m.geometry.computeBoundingBox();
        return {mesh:m,box:m.geometry.boundingBox.clone().applyMatrix4(m.matrix)};
      }).sort((a,b)=>a.mesh.position.z-b.mesh.position.z);
      check(hardware.length===3,'SITE-01: missing lever or through spindle');
      const [front,shaft,back]=hardware;
      for(const grip of [front,back]){
        const joined=shaft.box.clone().intersect(grip.box).getSize(new THREE.Vector3());
        check(Math.min(joined.x,joined.y,joined.z)>.001,'SITE-01: grip has no solid joint to spindle');
      }
      for(const x of [shaft.box.min.x+.001,shaft.box.max.x-.001])
        for(const y of [shaft.box.min.y+.001,shaft.box.max.y-.001])for(const side of [-1,1]){
          const eye=gate.localToWorld(new THREE.Vector3(x,y,side*.3));
          const dir=new THREE.Vector3(0,0,-side).transformDirection(gate.matrixWorld);
          const face=new THREE.Raycaster(eye,dir).intersectObject(gate,false)[0];
          check(face && shaft.box.containsPoint(gate.worldToLocal(face.point.clone())),
            'SITE-01: spindle misses timber on a latch face');
        }
      probe('SITE-02: clear garden stance',walker(w/2,2),true);
    }
    const latch=gate.children.reduce((a,b)=>a.position.z<b.position.z?a:b);
    const lip=latch.position.z-latch.geometry.parameters.depth/2;
    const nearGrip=y=>walker(w/2+latch.position.x,lip-.17,y);
    probe('SITE-02: moving grip projects beyond the leaf collider',nearGrip(space.grade),false);
    probe('SITE-02: stance above grip clears the timber',nearGrip(closed.y+latch.position.y+.1),true);
  }
  const items=group.children.filter(g=>g.userData.furniture);
  if(items.length){
    check($('furniture-switch').checkVisibility() && $('items').checked && !$('items').disabled &&
      items.every(g=>g.visible),'Equipped export must start with furniture on');
    const probes=items.filter(g=>g.userData.level===0).flatMap(g=>g.children.map(m=>m.position));
    const blocked=probes.filter(p=>!space.tryMove(new THREE.Vector3(p.x,0,p.z),p.x,p.z));
    $('items').click();
    check(items.every(g=>!g.visible) && blocked.some(p=>space.tryMove(new THREE.Vector3(p.x,0,p.z),p.x,p.z)),
      'Hiding furniture must remove both meshes and furniture collisions');
    $('items').click();check(items.every(g=>g.visible),'Furniture did not return before walking');
    $('inventory-button').click();
    check($('drawer').open && $('inventory').checkVisibility() &&
      $('inventory-list').querySelectorAll('li').length===items.length,'Incomplete furniture inventory');
    $('drawer').close();
  }
  const door=meshes.find(m=>m.userData.toggle && Math.abs(m.position.z-2.98)<.01);
  const root=door.position.clone();
  check(door.userData.toggle(pos) && door.visible && Math.abs(root.x-door.position.x)>.4,'Leaf did not pivot');
  pos.z=2.1;go(1.72,3.4,0,'Open front door');
  if(JSON.parse($('scene-data').textContent).architect?.repairs?.includes('D01')){
    const parked=door.position.clone();
    check(!door.userData.toggle(pos)&&door.userData.open&&door.position.equals(parked),
          'Front door closed through occupant inside its swing');
    go(1.72,4.52,0,'Step clear of the front door swing');
  }
  check(door.userData.toggle(pos)&&door.position.distanceTo(root)<.001,'Failed to close door');
  go(1.72,6.30,0,'Entry hall');
  const garage=meshes.find(m=>m.userData.toggle && Math.abs(m.position.x-.2)<.01 && Math.abs(m.position.z-6.3)<.03);
  check(garage.userData.toggle(pos),'Garage connecting door failed to open');
  check(walkProfile(-2.52,0,90)==='0,-15,-30' && Math.abs(pos.x+.8)<.01,'Could not descend both garage steps');
  check(walkProfile(2.52,0,90)==='-30,-15,0' && Math.abs(pos.x-1.72)<.01,'Could not return from garage without jumping');
  go(5.42,6.48,0,'Hall crossway');go(5.42,7.45,0,'Stair approach');
  go(8.80,7.45,1.4921,'Lower flight');go(8.80,6.42,1.4921,'Turn landing');
  go(5.35,6.42,3.15,'Upper flight to mansard');
  go(8.80,6.42,1.4921,'Descend upper flight');go(8.80,7.45,1.4921,'Return landing');
  go(5.42,7.45,0,'Descend lower flight');
  pos.set(8.8,0,1);space.move(pos,2.5,0);check(pos.x<9.6,'Walked through exterior wall');
  $('start').value='3';$('start').onchange();group.updateMatrixWorld(true);
  for(const pane of meshes.filter(m=>m.userData.slot==='skylight')){
    const center=new THREE.Box3().setFromObject(pane).getCenter(new THREE.Vector3());
    const ray=new THREE.Raycaster(new THREE.Vector3(center.x,4.78,center.z),new THREE.Vector3(0,1,0));
    check(ray.intersectObjects(meshes,true)[0]?.object===pane,'Roof or ceiling blocks daylight through a rooflight');
    check(pane.material.transparent && !pane.castShadow,'Roof glass blocks sunlight');
  }
  const head=new THREE.Raycaster(new THREE.Vector3(5.5,4.8,.401),new THREE.Vector3(0,1,0))
    .intersectObjects(meshes,true)[0];
  check(head?.object.userData.slot==='ceiling' && Math.abs(head.point.y-5.45)<.005,
        'Master dormer lining must meet the inside window head at 2.30 m above floor');
  const shell=meshes.filter(m=>m.parent.userData.level===1);
  const hitAt=(origin,dir)=>new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...dir))
    .intersectObjects(meshes,false)[0];
  for(const [x,z] of [[6.0,9.3],[10.7,10.3],[8.65,13.55],[7.2,8.19],[8,5.5]]){
    const hit=hitAt([x,2.35,z],[0,1,0]);
    check(hit && Math.abs(hit.point.y-2.705)<.002,'Incomplete finished ceiling at '+[x,z]);
  }
  for(const z of [6.00,6.5,7.7]){
    const hit=hitAt([9.44,3.8,z],[1,0,0]);
    check(hit && hit.distance<.42,'Gap at outer wall of stair void');
    const h=hitAt([9.55,3.2,z],[0,-1,0]);
    check(h && Math.abs(h.point.y-1.49211)<.002,'Deck strip or missing turning landing at stair window');
  }
  check(hitAt([9.43,4.0,6.53],[1,0,0]).object.userData.slot==='glass','Stair window blocked');
  check(hitAt([9.43,4.50,6.53],[1,0,0]).object.userData.slot==='render','Stair window head misplaced');
  for(const [axis,plane,sign,t] of [[0,4.165,-1,1],[0,6.735,1,1],[0,3.385,-1,12.2],[0,5.955,1,12.2],
                                    [2,3.315,-1,9],[2,5.905,1,9],[2,7.945,-1,9],[2,10.535,1,9]]){
    const low=4.47+2*(8.14-4.47)/6-.48,dir=axis===0?[sign,0,0]:[0,0,sign];
    const origin=axis===0?[plane-sign*.012,low+.008,t]:[t,low+.008,plane-sign*.012];
    const hit=new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...dir))
      .intersectObjects(shell.filter(m=>m.parent.userData.roof),false)[0];
    check(hit?.object.userData.slot==='ceiling' && hit.distance<.014,
          `Cladding visible at dormer cheek ${plane}: ${hit?.object.userData.slot} at ${hit?.distance}`);
  }
  // A hop clears a 30 cm curb, but never a closed wall, low ceiling or storey drop.
  const v=new THREE.Vector3(0,0,0), hop=new WalkSpace([],0,new THREE.Box3(v.clone(),new THREE.Vector3(10,8,10)));
  hop.floors.push({top:.3,bottom:0,walkable:true,contains:(x,z)=>x>1&&z<.5});
  hop.move(v,1.4,0);check(v.x<=1,'Stepped onto a high curb without jumping');
  check(hop.jump(v)&&!hop.jump(v),'Double jump allowed');let apex=0;
  for(let i=0;i<80;i++){hop.advanceJump(v,.01);hop.move(v,.014,0);apex=Math.max(apex,v.y);}
  check(apex>.34&&apex<.37&&v.x>1.3&&Math.abs(v.y-.3)<.001&&!hop.flight,'Hop did not clear curb and land');
  v.set(0,0,0);hop.ceilings.push(()=>1.80);hop.jump(v);let lowApex=0;
  for(let i=0;i<60;i++){hop.advanceJump(v,.01);lowApex=Math.max(lowApex,v.y);}
  check(lowApex<.081 && v.y===0,'Head passed through ceiling during jump');
  const topRay=new THREE.Raycaster();
  const leaks=[];
  for(const [xs,zs] of [
    [[4.035,4.09,4.12,4.165],[.34,.44,.65,.85,1.05,1.3,1.6,2.1,2.7]],
    [[.251,.26,.28,.32,.40,.6],[3.05,5.51,5.57,7.08,9.2]],
    [[5.74,5.84,9.72],[8.07,12.6,12.95]]
  ])for(const x of xs)for(const z of zs){
    topRay.set(new THREE.Vector3(x,12,z),new THREE.Vector3(0,-1,0));
    const hits=topRay.intersectObjects(shell,false),roof=hits.find(h=>h.object.userData.slot==='roof');
    if(roof && hits[0].point.y>roof.point.y+.001)leaks.push(`${x},${z}: ${hits[0].object.parent.userData.name}`);
  }
  check(!leaks.length,'Meshes protrude through roof: '+JSON.stringify(leaks.slice(0,4))+' total '+leaks.length);
  const seamRay=new THREE.Raycaster(new THREE.Vector3(3.8,5.42,.46),new THREE.Vector3(1,0,0));
  const seamHits=seamRay.intersectObjects(shell,false);
  const metal=seamHits.find(h=>h.object.userData.slot==='roof'), wall=seamHits.find(h=>h.object.userData.slot==='partition');
  check(metal && wall && wall.distance-metal.distance>.045,'Interior partition coincides with dormer cladding');
  const visibleFinish=hit=>{
    const m=hit.object.material;
    return Array.isArray(m)?m[hit.face.materialIndex]:m;
  };
  const facadeAt=y=>visibleFinish(new THREE.Raycaster(new THREE.Vector3(7.5,y,-3),new THREE.Vector3(0,0,1))
      .intersectObjects(meshes,true)[0]);
  check(facadeAt(3.085)===facadeAt(3.5),'Deck edge uses a different finish from the facade');
  const deck=meshes.find(m=>m.userData.part.slab && m.parent.userData.level===1);
  const deckAt=(y,dy)=>visibleFinish(new THREE.Raycaster(new THREE.Vector3(7.5,y,3),new THREE.Vector3(0,dy,0))
    .intersectObject(deck)[0]);
  check(deckAt(5,-1)!==facadeAt(3.085) && deckAt(1,1)!==deckAt(5,-1),'Floor finish leaked to edge or underside');
  const cast=(eye,dir,objects=meshes)=>new THREE.Raycaster(new THREE.Vector3(...eye),new THREE.Vector3(...dir).normalize())
    .intersectObjects(objects,false);
  const lined=meshes.filter(m=>m.parent.userData.name==='Annex · painted inner pitches and west gable');
  const outerEnvelope=meshes.filter(m=>!lined.includes(m));
  function witness(eye,target,fov,x=432,y=256,objects=meshes){
    const camera=new THREE.PerspectiveCamera(fov,864/512,.05,100);
    camera.position.fromArray(eye);camera.lookAt(...target);camera.updateMatrixWorld(true);
    const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x/432-1,1-y/256),camera);
    return ray.intersectObjects(objects,false)[0];
  }
  for(const [eye,target,fov,pixels] of [
    [[-4.1,1.32,8.5],[-5.8,3.35,9.52],66,[[600,189.5],[780,152],[780,152.5]]],
    [[-5.03,1.32,6.65],[-6,2.9974239934264584,6.75],60,[[432,256]]],
    [[-4.8,1.32,6.08],[-6,2.788410024650781,6.14],40,[[432,255.5],[432,256],[432,256.5]]],
    [[-4.63,1.32,7.28],[-6,2.9974239934264584,6.75],55,[[432,256]]]
  ])for(const [x,y] of pixels){
    const hit=witness(eye,target,fov,x,y,outerEnvelope);
    check(hit?.object.userData.slot==='timber' && Math.abs(hit.point.x+6)<.001,
      'R2-01: workshop sky ray escaped at '+[x,y]);
    if(lined.length){
      const inside=witness(eye,target,fov,x,y);
      check(lined.includes(inside?.object)&&inside.distance<hit.distance,'ANN-01: missing interior lining before cladding');
    }
  }
  for(const z of [5.1,6.75,9.4,11.3,12.55]){
    const roof=hitAt([-5.99,5,z],[0,-1,0]);
    check(roof?.object.userData.slot==='roof' && hitAt([-5.75,roof.point.y-.001,z],[-1,0,0])?.object.userData.slot==='timber',
      'R2-01: gable does not meet the roof pitch at '+z);
  }
  for(const [eye,target,fov,x,y,plane] of [
    [[4.99,4.77,6.45],[4.818041754461276,4.630826899039934,7.4252236716571245],73,258,110,5.725],
    [[4.58,4.77,9.375],[5.8,5.37,9.375],66,432,256,5.725],
    [[7.48,4.77,9.375],[5.8,5.37,9.375],61,432,256,5.875]
  ]){
    const hit=witness(eye,target,fov,x,y);
    check(hit?.object.userData.slot==='partition' && Math.abs(hit.point.x-plane)<.001,
      'R2-02: open sightline above bedroom door from '+eye);
  }
  const bedroomWalker=new THREE.Vector3(4.87,3.15,9.375);
  const bedroomLeaf=hitAt([4.87,4.77,9.375],[1,0,0])?.object;
  space.move(bedroomWalker,1.58,0);
  check(bedroomWalker.x<5.8 && bedroomLeaf?.userData.toggle?.(bedroomWalker),'R2-02: closed leaf not operable');
  space.move(bedroomWalker,6.45-bedroomWalker.x,0);check(Math.abs(bedroomWalker.x-6.45)<.01,'R2-02: blocked clear opening');
  const frame=hitAt([5.8,4.77,9.375],[0,1,0]);
  check(frame?.object.userData.slot==='frame' && Math.abs(frame.point.y-(3.15+2.10-.04))<.001,'R2-02: reduced clear height');
  space.move(bedroomWalker,-1.58,0);
  check(Math.abs(bedroomWalker.x-4.87)<.01 && bedroomLeaf.userData.toggle(bedroomWalker),'R2-02: could not return and close leaf');
  for(const eye of [[-4.1,1.32,8.5],[-3.85,1.32,8.7]])for(const [y,z] of [[3.37144,9.52],[3.25853,10.2204],[3.46348,11.75246]]){
    const direction=[-eye[0],y-eye[1],z-eye[2]],hits=cast(eye,direction,outerEnvelope);
    check(hits[0]?.object.userData.slot==='render' && Math.abs(hits[0].point.x+.22)<.001 &&
      !hits.slice(1).some(h=>h.object!==hits[0].object && h.distance-hits[0].distance<.015),'R1-01: shared gable finish');
    if(lined.length){
      const first=cast(eye,direction)[0];check(first?.object===hits[0].object||
        lined.includes(first?.object),'ANN-01: inner lining to shared gable junction');
    }
  }
  for(const [axis,wall,end,along] of [[0,4.1,-1,.18],[0,6.8,1,.18],[0,3.32,-1,13],[0,6.02,1,13],
                                       [2,3.25,-1,9.92],[2,5.97,1,9.92],[2,7.88,-1,9.92],[2,10.6,1,9.92]]){
    const a=wall+end*.18, hits=cast(axis===0?[a,5.52,along]:[along,5.52,a],axis===0?[-end,0,0]:[0,0,-end]);
    const render=hits.find(h=>h.object.userData.slot==='render');
    check(hits[0]?.object.userData.slot==='roof' && render && render.distance-hits[0].distance>.02,
      'R1-02: dormer metal does not conceal its jamb at '+wall);
  }
  for(const [z,d] of [[-.08,1],[14.28,-1]]){
    const edge=y=>visibleFinish(hitAt([6.62,y,z],[0,0,d]));
    check(edge(-.01)===edge(-.10) && edge(-.01)!==visibleFinish(hitAt([6.62,.12,2],[0,-1,0])),
      'R1-03: floorboards visible on ground-floor plinth');
  }
  const car=meshes.filter(m=>m.parent.userData.name==='Detached two-car carport');
  const canopy=meshes.filter(m=>m.parent.userData.name==='Carport roof and photovoltaic array');
  for(const z of [-5.82,.12]){
    for(const [x,dir] of [[-20,1],[-9,-1]]){
      check(cast([x,2.42,z],[dir,0,0],car)[0]?.object.userData.slot==='timber','R1-04: open band at beam end');
    }
    for(const dz of [-.08,.08]){
      const plate=cast([-15,4,z+dz],[0,-1,0],car)[0], soffit=cast([-15,2,z+dz],[0,1,0],canopy)[0];
      check(plate && soffit && Math.abs(plate.point.y-soffit.point.y)<.001,'R1-04: no pitched bearing');
    }
  }
  for(const [x,dir] of [[-20,1],[-9,-1]]){
    const across=z=>cast([x,3.2,z],[dir,0,0],canopy)[0];
    check(across(-2.866)?.object.userData.slot==='timber' && !across(-2.81),
      'R1-04: carport gable is missing its open timber screen');
  }
  const storeAt=(eye,dir)=>cast(eye,dir,car)[0]?.object;
  for(const [eye,dir] of [[[-16,.8,-.4],[-1,0,0]],[[-19,.8,.8],[0,0,-1]],
                           [[-20,.8,-1.5],[1,0,0]],[[-18,.8,-3.3],[0,0,1]]]){
    check(storeAt(eye,dir)?.userData.slot==='render','R1-05: missing store perimeter face');
  }
  check(storeAt([-16,.8,-1.35],[-1,0,0])?.userData.slot==='glass' &&
    storeAt([-18,.8,-1.4],[0,0,1])?.userData.slot==='partition','R1-05: missing sidelight or store divider');
  for(const [eye,dir,axis,sign] of [[[-16,.8,-2.05],[-1,0,0],'x',-1],[[-17.95,.8,.8],[0,0,-1],'z',1]]){
    const leaf=storeAt(eye,dir), was=leaf?.position[axis];
    check(leaf?.userData.toggle?.() && (leaf.position[axis]-was)*sign>.32 &&
      leaf.userData.toggle() && Math.abs(leaf.position[axis]-was)<.001,'R1-05: store door or drawn handing missing');
  }
  $('walk').click();check($('level').value==='0'&&!$('level').disabled,'Lost previous cutaway');
  $('brief').click();check($('drawer').open && !$('preferences').hidden,'Brief did not open');
  $('retailer').value='Test retailer';$('preferences').querySelector('[type=checkbox]').checked=true;
  $('preferences').requestSubmit();check(!$('handoff').hidden && $('request-text').value.includes('Test retailer'),'No actionable handoff');
  $('drawer').close();$('brief').click();
  if(items.length)check(!$('handoff').hidden && $('furniture-switch').checkVisibility() && $('items').checked,
    'Request state lost or equipped layer hidden');
  else check(!$('handoff').hidden && !$('furniture-switch').checkVisibility(),'Request state lost or empty layer offered');
  document.body.dataset.check='passed';
} catch(e){document.body.dataset.check='FAILED: '+e.message;}
</script>
"""

if __name__=="__main__":
    with TemporaryDirectory() as temp:
        root=Path(temp)
        site=root/"check.html"
        site.write_text(Path(sys.argv[2]).read_text(encoding="utf8").replace("</body>",CHECK+"</body>"),encoding="utf8")
        proc=subprocess.run([sys.argv[1],"--headless=new","--no-first-run","--disable-background-networking",
                             "--use-angle=swiftshader","--enable-unsafe-swiftshader",
                             f"--user-data-dir={root/'profile'}","--dump-dom",site.as_uri()],
                            stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=90)
        match=re.search(rb'<body[^>]*data-check="([^"]+)"',proc.stdout)
        result=unescape(match[1].decode()) if match else "Missing browser result: "+proc.stderr[-500:].decode(errors="replace")
        print(result)
        sys.exit(0 if proc.returncode==0 and result=="passed" else 1)
