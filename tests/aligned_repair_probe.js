// Supplemental close-ups use independent cameras. Normal walking is checked by the five routes.
check([2,3].includes(data.aligned?.repair),'Requires the round-two bearings and thresholds');
const group=name=>meshes.filter(m=>m.parent.userData.name.startsWith(name));
const floor=group('Site paving and terrace'),perg=group('Timber pergolas');
const M=report.measurements,up=[0,1,0],down=[0,-1,0];
function hit(o,d,ms){const h=ray(o,d,ms)[0];check(h,'No mesh at '+JSON.stringify(o));return h;}
function contact(x,z,near,parts,bases){
  const y=hit([x,near-.16,z],up,parts).point.y,Y=hit([x,near+.13,z],down,bases).point.y;
  check(Math.abs(y-Y)<.00025,'Unsupported bearing '+[x,z,y,Y]);
  return {x,z,base:y,finish:Y,gap:y-Y};
}
const cabin=group('Sauna · schematic stone heater'),tile=group('Sauna · vertical wood lining').filter(m=>m.userData.slot==='b_tile');
M['SAU-01']=[[2.001,.657],[1.789,.454],[1.789,.871],[2.171,.454],[2.171,.871]]
  .map(([x,z])=>contact(x,z,3.151,cabin,tile));
check(!space.tryMove(new T.Vector3(2.001,3.15,.657),2.001,.657),'Heater is not solid');
photo('sau-01-guard-feet',[1.77,3.38,1.43],[2.00,3.37,.64],60);
const grade=z=>-.01*(z-13.2),header=perg.filter(m=>m.position.z===17&&m.userData.part.size[0]>5);
const row=perg.filter(m=>m.position.z===17&&m.userData.part.size[1]>2);
check(row.length===4,'Rear post count');
M['CAN-01']=[];
for(const m of row){
  const x=m.position.x,z=m.position.z;
  for(const [u,v] of [[0,0],[-.074,-.074],[.074,.074]]){
    const b=contact(x+u,z+v,grade(z+v),[m],floor);
    const low=hit([x+u,2.52,z+v],up,header).point.y,top=hit([x+u,3.02,z+v],down,[m]).point.y;
    check(Math.abs(top-low)<.00012,'Post head/beam air gap');M['CAN-01'].push({...b,head:top,beam:low});
  }
}
photo('can-01-and-ter-02-south',[3.00,1.35,22.0],[3,1.3,16.92],65);
photo('can-01-east-foot',[5.27,.20,17.64],[5.79,.02,17],44);
photo('can-01-paired-heads',[3.95,2.17,18.75],[4.12,2.72,17],43);
const outside=meshes.filter(m=>m.parent.userData.room==='Rear terrace');
const furnitureFeet=outside.filter(m=>m.userData.part.profile&&m.userData.slot==='a_teak');
check(furnitureFeet.length===28,'Not four actual soles on each of seven terrace pieces');
M['TER-02']={soles:[],finish:[]};
for(const m of furnitureFeet){
  // Test two opposite corners as well as the centre; a single support-height per chair is insufficient.
  const [w,,d]=m.userData.part.size,a=m.rotation.y;
  for(const s of [-1,0,1]){
    const u=s*.42*w,v=s*.42*d,x=m.position.x+u*Math.cos(a)+v*Math.sin(a),z=m.position.z-u*Math.sin(a)+v*Math.cos(a);
    M['TER-02'].soles.push(contact(x,z,grade(z),[m],floor));
  }
}
for(const [x,z,y] of [[4.83,13.21,-.0001],[4.83,15.2,-.02],[4.83,17.19,-.0399],
    [6.11,14.7,-.160],[6.40,14.7,-.305],[.02,16.1,-.169333],[-.28,16.1,-.309667]]){
  const p=hit([x,.32,z],down,floor).point;check(Math.abs(p.y-y)<.00025,'Deck or lateral descent datum');M['TER-02'].finish.push(p.toArray());
}
check(!space.tryMove(new T.Vector3(3.05,-.45,17.22),3.05,17.15),'Garden-facing centre still climbs as a step');
photo('ter-02-west-side',[-2.85,.85,17.04],[.20,-.11,16.05],55);
photo('ter-02-east-side',[8.07,.82,16.33],[5.83,-.12,14.72],59);
const front=perg.filter(m=>m.position.z===-1.45&&m.userData.part.size[1]>2).sort((a,b)=>a.position.x-b.position.x);
check(front.length===8 && front[1].position.x-front[0].position.x<.3,'Missing fine entrance rhythm');
M['PER-01']=front.map(m=>{
  const x=m.position.x,z=m.position.z,b=contact(x,z,-.45,[m],floor);
  const head=hit([x,3.1,z],down,[m]).point.y,beam=hit([x,2.3,z],up,perg.filter(k=>k.position.z===z&&k.userData.part.size[0]>7)).point.y;
  check(Math.abs(head-beam)<.0001,'Entrance bearing');return {...b,head,beam};
});
photo('per-01-entrance-rhythm',[2.7,1.35,-7.70],[5.6,1.44,-1.3],72);
const east=group('Mansard perimeter'),pane=east.find(m=>m.userData.slot==='glass'&&m.position.z>5.9&&m.position.z<7.8&&m.position.x>9);
const bb=new T.Box3().setFromObject(pane),center=bb.getCenter(new T.Vector3());
const role=(y,z)=>hit([10.3,y,z],[-1,0,0],east).object.userData.slot;
for(const z of [6.09,6.53,7.36,7.64])check(role(3.8,z)==='glass','Stair opening blocked at '+z);
check(role(3.18,6.88)==='frame'&&role(4.44,6.88)==='frame'&&role(4.50,6.88)==='render','Stair window height');
check(role(3.82,5.94)==='render'&&role(3.82,7.81)==='render','Stair window wrong longitudinal position');
const rim=east.filter(m=>m.userData.slot==='frame'&&m.position.x>9&&m.position.z>5.96&&m.position.z<7.78);
const opening=new T.Box3();for(const m of rim)opening.expandByObject(m);
check(Math.abs(opening.max.z-opening.min.z-1.80)<.001&&Math.abs(opening.max.y-opening.min.y-1.32)<.001,'Stair outer dimensions');
M['WIN-01']={frameMin:opening.min.toArray(),frameMax:opening.max.toArray(),glass:bb.getSize(new T.Vector3()).toArray(),centre:center.toArray()};
photo('win-01-east-stair',[19.4,3.54,6.87],[9.8,3.8,6.87],48);
const doors=group('Ground envelope').filter(m=>m.userData.part.leafStyle);
M['ENT-01']=[];
for(const m of doors){
  const p=m.userData.part,front=p.leafStyle==='greyPanel',{x,z}=m.position;
  const r=new T.Raycaster(new T.Vector3(x+(front?p.size[0]/32:0),1.32,z+(front?-.8:.8)),new T.Vector3(0,0,front?1:-1));
  const h=r.intersectObject(m,true)[0];check(front?h.object!==m&&h.object.material===material('a_panelface',true):
    h.object===m&&h.object.material.transparent,'Closed leaf surface');
  if(front){r.ray.origin.x=x;check(r.intersectObject(m,true)[0].object===m,'Vertical panel groove missing');}
  check(!space.tryMove(new T.Vector3(x,0,z),x,z),'Closed entrance did not block');
  photo(front?'ent-01-grey-panel':'ent-01-glazed-terrace',front?[1.0,1.56,1.1]:[4.13,1.7,15.32],[x,1.22,z],64);
  const before=m.position.clone(),stance=new T.Vector3(x,0,z+(front?-1:1));
  check(m.userData.toggle(stance)&&before.distanceTo(m.position)>.60&&m.userData.toggle(stance)&&before.equals(m.position),'Leaf movement');
  M['ENT-01'].push({type:p.leafStyle,raySlot:front?'a_panelface':'glass',openedAndRelatched:true,parts:m.children.length});
}
const rails=group('Stair · sloping handrails'),treads=group('Return stair and landing');
M['STR-01']=[];
for(const p of rails.filter(m=>m.userData.slot==='b_silver')){
  const x=p.position.x,z=p.position.z;
  const b=contact(x,z,p.position.y,[p],treads.filter(m=>m.userData.part.walkable));
  const upright=rails.find(m=>m.userData.slot==='a_frame'&&Math.abs(x-m.position.x)<.025&&z===m.position.z);
  const bottom=hit([upright.position.x,b.finish-.05,z],up,[upright]).point.y;
  const top=hit([x,b.finish+.18,z],down,[p]).point.y;
  check(top-bottom>=.0035,'Stair plate not engaged with upright');M['STR-01'].push({...b,plateOverlap:top-bottom});
}
check(M['STR-01'].length===14,'Rail mount count');
photo('str-01-lower',[5.83,1.8,7.40],[6.62,.76,7.88],58);
photo('str-01-upper',[6.75,3.54,6.52],[5.98,3.15,5.75],54);
M['ANN-01']=[];
for(const [x,z] of [[-5.05,6.45],[-4.2,9.52],[-2.8,10.784],[-3.4,11.38],[-2.77,12.37]]){
  // The ridge crosses the 2.20 m hobby partition: start the upward ray above its cap.
  const inner=hit([x,2.34,z],up,meshes),outer=hit([x,6,z],down,group('Annex asymmetric'));
  check(inner.object.userData.slot==='a_lining'&&Math.abs(outer.point.y-inner.point.y-.16)<.001,'Missing narrow painted lining');
  M['ANN-01'].push({x,z,inner:inner.point.y,outer:outer.point.y});
}
check(hit([-5.02,2.72,8.48],[-1,0,0],meshes).object.userData.slot==='a_lining','Inside west gable not painted');
photo('ann-01-both-pitches',[-1.28,1.53,8.33],[-5.65,3.22,10.77],70);
const ramp=group('Garage · transverse-striated'),flags=group('Annex · west and rear stepping');
M['GAR-01']=[];
for(const z of [.6,1.6,2.6,3.6,4.55,4.699]){
  const p=hit([-3.95,.90,z],down,ramp).point;check(Math.abs(p.y-(-.30+(z-4.7)*.035))<.002,'Slope wrong');M['GAR-01'].push(p.toArray());
}
const toe=4.70-.15/.035,sample=z=>hit([-3.95,.9,z],down,ramp).point.y;
check(sample(toe+.066)-sample(toe+.074)>.0012,'No actual groove cut into garage ramp');
photo('gar-01-striated-ramp',[-6.93,1.38,.71],[-3.67,-.14,3.53],65);
M['PAV-01']={flags:flags.length,near:flags[0].position.toArray(),end:flags.at(-1).position.toArray()};
check(flags.length===54&&flags.every(m=>m.userData.part.walkable),'Incomplete physical flag path');
photo('pav-01-west-rear-path',[-11.53,8.62,21.10],[-5.45,.05,12],59);
const floors=group('Ground footprint').concat(group('Living · woven rug'));
M['FUR-01']={};
for(const [name,list,count] of [['sectional',group('L sectional'),8],['ventilation',group('Heat-recovery'),4]]){
  const supports=list.filter(m=>m.userData.part.box&&m.userData.part.size[1]<.06&&m.position.y<.05);
  check(supports.length===count,'Furniture supports missing '+name);
  M['FUR-01'][name]=supports.map(m=>{
    const {x,z}=m.position,b=contact(x,z,.007,[m],floors);
    const top=hit([x,.15,z],down,[m]).point.y,body=hit([x,.008,z],up,list.filter(k=>!supports.includes(k))).point.y;
    check(top>=body,'Furniture foot does not join frame');return {...b,engagement:top-body};
  });
}
for(const [x,z] of [[8.0,9.25],[6.68,10.29],[7.23,.72],[2.92,15.10]]){
  const y=z>14?grade(z):0;
  check(!space.tryMove(new T.Vector3(x,y,z),x,z),'Walker occupies supported furniture: '+[x,z]);
}
photo('fur-01-living-feet',[8.9,.18,10.43],[8.4,.08,9.50],60);
photo('fur-01-main-foot',[9.86,.043,10.06],[9.615,.031,9.565],44);
photo('fur-01-return-foot',[7.24,.043,11.21],[6.985,.03,10.735],44);
photo('fur-01-plant-feet',[7.80,.34,1.80],[7.25,.10,.79],51);
photo('hob-01-matched-lamp-on',[-1.16,1.50,11.10],[-3.81,.34,12],73,true);
