// Independent observations from the actual selected meshes, not a readout-only snapshot.
const V=vehicleStudy,G=V.groups,S=V.state,F=V.fit,D=report.measurements;
const box=m=>new T.Box3().setFromObject(m,true),component=m=>m.userData.part.component;
const near=(a,b,n)=>check(Number.isFinite(a)&&Math.abs(a-b)<.000065,`${n}: ${a} vs ${b}`);
const send=(k,v)=>{const e=$('v-'+k);e.value=v;e.dispatchEvent(new Event(e.type==='range'?'input':'change'));};
const reset=()=>$('v-reset').click();
const wall=meshes.find(m=>component(m)==='workshop masonry'),west=box(wall).min.x;
const workbench=meshes.filter(m=>m.parent.userData.name.startsWith('BROR workbench'));
const ceiling=meshes.filter(m=>m.userData.part.overhead&&m.parent.userData.name.startsWith('Annex · painted'));
const panel=meshes.find(m=>m.userData.part.door?.kind==='garage');
const consoleMeshes=meshes.filter(m=>m.parent.userData.name==='RAV509IF · pupitru');
const rims=G.lift.children.filter(m=>component(m)==='fixed side rim');
const plates=G.lift.children.filter(m=>component(m)==='platform');
const right=ms=>Math.max(...ms.map(m=>box(m).max.x)),left=ms=>Math.min(...ms.map(m=>box(m).min.x));
const distance=(ts,objs)=>VFit.nearest(VFit.tree(ts.slice()),VFit.tree(VFit.triangles(objs))).m;
function witness(){
  const f=F().car,id=S().id,h=S().h,ts=VFit.triangles(G.car.children),b=box(G.car),mx=right(G.car.children.filter(m=>/mirror/i.test(component(m))));
  const mirrors=G.car.children.filter(m=>/mirror/i.test(component(m))).map(box);
  check(mirrors.every(b=>b.min.z>box(wall).min.z&&b.max.z<box(wall).max.z),'side measurement past wall end');
  near(west-mx,f.masonry,'signed lateral');near(distance(ts,[wall]),f.masonry,'actual mirror at finite wall');
  near(distance(ts,workbench),f.bench,'workbench');near(distance(ts,consoleMeshes),f.console,'to cabinet');
  near(distance(ts,[panel,...panel.children]),f.door,'to actual door + ribs');
  near(VFit.vertical(ts,VFit.triangles(ceiling)).m,f.paint,'to lining, all car triangles');
  near(f.pitWall,west-right(rims),'pit → masonry');near(f.pitBench,left(rims)-right(workbench),'pit → bench');
  near(F().lift.masonry,west-right(plates),'moving steel → masonry');
  const bumpers=b.max.z-b.min.z;near(bumpers,id==='dacia'?4.345:5.213,'bumper length');
  near(f.bumperOutside[0]+f.bumperOutside[1],bumpers-1.580,'overhangs vs length');
  return {h,masonry:f.masonry,bench:f.bench,console:f.console,front:f.ends[0],rear:f.ends[1],paint:f.paint,door:f.door,
    doorAbove:f.doorAbove,pitWall:f.pitWall,pitBench:f.pitBench,pitConsole:f.pitConsole,moving:F().lift,
    contact:f.contact,rise:f.rise,axles:f.axleOutside,tyreEnds:f.tyreEnds,bumperOutside:f.bumperOutside,
    underbody:f.bodyGap,pad:f.verticalPadGap,limits:f.limits};
}
D.loaded=[];D.edge=[];
// Negative controls on the SAME signed face query used for live bodies.
// A protruding vertex outside the finite end must not define the overlap.
const wb=box(wall);
function face(points,dy=0){
  const v=points.map(p=>new T.Vector3(...p));return V.measureWallGap([{v,b:new T.Box3().setFromPoints(v)}],dy);
}
for(const [z,sgn] of [[wb.min.z,-1],[wb.max.z,1]]){
  const p=(x,y,d)=>[west+x,y,z+sgn*d];
  check(face([p(.3,.5,.001),p(.2,.8,.001),p(.4,.7,.9)])===Infinity,'wall extended beyond return');
  near(face([p(.1,.5,.10),p(-.2,.5,-.10),p(-.2,.9,-.10)]),.05,'clip crossing triangle at end, not its out-of-bounds tip');
}
check(face([[west+.1,-1,7],[west+.2,-1,8],[west+.3,-2,8]])===Infinity,'wall extends below floor');
check(face([[west+.1,3.5,6],[west+.2,3.5,6.4],[west+.3,3.8,6.4]])===Infinity,'wall taller than slope');
for(const id of ['dacia','mercedes']){
  reset();send('bay','center');send('car',id);send('location','lift');
  check(S().id===id&&S().loc==='lift','failed to load');
  // Heading fixed in the original backed-in ramp sweep. Pitch about X does
  // not change X. The added cabinet cannot undercut the inherited jamb gap.
  const consoleBound=left(G.car.children)-right(consoleMeshes);
  check(consoleBound>Math.min(...F().car.approachSides),'cabinet must be added to original driveway sweep');
  for(const door of ['closed','open']){
    send('door',door);check(F().open===(door==='open'),'door');
    const rest=witness();send('h',.600);near(S().h,.6,'common height');const common=witness();
    const max=F().car.max;send('h',max);near(S().h,max,'maximum accepted');
    const top=witness();let refusal=null;
    if(door==='open'){
      check(max<1.825&&F().car.by==='door','should reach the open panel first');
      send('h',max+.005);near(S().h,max,'one increment too high moved scene');
      check(V.lastRefusal().fit.car.by==='door','wrong first obstruction');
      refusal={h:V.lastRefusal().proposal.h,door:V.lastRefusal().fit.car.door};
    }else{
      near(max,1.825,'nominal closed');send('door','open');check(!F().open,'unprotected door sweep');
    }
    D.loaded.push({id,door,rest,common,top,refusal,consoleBound});send('h',0);
  }
}
for(const door of ['closed','open']){
  reset();send('bay','center');send('location','lift');send('door',door);send('z',7.95);send('x',-3.35);
  near(S().x,-3.35,'near-wall Dacia');near(S().z,7.95,'near-wall Z');
  for(const h of [0,.4,F().car.max]){
    send('h',h);near(S().h,h,'trial stroke');send('car','mercedes');
    const r=V.lastRefusal();check(S().id==='dacia'&&r?.proposal.id==='mercedes'&&r?.fit.car.max===null&&r.fit.car.by==='masonry','missing mirror refusal');
    near(r.fit.car.masonry,-.04,'signed rejected Mercedes mirror');near(F().car.masonry,.115,'accepted Dacia mirror');
    D.edge.push({door,h,axis:[S().x,S().z],accepted:witness(),trial:r.fit.car});
  }
  send('h',0);send('x',-3.45);send('car','mercedes');near(witness().masonry,.06,'accepted Mercedes');
  send('z',8.05);near(S().z,7.95,'rear endpoint rollback');near(V.lastRefusal().fit.car.ends[1],-.0665,'rear penetration');
  D.edge.push({door,axis:[S().x,S().z],accepted:witness(),rearTrial:V.lastRefusal().fit.car.ends});
  send('z',7);check(V.lastRefusal()?.fit.car.ends[0]<0,'front endpoint no refusal');near(S().z,7.95,'front endpoint rollback');
  D.edge.push({door,frontTrial:V.lastRefusal().fit.car.ends});
}
reset();send('h',1.825);send('x',-3.30);
near(S().x,-3.30,'25 mm is reachable within floating precision');
near(west-right(rims),.025,'pit reserve');near(F().lift.masonry,.05,'deck reserve');
for(const x of [-3.25,-3.20,-3.15]){
  send('x',x);near(S().x,-3.30,'unloaded refused axis');const r=V.lastRefusal();near(r.proposal.h,1.825,'refusal at full height');
  near(r.fit.pair.dacia.pitWall,west-(x+.985),'finite well face');near(r.fit.lift.masonry,west-(x+.960),'finite moving steel');
  D.edge.push({x,h:r.proposal.h,pit:r.fit.pair.dacia.pitWall,steel:r.fit.lift.masonry,acceptedX:S().x});
}
reset();
