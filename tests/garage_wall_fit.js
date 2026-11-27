// Supplemental to adjustable_decks and comparison_states: sign, continuous
// first obstruction and refusals at the corrected faces (including near axes).
const V=vehicleStudy,G=V.groups,S=V.state,F=V.fit,D=report.measurements;
const wall=meshes.find(m=>m.userData.part.component==='workshop masonry');
const bounds=m=>new T.Box3().setFromObject(m,true),west=bounds(wall).min.x;
const eq=(a,b,s)=>check(Math.abs(a-b)<.00007,`${s}: ${a} vs ${b}`);
const send=(k,v)=>{const e=$('v-'+k);e.value=v;e.dispatchEvent(new Event(e.type==='range'?'input':'change'));};
const reset=()=>$('v-reset').click();
const rightEdge=ms=>Math.max(...ms.map(m=>bounds(m).max.x));
const fixed=G.lift.children.filter(m=>m.userData.part.component==='fixed side rim');
const steel=G.lift.children.filter(m=>['platform','sliding crosshead','telescopic runner'].includes(m.userData.part.component));
const bank=meshes.filter(m=>m.parent.userData.name.startsWith('BROR workbench'));
function verify(){
  const w=F().pair[S().id],mir=G.car.children.filter(m=>/mirror/i.test(m.userData.part.component));
  check(mir.length>0,'missing mirrors');
  const b=bounds(G.car),x=rightEdge(mir);
  eq(b.max.x,x,'outermost mesh is mirror');
  const extreme=mir.map(bounds).find(m=>Math.abs(m.max.x-x)<1e-6);
  check(extreme.min.z>bounds(wall).min.z&&extreme.max.z<bounds(wall).max.z,'mirror beyond wall ends');
  // The 3D nearest triangle to triangle distance is independently measured;
  // throughout this UI range the mirror overlaps the wall in Z and height.
  const t=VFit.tree(VFit.triangles(G.car.children));
  eq(west-x,w.masonry,'signed mirror clearance');
  eq(VFit.nearest(t,VFit.tree(VFit.triangles([wall]))).m,w.masonry,'actual car → fixed wall');
  eq(VFit.nearest(t,VFit.tree(VFit.triangles(bank))).m,w.bench,'actual car → workbench');
  eq(w.pitWall,west-rightEdge(fixed),'rim → wall');
  eq(w.pitBench,Math.min(...fixed.map(m=>bounds(m).min.x))-rightEdge(bank),'rim → bench');
  eq(F().lift.masonry,west-rightEdge(steel),'moving outer deck → wall');
  return {mirror:w.masonry,bench:w.bench,pitWall:w.pitWall,pitBench:w.pitBench,steel:F().lift.masonry,
    front:w.ends[0],rear:w.ends[1],limits:w.limits};
}
D.loaded=[];
// At each length take BOTH endpoints of each reachable interval, then
// request the first unavailable centimetre. Do not move the car to pass.
for(const id of ['dacia','mercedes']){
  reset();send('bay','center');send('car',id);send('location','lift');
  check(S().id===id&&S().loc==='lift','default axis, loading');
  for(const door of ['closed','open']){
    send('door',door);check(F().open===(door==='open'),'door state');
    for(const len of [1.55,1.75,1.95]){
      send('h',0);send('len',len);eq(S().len,len,'length at rest');
      const rest=verify(),limit=F().car.max;
      send('h',limit);eq(S().h,limit,'reachable top');const raised=verify();
      if(limit<1.8){
        send('h',+(limit+.01).toFixed(2));eq(S().h,limit,'did not roll back');
        check(V.lastRefusal()&&V.lastRefusal().fit.car.max===limit,'no refusal record');
      }
      D.loaded.push({id,door,len,limit,rest,raised});
      send('h',0);
    }
  }
}
D.edge=[];
for(const door of ['closed','open']){
  reset();send('bay','center');send('location','lift');send('door',door);
  send('z',7.95);send('x',-3.35);
  eq(S().z,7.95,'near back');eq(S().x,-3.35,'Dacia fits physically, not aligned to door');
  const f=verify();eq(f.mirror,.115,'Dacia at trial station');
  for(const h of [0,.4,F().car.max]){
    send('h',h);eq(S().h,h,'Dacia trial stroke');
    send('car','mercedes');check(S().id==='dacia','accepted penetrating Mercedes');
    const r=V.lastRefusal();
    check(r?.fit.car.by==='masonry'&&r.fit.car.max===null&&$('v-warning').textContent.includes('peretele fix'),'wrong refusal reason');
    eq(r.fit.car.masonry,-.04,'signed rejected mirror');
    check($('v-comparison').textContent.includes('−0,040')||$('v-comparison').textContent.includes('-0,040'),'no negative shown');
    D.edge.push({door,h,axis:[S().x,S().z],accepted:verify().mirror,mercedes:r.fit.car.masonry,reason:r.fit.car.by});
  }
  send('h',0);send('x',-3.45);send('car','mercedes');eq(verify().mirror,.06,'Mercedes corrected feasible shift');
  send('z',8.05);eq(S().z,7.95,'hobby partition must refuse');eq(V.lastRefusal().fit.car.ends[1],-.0665,'signed bumper through partition');
}
reset();
for(const len of [1.55,1.75,1.95]){
  send('len',len);send('h',1.8);eq(S().h,1.8,'unloaded full stroke');
  send('x',-3.30);eq(S().x,-3.30,'closest feasible empty axis');
  const gap=west-rightEdge(fixed);eq(gap,.048,'accepted physical rim');
  send('x',-3.25);const r=V.lastRefusal();
  eq(S().x,-3.30,'pit crossing must refuse');eq(r.fit.pair.dacia.pitWall,-.002,'negative pit clearance');
  eq(r.fit.lift.masonry,.010,'proposed deck below margin');
  D.edge.push({len,parked:S().id,h:S().h,rim:gap,refusedX:r.proposal.x,refusedRim:r.fit.pair.dacia.pitWall,deck:r.fit.lift.masonry});
  send('x',-3.90);send('h',0);
}
reset();
