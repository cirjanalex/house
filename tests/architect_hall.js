// Actual furniture soles, wall and door geometry. No plan proxies or hidden furniture.
const get=(pred)=>model.children.filter(g=>pred(g.userData));
const store=get(g=>g.room==='Entrance hall'&&g.furniture);
const shell=get(g=>g.name==='Ground envelope and openings')[0].children;
const slab=get(g=>g.name==='Ground footprint')[0].children;
const leaf=shell.find(m=>m.userData.part.leafStyle==='greyPanel');
const M=report.measurements,bb=o=>new T.Box3().setFromObject(o);
check(store.length===2 && $('items').checked && store.every(g=>g.visible),'Missing visible hall pair');
const hit=(o,d,ms)=>{const h=ray(o,d,ms)[0];check(h,'No physical hit '+o);return h;};
const eq=(a,b,label)=>check(Math.abs(a-b)<.00015,label+': '+a+' vs '+b);
M.storage={};
const failedBacks=[];
for(const g of store){
  const b=bb(g),z=(b.min.z+b.max.z)/2;
  const wall=hit([b.min.x+.005,.43,z],[-1,0,0],shell);
  if(Math.abs(b.min.x-wall.point.x)>.00015)failedBacks.push(`${g.userData.use}: ${b.min.x-wall.point.x} m`);
}
check(!failedBacks.length,'Back not flush: '+failedBacks.join('; '));
for(const g of store){
  const b=bb(g),name=g.userData.use;
  for(const z of [b.min.z+.02,(b.min.z+b.max.z)/2,b.max.z-.02])for(const y of [.05,b.max.y-.07]){
    const wall=hit([b.min.x+.005,y,z],[-1,0,0],shell);
    check(wall.object.userData.slot==='render','Not solid masonry behind '+name);
    eq(b.min.x,wall.point.x,'Back not flush: '+name);
  }
  for(const z of [b.min.z+.022,(b.min.z+b.max.z)/2,b.max.z-.022]){
    const x=(b.min.x+b.max.x)/2;
    const floor=hit([x,.07,z],[0,-1,0],slab).point.y;
    const sole=hit([x,-.06,z],[0,1,0],g.children).point.y;eq(sole,floor,'Sole not bearing: '+name);
  }
  if(name==='Coat storage'){
    const grips=g.children.filter(m=>m.userData.slot==='a_frame');check(grips.length===3,'Coat pulls missing');
    for(const m of grips)check(hit([1.2,m.position.y,m.position.z],[-1,0,0],g.children).object===m,'Pull faces wall');
  }else{
    for(const dz of [-.18,.18])for(const h of [.20,.56]){
      const z=b.getCenter(new T.Vector3()).z+dz;
      const back=hit([1.1,h,z],[-1,0,0],[...shell,...g.children]);
      eq(back.point.x,b.min.x,'Cubbies are blocked from hall');
    }
  }
  M.storage[name]={min:b.min.toArray(),max:b.max.toArray()};
}
const sidelight=hit([2.31,1.31,3.33],[0,0,-1],shell);
check(sidelight.object.userData.slot==='glass','Front sidelight lost');
const solids=store.flatMap(g=>g.children.map(bb));
const w=leaf.userData.part.size[0],hinge=leaf.localToWorld(new T.Vector3(-w/2,0,0));
const closed=leaf.position.clone(),base=leaf.rotation.y;
const doorParts=[leaf,...leaf.children].map(m=>{
  m.geometry.computeBoundingBox();const b=m.geometry.boundingBox.clone();
  if(m!==leaf){m.updateMatrix();b.applyMatrix4(m.matrix);}
  return b.translate(new T.Vector3(w/2,0,0));
});
let gap=Infinity;const samples=[];
for(const sign of [1,-1])for(let i=0;i<=180;i++){
  const frac=sign>0?i/180:1-i/180,rad=base-frac*Math.PI/2;
  const mat=new T.Matrix4().makeRotationY(rad).setPosition(hinge);
  for(const d of doorParts){
    const b=d.clone().applyMatrix4(mat);
    for(const s of solids){
      const distance=Math.hypot(Math.max(0,b.min.x-s.max.x,s.min.x-b.max.x),
        Math.max(0,b.min.z-s.max.z,s.min.z-b.max.z));
      gap=Math.min(gap,distance);
      check(distance>.035,'Entry leaf or hardware strikes storage in its sweep');
    }
  }
  if(i===180)samples.push(new T.Vector3(w/2,0,0).applyMatrix4(mat));
}
M.sweep={samplesPerDirection:181,leafAndHardwareParts:doorParts.length,minimumConservativeGap:gap};
const poses=M.walk=[];
function go(x,z){
  for(let i=0;i<800;i++){
    const dx=x-feet.x,dz=z-feet.z,d=Math.hypot(dx,dz);if(d<.002)break;
    const k=Math.min(.045,d)/d;space.move(feet,k*dx,k*dz);
  }
  check(Math.hypot(feet.x-x,feet.z-z)<.003,'Hall approach blocked at '+[x,z]);
  update();eq(camera.position.y-feet.y,1.8,'Actual walking eye');poses.push(feet.toArray());
}
function operate(open){
  const to=leaf.position.clone().sub(camera.position);
  heading=Math.atan2(to.x,to.z);tilt=Math.atan2(to.y,Math.hypot(to.x,to.z));update();
  host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
  check(!!leaf.userData.open===open,'House leaf did not respond at '+feet.toArray());
  eq(leaf.position.distanceTo(samples[open?0:1]),0,'Simulated sweep endpoint differs from real leaf');
}
$('walk').click();go(1.72,1.9);operate(true);go(1.72,5.75);
go(1.23,5.06);go(1.33,4.24);operate(false);
go(1.20,3.97);go(1.16,5.06);go(1.72,5.75);go(3.78,6.04);
go(1.72,5.75);go(1.72,4.61);operate(true);go(1.72,1.90);operate(false);
go(1.72,-3.40);check(closed.distanceTo(leaf.position)<.001,'Entrance not returned shut');
