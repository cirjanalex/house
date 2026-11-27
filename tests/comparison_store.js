// Narrowest technical-door route beside the parked S 500 L. Use the live
// cylindrical walker against current solids, including open-leaf hardware.
for(const [k,v] of [['bay','center'],['car','mercedes']]){
  const e=$('v-'+k);e.value=v;e.onchange({target:e});
}
const ports=model.children.find(g=>g.userData.name==='Detached two-car carport'),leaf=ports.children[30];
check(vehicleStudy.state().id==='mercedes'&&leaf.userData.toggle(null),'occupied state and open door');
const clear=(x,z)=>space.tryMove(new T.Vector3(x,-.30,z),x,z);
const solids=(x,z)=>space.solids.filter(s=>s.group.visible&&s.top>-.28&&s.low<1.51&&s.distance(x,z)<.17)
  .map(s=>[s.group.userData.name,s.distance(x,z),s.low,s.top]);
report.measurements.blockedAt=solids(-16.86,-2.275);
const rows=[];for(let ix=0;ix<44;ix++){const x=-16.47-ix*.015;let zz=[];
  for(let iz=0;iz<65;iz++){const z=-2.41+iz*.008;if(clear(x,z))zz.push(z);}
  rows.push([+x.toFixed(3),zz.length?Math.min(...zz):null,zz.length?Math.max(...zz):null]);}
report.measurements.openIntervals=rows;
