// Same poses on the rejected and repaired exports. Collect every defect before reporting.
const M=report.measurements,issues=new Set();
const expect=(ok,id)=>{if(!ok)issues.add(id);};
const near=(a,b)=>Math.abs(a-b)<.00015;
const group=name=>meshes.filter(m=>m.parent.userData.name.startsWith(name));
const front=meshes.find(m=>m.userData.part.leafStyle==='greyPanel');
const floor=group('Ground footprint').concat(group('Site paving and terrace'));
M.D01=[];M.T01=[];M.P01=[];
check($('items').checked && $('finish').checked,'Need furnished, finished building');
$('walk').click();
function walk(x,z){
  for(let i=0;i<500;i++){
    const dx=x-feet.x,dz=z-feet.z,d=Math.hypot(dx,dz);if(d<.002)break;
    const step=Math.min(d,.045)/d;space.move(feet,dx*step,dz*step);
  }
  check(Math.hypot(feet.x-x,feet.z-z)<.003,'Blocked on witness approach '+[x,z]);
  update();check(near(camera.position.y-feet.y,1.80),'Wrong operating eye');
}
function key(label,shouldMove){
  const v=front.position.clone().sub(camera.position);heading=Math.atan2(v.x,v.z);tilt=Math.atan2(v.y,Math.hypot(v.x,v.z));update();
  const from=feet.clone(),pose=front.matrixWorld.clone(),open=!!front.userData.open;
  host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
  const moved=!front.matrixWorld.equals(pose),caption=$('caption').textContent;
  M.D01.push({label,from:from.toArray(),wasOpen:open,shouldMove,moved,caption});
  expect(moved===shouldMove && from.equals(feet) && !!front.userData.open===(shouldMove?!open:open) &&
         (shouldMove||caption==='Step clear of the door.'),'D01');
}
function state(open){
  walk(1.72,4.62);
  if(!!front.userData.open!==open)key('clear interior operating stance',true);
  check(!!front.userData.open===open,'Cannot set door from clear stance');
}
walk(1.72,1.90);key('porch entry',true);walk(1.72,4.62);state(false);
for(const open of [false,true]){
  state(open);walk(1.52,3.43);key('reported occupied mid arc',false);
  photo('d01-mid-'+(open?'closing':'opening'),camera.position.toArray(),[1.46,1.28,3.04],73);
}
state(false);walk(1.30,3.88);key('reported parked pull sweeps walker',false);
state(true);
const proposed=new T.Vector3(1.30,0,3.88),parked=front.matrixWorld.clone();
const canStand=space.tryMove(feet.clone(),proposed.x,proposed.z),canClose=front.userData.toggle(proposed);
M.D01.push({label:'occupied parked hardware',hypotheticalFeet:proposed.toArray(),canStand,canClose});
expect(!canStand&&!canClose&&front.matrixWorld.equals(parked),'D01');state(true);

for(const x of [1.32,1.58,1.89,2.31])for(const z of [2.77,2.7797,2.7803,2.785,2.82,2.88,2.94,2.971,2.9797,2.9803,2.989,3.04]){
  const hits=ray([x,.07,z],[0,-1,0],floor).filter(h=>Math.abs(h.point.y)<.0001);
  const slots=[...new Set(hits.map(h=>h.object.userData.slot))],n=new Set(hits.map(h=>h.object)).size;
  const support=space.support(x,z,0,.001);
  M.T01.push({x,z,slots,topMeshes:n,support});
  expect(n===1&&slots[0]===(z<2.98?'stone':'floor')&&near(support,0),'T01');
}
const porch=group('West entrance · masonry side parapet');
for(const z of [.60,1.30,1.90,2.40]){
  const under=ray([.15,-.65,z],[0,1,0],porch)[0],cap=ray([.15,.85,z],[0,-1,0],porch)[0];
  const soil=ray([.310,.85,z],[0,-1,0],porch.filter(m=>m.userData.slot==='r_soil'))[0];
  M.P01.push({z,under:under?.point.y,cap:cap?.point.y,soil:soil?.point.y??null});
  expect(under?.object.userData.slot==='a_plaster'&&near(under.point.y,space.grade)&&
    cap?.object.userData.slot==='stone'&&near(cap.point.y,.47)&&soil&&near(soil.point.y,.397),'P01');
}
const planted=porch.filter(m=>m.userData.slot==='r_leaf'),tufts=[];
for(let i=0;i<7;i++){
  let hits=0;
  for(let j=0;j<20;j++){
    const ang=j*Math.PI/10,x=.31+.07*Math.cos(ang),z=.57+i*.321+.115*Math.sin(ang);
    if(ray([x,1.1,z],[0,-1,0],planted)[0]?.point.y>.398)hits++;
  }
  tufts.push(hits);expect(hits>0,'P01');
}
M.plantedClusters=tufts;
const bounds=new T.Box3();porch.forEach(m=>bounds.expandByObject(m));
expect(bounds.min.x>0&&bounds.max.x<=.51501&&bounds.max.z<=2.7801,'P01');
const gradeSteps=[[.45,-.30],[.75,-.15],[1.10,0],[2.78,0],[2.98,0],[3.14,0]];
for(const [z,y] of gradeSteps)expect(near(space.support(1.72,z,y,.001),y),'T01');
const down=(z,list)=>ray([-.06,1,z],[0,-1,0],list)[0];
const toe=4.70-.15/.035,drain=down(toe-.055,group('Garage · low-side linear drain'));
const ramp=down(1.40,group('Garage · transverse-striated'));
expect(drain&&ramp&&Math.abs(ramp.point.y-(-.30+(1.40-4.70)*.035))<.002,'P01');
photo('t01-from-hall',[1.58,1.80,3.62],[1.58,0,2.90],68);
photo('t01-across-sill',[1.82,.33,3.59],[1.59,0,2.84],58);
photo('p01-from-court',[-2.65,1.35,.72],[.27,.13,1.57],51);
photo('p01-over-pocket',[-.88,1.35,.51],[.27,.29,1.49],60);
walk(1.72,1.90);key('porch relatch',true);walk(1.72,-3.40);
M.failed=[...issues];check(!issues.size,'Entrance regressions: '+M.failed.join(', '));
