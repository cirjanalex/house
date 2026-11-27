// JCT-01: use the same positions and camera angles as the reported ground-floor defect.
const visible=()=>meshes.filter(m=>m.visible&&m.parent.visible);
const footprint=meshes.filter(m=>m.parent.userData.name==='Ground footprint');
const down=[0,-1,0];
function first(from,dir,list=visible()){
  const h=ray(from,dir,list)[0];
  check(h,'No mesh at '+from);
  const m=h.object,part=m.userData.part;
  const keys=[part.slot,part.edge_slot||part.slot,part.soffit_slot||part.slot];
  const face=Array.isArray(m.material)?m.material[h.face.materialIndex]:m.material;
  const slot=keys[Array.isArray(m.material)?h.face.materialIndex:0];
  check(face===material(slot,true),'Material on hit face disagrees with '+slot);
  return {group:m.parent.userData.name,slot,point:h.point.toArray()};
}
const modes={};report.measurements.modes=modes;
for(const extended of [true,false]){
  if(($('canopy').getAttribute('aria-pressed')==='true')!==extended)$('canopy').click();
  const mode=extended?'extended':'retracted',grid=[],facades=[],inside=[],surround=[];
  modes[mode]={grid,facades,inside,surround};
  for(const z of [14.01,14.05,14.10,14.15,14.195]){
    for(const x of [5.46,5.50,5.55,5.60,5.645]){
      const finish=first([x,1.4,z],down,footprint);
      const sceneHit=first([x,1.4,z],down);
      grid.push({x,z,finish,sceneHit});
      check(finish.slot==='stone'&&Math.abs(finish.point[1])<1e-5,'Board or missing plinth at '+[x,z]);
      check(sceneHit.slot!=='floor','Visible boards at '+[x,z]);
      check(!space.tryMove(new T.Vector3(x,0,z),x,z),'Corner is just a finish, not a joined solid');
    }
  }
  // From outside: both faces have the same finish across the old open quadrant
  // from floor to ceiling. Below FFL, look at the actual plinth rather than the terracing.
  for(const h of [.006,.85,1.40,3.015]){
    for(const z of [13.96,14.01,14.10,14.195,14.201]){
      const p=first([5.30,h,z],[1,0,0]);facades.push(p);
      check(p.slot==='a_plaster'&&Math.abs(p.point[0]-5.448)<.0001,'Discontinuous west face');
    }
    for(const x of [5.449,5.46,5.55,5.645,5.69]){
      const p=first([x,h,14.43],[0,0,-1]);facades.push(p);
      check(p.slot==='a_plaster'&&Math.abs(p.point[2]-14.202)<.0001,'Discontinuous south face');
    }
  }
  for(const [x,z] of [[5.87,13.775],[5.91,13.75],[6.02,13.60],[6.33,13.76],
                       [4.85,12.76],[4.85,13.13]]){
    const p=first([x,.11,z],down);inside.push(p);
    check(p.group==='Ground footprint'&&p.slot==='floor'&&Math.abs(p.point[1])<.0001,
          'Lost room or garden-door floorboards at '+[x,z]);
  }
  for(const [x,z,h] of [[5.445,14.10,-.009],[5.55,14.205,-.01005],
                          [4.85,13.25,-.0005],[6.11,14.78,-.16053],[6.41,14.78,-.30527]]){
    const p=first([x,.30,z],down);surround.push(p);
    check(p.group==='Site paving and terrace'&&p.slot==='stone'&&Math.abs(p.point[1]-h)<.0001,
          'Changed deck or east step at '+[x,z]);
  }
  const side=first([5.38,-.005,14.10],[1,0,0]),end=first([5.55,-.005,14.32],[0,0,-1]);
  check(side.slot==='stone'&&Math.abs(side.point[0]-5.455)<.0001&&
        end.slot==='stone'&&Math.abs(end.point[2]-14.2)<.0001,'Exposed board edge below wall');
  modes[mode].plinth=[side,end];
  photo('corner-from-deck-'+mode,[5.02,1.775,15.48],[5.53,.022,14.055],60);
  photo('corner-from-steps-'+mode,[6.21,1.64,14.90],[5.57,.04,14.085],64);
  photo('corner-near-'+mode,[5.28,.30,14.85],[5.53,.025,14.06],44);
}
