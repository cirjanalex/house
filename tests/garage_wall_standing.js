// Distinguish geometric fit from a supported place to stand. Probe the real
// mirror station, with normal unmodified walk collision and the doors shut.
const V=vehicleStudy,G=V.groups,wall=meshes.find(m=>m.userData.part.component==='workshop masonry');
const box=m=>new T.Box3().setFromObject(m,true),wx=box(wall).min.x;
const send=(k,v)=>{const e=$('v-'+k);e.value=v;e.dispatchEvent(new Event(e.type==='range'?'input':'change'));};
const foot=-.30,able=(x,z)=>space.tryMove(new T.Vector3(x,foot,z),x,z);
const out=report.measurements.stances=[];
send('bay','center');send('location','lift');
for(const id of ['dacia','mercedes']){
  send('car',id);
  for(const x of [-3.90,id==='dacia'?-3.35:-3.45]){
    send('x',x);check(V.state().id===id&&V.state().x===x,'trial not loaded');
    for(const h of [0,V.fit().car.max]){
      send('h',h);check(V.state().h===h,'trial stroke');
      const mirrors=G.car.children.filter(m=>/mirror/i.test(m.userData.part.component));
      const edge=VFit.triangles(mirrors).flatMap(t=>t.v).reduce((a,p)=>p.x>a.x?p:a);
      const width=wx-edge.x,middle=(wx+edge.x)/2,z=edge.z;
      const floorHit=ray([middle,foot+.01,z],[0,-1,0],meshes.filter(m=>m.userData.part.slab))[0];
      check(floorHit&&Math.abs(floorHit.point.y-foot)<.001,'no slab under stance');
      const sidePossible=able(middle,z);
      if(!h)check(sidePossible===(width>=.34),'stance not consistent with folded-out mirror gap at rest');
      const under=ray([x,foot+.001,V.state().z],[0,1,0],G.car.children)[0];
      check(under,'no actual underside');const height=under.point.y-foot,centrePossible=able(x,V.state().z);
      if(height<WALK_BODY.head-.001)check(!centrePossible,'can stand through car');
      out.push({id,x,h,z,mirrorGap:width,midAisleStance:sidePossible,bodyDiameter:.34,
        centreUnderside:height,centreStance:centrePossible,crown:WALK_BODY.head});
    }
    send('h',0);send('x',-3.90);
  }
}
$('v-reset').click();
