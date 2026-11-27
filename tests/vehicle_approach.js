// Swept metric study on a COPY of geometry from the exact live candidate.
// No renderer/collider pose changes for either parked vehicle or review walk.
const {groups:G,roofObjs}=vehicleStudy,fit=VFit,group=s=>model.children.find(g=>g.userData.name.startsWith(s));
const tr=fit.triangles,tree=fit.tree,dist=fit.nearest,corner=(x,y,z)=>new T.Vector3(x,y,z);
function tri(a,b,c,object){
  const v=[a,b,c],t=new T.Triangle(...v);
  return {t,v,b:new T.Box3().setFromPoints(v),object};
}
function sweep(list,dx,dz){
  const all=[],d=corner(dx,0,dz);
  for(const p of list){
    const q=p.v.map(v=>v.clone().add(d));all.push(p,tri(...q,p.object));
    for(let i=0;i<3;i++){const j=(i+1)%3;all.push(tri(p.v[i],p.v[j],q[j],p.object),tri(p.v[i],q[j],q[i],p.object));}
  }
  return all.filter(p=>p.t.getArea()>1e-11);
}
// Extract the exterior of the *union* of the actual paved polygons. Internal
// seams aren't apparent kerbs. Include collinear overlaps when splitting edges.
const rings=[...group('Site paving and terrace').children.slice(0,2),group('Street-side apron').children[0],
             group('Drive and turning apron').children[0]].map(m=>m.userData.part.slab[0]);
const edges=rings.flatMap(r=>r.map((a,i)=>[a,r[(i+1)%r.length]]));
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const curtains=[],inside=(x,z)=>rings.some(r=>space.inRing(x,z,r));
for(const [a,b] of edges){
  const d=sub(b,a),l=Math.hypot(...d),ts=[0,1];
  for(const [c,e] of edges){
    const v=sub(e,c),u=sub(c,a),det=cross(d,v);
    if(Math.abs(det)>1e-9){
      const s=cross(u,d)/det;if(s>=-1e-8&&s<=1+1e-8)ts.push(cross(u,v)/det);
    }else if(Math.abs(cross(d,u))<1e-7){
      for(const p of [c,e]){const q=sub(p,a);ts.push((q[0]*d[0]+q[1]*d[1])/(l*l));}
    }
  }
  ts.sort((a,b)=>a-b);
  for(let i=1;i<ts.length;i++){
    const s=Math.max(0,ts[i-1]),t=Math.min(1,ts[i]);if(t-s<1e-7)continue;
    const x=a[0]+d[0]*(s+t)/2,z=a[1]+d[1]*(s+t)/2,nx=-d[1]*1e-5/l,nz=d[0]*1e-5/l;
    if(inside(x+nx,z+nz)===inside(x-nx,z-nz))continue;
    const [p,q]=[s,t].map(t=>corner(a[0]+t*d[0],-2,a[1]+t*d[1]));
    const P=p.clone(),Q=q.clone();P.y=Q.y=6;
    curtains.push(tri(p,q,Q,null),tri(p,Q,P,null));
  }
}
const road=tree(curtains), store=group('Detached two-car'),gate=group('Vehicle gate').children[0];
$('start').value=starts.findIndex(s=>s.name.startsWith('Street'));$('walk').click();
space.move(feet,-5.55-feet.x,0);space.move(feet,0,-10.65-feet.z);update();
const to=gate.position.clone().sub(camera.position);heading=Math.atan2(to.x,to.z);tilt=Math.atan2(to.y,Math.hypot(to.x,to.z));update();
host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));check(gate.userData.open,'Open drive mouth required');
const roof=tr(roofObjs);
const scenery=model.children.filter(g=>g.userData.name.match(/^(Detached two-car|Carport |Timber frontage|Pedestrian gate|Vehicle gate|Parcel ·)/))
  .flatMap(g=>g.children.filter(m=>!(g.userData.name.startsWith('Vehicle gate · flush')&&m.userData.part.walkable)&&
    !(g.userData.name.startsWith('Vehicle gate · flush')&&m.userData.part.size[1]<.01))
    .flatMap(m=>[m,...m.children]));
const getName=o=>o?.parent?.userData?.name||o?.userData?.part?.component||o?.userData?.name||'boundary';
function poseAt(x,z,yaw){
  return new T.Matrix4().makeRotationY(yaw).setPosition(x,space.grade,z);
}
function changed(list,mat){
  return list.map(p=>tri(...p.v.map(v=>v.clone().applyMatrix4(mat)),p.object));
}
// Infimum of a metric over rigid rotation, with certified error. At mid-angle,
// every point lies within 2R*sin(delta/2) of all intermediate poses. A positive
// lower bound against the pavement boundary plus initial containment ensures
// the ENTIRE envelope remains paved, not just four wheel patches.
function bounded(sample,maxRadius,angle,initial,tolerance=.004){
  let best=initial.m,hit=initial.hit,witness='straight',calls=0,lower=initial.m;
  function go(a,b,depth){
    const mid=(a+b)/2,got=sample(mid);calls++;
    if(got.m<best){best=got.m;hit=got.hit;witness=mid;}
    const bound=got.m-2*maxRadius*Math.sin((b-a)/4);
    if(bound>=best-tolerance){lower=Math.min(lower,bound);return;}
    if(depth>15)throw Error('Unresolved curved sweep');
    go(a,mid,depth+1);go(mid,b,depth+1);
  }
  go(0,angle,0);return {lower:Math.max(0,lower),upper:best,witness,limiter:getName(hit),evaluations:calls};
}
for(const key of ['trailer','car']){
  const g=G[key],other=G[key==='trailer'?'car':'trailer'];
  const local=changed(tr(g.children),g.matrixWorld.clone().invert()),localTree=tree(local.slice());
  const obstacleFaces=tr(scenery.concat(other.children)),obstacles=tree(obstacleFaces.slice());
  const [endX,,bay]=data.vehicles.carport[key], radius=4.5,entry=-5.7,first=-10.15;
  const turn=a=>poseAt(entry-radius*(1-Math.cos(a)),bay-radius+radius*Math.sin(a),Math.PI-a);
  const m0=poseAt(entry,first,Math.PI),firstShape=changed(local,m0);
  check(firstShape.every(p=>p.v.every(v=>inside(v.x,v.z))),'Body not inside paved start');
  const t1=sweep(firstShape,0,bay-radius-first),
    t2=sweep(changed(local,turn(Math.PI/2)),endX-entry+radius,0);
  const linear=tree(t1.concat(t2)),tmin=dist(linear,obstacles),pmin=dist(linear,road);
  const maxR=Math.max(...local.flatMap(p=>p.v.map(v=>Math.hypot(radius-v.x,v.z))));
  const pathTol=.0005;
  // Features entirely above the currently witnessed interval cannot improve it.
  const zmax=localTree.b.max.y+space.grade,low=tree(obstacleFaces.filter(p=>p.b.min.y-zmax<tmin.m-1e-8));
  const clear=bounded(a=>dist(fit.transformed(localTree,turn(a)),low),maxR,Math.PI/2,tmin,pathTol);
  const kerb=bounded(a=>dist(fit.transformed(localTree,turn(a)),road),maxR,Math.PI/2,pmin,pathTol);
  const straightHead=fit.vertical(t2,roof);
  // Lower bound the entire curved portion with short, inflated occupied boxes;
  // report separately, not as exact headroom unless the straight witness wins.
  let turnHead=Infinity;
  for(let i=0;i<120;i++){
    const a=(i+.5)*Math.PI/240,mat=turn(a),delta=2*maxR*Math.sin(Math.PI/960);
    function top(n){
      const {min:p,max:q}=n.b,y=q.y,v=[[p.x-delta,p.z-delta],[q.x+delta,p.z-delta],[q.x+delta,q.z+delta],[p.x-delta,q.z+delta]]
        .map(([x,z])=>corner(x,y,z).applyMatrix4(mat));
      const h=fit.vertical([tri(v[0],v[1],v[2]),tri(v[0],v[2],v[3])],roof).m;
      return h<straightHead.m-1e-6&&n.left?Math.min(top(n.left),top(n.right)):h;
    }
    turnHead=Math.min(turnHead,top(localTree));
  }
  const out=report.measurements[key]={start:[entry,first],turnRadius:radius,end:[endX,bay],wholeBody3d:clear,
    pavementUnion:kerb,straightEntryUp:straightHead.m,straightEntryAt:straightHead.at,turnUpLower:turnHead,
    limitingEntryMesh:getName(straightHead.hit),otherAlreadyParked:other.userData.name};
  check(clear.lower>0&&kerb.lower>0&&turnHead>0&&straightHead.m>0,'Approach conflict: '+JSON.stringify(out));
}
// Both entire store leaf swings incl attached handles. Quarter-turn lower bound
// in each direction against both parked vehicles, not just jamb clear width.
const veh=tree(tr([...G.car.children,...G.trailer.children]));
report.measurements.storeSwings=store.children.filter(m=>m.userData.part.door).map(leaf=>{
  const ts=tr([leaf,...leaf.children]),t=tree(ts),w=leaf.userData.part.size[0];
  const hinge=leaf.localToWorld(corner(-w/2,0,0)),r=Math.max(...ts.flatMap(p=>p.v.map(v=>Math.hypot(v.x-hinge.x,v.z-hinge.z))));
  const A=new T.Matrix4().makeTranslation(hinge.x,0,hinge.z),B=new T.Matrix4().makeTranslation(-hinge.x,0,-hinge.z);
  const sweep=bounded(a=>dist(fit.transformed(t,A.clone().multiply(new T.Matrix4().makeRotationY(-a)).multiply(B)),veh),
    r,Math.PI/2,dist(t,veh),.002);check(sweep.lower>.1,'Store swing blocked');return sweep;
});
// Restrict to the parking floors (not the raised stores or space occupied by
// posts); evaluate ALL slopes, beams and gable members above these rectangles.
const b=o=>new T.Box3().setFromObject(o,true),post=b(store.children[0]),last=b(store.children[4]),
  floor=b(group('Site paving and terrace').children[0]),stor=b(store.children[21]);
for(const [label,x0,z0,z1] of [['long',floor.min.x,post.max.z,stor.min.z],['short',stor.max.x,stor.min.z,last.min.z]]){
  const x1=floor.max.x,y=floor.max.y,v=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(([x,z])=>corner(x,y,z));
  const h=fit.vertical([tri(v[0],v[1],v[2]),tri(v[0],v[2],v[3])],roof);
  report.measurements[label+'Zone']={clearWidth:z1-z0,slabLength:x1-x0,wholeZoneMinHeight:h.m,at:h.at};
  check(Math.abs(h.m-2.81)<.001,'Entire parking-zone height '+label);
}
