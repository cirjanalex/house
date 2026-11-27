// Separate from the parking-to-lift UI (which changes *layouts*, not steering).
// A backed-in trial on the default axis, normal garage door open. Compare a
// swept enclosing prism with actual rigid poses supported at both axles.
const G=vehicleStudy.groups,L=data.vehicles.lift,F=VFit,bc=g=>new T.Box3().setFromObject(g,true);
const annex=model.children.find(g=>g.userData.name.startsWith('Attached annex'));
const door=annex.children.find(m=>m.userData.part.door?.kind==='garage');
$('walk').click();space.move(feet,L.x-feet.x,0);space.move(feet,0,3.9-feet.z);update();
const to=door.position.clone().sub(camera.position);heading=Math.atan2(to.x,to.z);tilt=Math.atan2(to.y,Math.hypot(to.x,to.z));update();
host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));check(door.userData.open,'Open garage via E');
const objects=model.children.filter(g=>g===annex||g.userData.name.match(/^(Annex and living projection|Annex · painted|BROR workbench|Long divider|Workshop · practical|Workshop entry|West annex gable|Annex · folded)/))
  .flatMap(g=>g.children.filter(m=>!m.userData.part.slab&&!m.userData.part.walkable).flatMap(m=>[m,...m.children]));
const hard=F.tree(F.triangles(objects)),local=G.car.clone(true);local.position.set(0,0,0);local.rotation.set(0,0,0);
local.updateWorldMatrix(true,true);const shape=F.triangles(local.children),ct=F.tree(shape.slice()),base=ct.b;
const start=-1.25,end=L.z,floor=z=>space.support(L.x,z,L.floor,.002);
let actual=Infinity,up=Infinity,limiter=null;
const samples=[];
for(const z of [start,...Array.from({length:101},(_,i)=>start+i*(end-start)/100),3.39,end]){
  let t=0;
  // Axles 1.21 and -1.23 about datum, tyre R=.289. Ignore suspension deflection.
  for(let i=0;i<4;i++)t=Math.atan2(floor(z+1.23*Math.cos(t))-floor(z-1.21*Math.cos(t)),2.44*Math.cos(t));
  const y=floor(z-1.21*Math.cos(t))+1.21*Math.sin(t)+.289*(1-Math.cos(t));
  const mat=new T.Matrix4().makeRotationY(Math.PI).multiply(new T.Matrix4().makeRotationX(t)).setPosition(L.x,y,z);
  const d=F.nearest(F.transformed(ct,mat),hard);if(d.m<actual){actual=d.m;limiter=d.hit.userData.slot;}
  if([start,3.39,end].includes(z))samples.push({z,centreY:y,pitchDeg:t*180/Math.PI,gap:d.m});
  if(z>5.96&&z<6.6){local.position.set(L.x,y,z);local.rotation.set(t,Math.PI,0,'YXZ');
    up=Math.min(up,F.vertical(F.triangles(local.children),F.triangles([door,...door.children])).m);}
}
// Full ramp grade change is just 0.15 m; axle height difference can never
// exceed that. Enclose *every* intermediate rigid pose (including overhang).
const sin=.152/2.44,dy=(2.173+1.23)*sin+.289*(1-Math.sqrt(1-sin*sin)),dz=2.173+1.435*sin;
const lo=[L.x+base.min.x,space.grade-dy,start-dz],hi=[L.x+base.max.x,L.floor+base.max.y+dy,end+dz];
const env=new T.Mesh(new T.BoxGeometry(...hi.map((v,i)=>v-lo[i])));env.position.fromArray(hi.map((v,i)=>(v+lo[i])/2));
const lower=F.nearest(F.tree(F.triangles([env])),hard).m;
report.measurements.defaultAxis={from:start,to:end,sideOrEnvelopeLower:lower,actualWitness:actual,limiter,
  underPanelOnFlat:up,samples,assumption:'Axle-supported rigid pose; no suspension or invented track.'};
check(Math.abs(lower-.3425)<.0002&&Math.abs(actual-lower)<.0002,'Default ramp-to-lift minimum: '+[lower,actual]);
check(up>.74&&up<.76,'Actual open sectional underside: '+up);
