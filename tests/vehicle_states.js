// Local supplemental study, UI events and actual mesh witnesses. No reviewer decision.
const V=vehicleStudy,G=V.groups,S=()=>V.state(),F=()=>V.fit(),D=report.measurements;
const change=(id,v,type)=>{const e=$(id);e.value=String(v);e.dispatchEvent(new Event(type,{bubbles:true}));};
const loc=v=>change('v-location',v,'change'),slider=(k,v)=>change('v-'+k,v,'input');
const near=(a,b,label,eps=.0002)=>check(Math.abs(a-b)<eps,label+': '+[a,b]);
const bounds=g=>new T.Box3().setFromObject(g,true),sizes=g=>bounds(g).getSize(new T.Vector3()).toArray();
const snap=()=>({state:S(),fit:F(),warn:$('v-warning').textContent,display:$('v-clear').textContent});
const paint=meshes.filter(m=>m.parent.userData.name.startsWith('Annex · painted')&&m.userData.part.overhead);
function roofRay(){
  const f=F().car,p=f.paintAt;
  const hit=ray(p,[0,1,0],paint)[0];check(hit,'Missing painted lining at minimizer');near(hit.distance,f.paint,'Ceiling vertical witness');
  // Compare both roof ends and the centre with independent down/up picks.
  return [-.805,0,.44,.61,.86].map(dz=>{
    const x=S().x+.04,z=S().z-dz,body=ray([x,6,z],[0,-1,0],G.car.children)[0];
    const lining=ray([x,body.point.y,z],[0,1,0],paint)[0];
    check(lining.distance>=f.paint-.00002,'Centre-only ceiling result');return {dz,gap:lining.distance};
  });
}
D.initial=snap();D.sizes={car:sizes(G.car),trailer:sizes(G.trailer)};
near(F().approachSides[0],.4425,'left jamb margin');near(F().approachSides[1],.3425,'right jamb margin');
for(const [g,dim] of [[G.car,[4.345,1.435,1.635]],[G.trailer,[6.71,2.57,2.32]]])
  sizes(g).forEach((v,i)=>near(v,dim[i],g.userData.name));
const blocked=(x,z,y)=>!space.tryMove(new T.Vector3(x,y,z),x,z);
check(blocked(-13.7,-1.30,-.45)&&blocked(-15.37,-4.27,-.45),'Parked bodies must block walking');
check(!blocked(-14,-2.65,-.45)&&!blocked(-3.9,7.8,-.30),'Clear aisle and flush platform must permit walking');
photo('carport-arrival',[-9.7,1.35,-.06],[-15.2,.60,-3.06],61);
photo('dacia-front',[-10.11,.71,-.61],[-12.65,.16,-1.37],54);
photo('dacia-rear',[-16.61,.53,-1.53],[-14.49,.16,-1.22],78);
photo('trailer',[-10.33,1.37,-6.66],[-16.21,.66,-4.18],61);
photo('trailer-entry',[-11.35,1.08,-2.66],[-16.41,1.06,-4.22],68);
loc('lift');check(S().loc==='lift','Load parked car onto lift: '+$('v-warning').textContent);
check(!blocked(-13.7,-1.30,-.45)&&blocked(-3.90,7.80,-.30),'Collision did not relocate with car');
const c0=bounds(G.car);near(c0.min.y,-.3,'tyres on floor');
slider('h',.60);D.raised=snap();near(S().h,.60,'lift command');near(bounds(G.car).min.y,-.30+.60+.08-.235,'pad contact');
photo('raised',[ -4.77,1.35,5.24],[-3.84,.61,7.95],75);
photo('double-x',[-5.70,.025,6.46],[-3.86,-.04,7.82],68);
const plane=G.lift.children.filter(m=>m.userData.part.component==='platform');
near(plane.length,2,'platform count');near(bounds(plane[0]).max.y,-.3+.60,'moving plate top');
near(bounds(plane[1]).min.x-bounds(plane[0]).max.x,.8,'clear centre');
const car0=G.car,original=G.car.position.clone();slider('x',-3.65);slider('z',8.05);
D.shift=snap();D.roofRays=roofRay();near(S().x,-3.65,'pit X');near(S().z,8.05,'pit Z');
check(G.car===car0&&G.car.position.distanceTo(original)>.3,'Expected same car following pit');
slider('h',1.80);D.maxRequest=snap();
slider('x',-4.6);near(S().x,-3.65,'Pit/bench refusal');check($('v-warning').textContent.includes('refuzată'),'Bench limit warning');
$('v-reset').click();slider('x',-3.35);near(S().x,-3.35,'static alternate layout');
check(F().approachSides[1]<0&&$('v-warning').textContent.includes('Intrare nefezabilă'),'Misaligned entry must be flagged');
D.offsetNotDriveable=snap();
$('v-reset').click();loc('lift');slider('z',7.05);near(S().z,7.05,'Low pitch placement');
slider('h',1.80);D.nearDoorRoofLimit={...snap(),refused:V.lastRefusal()};
check(S().h===0&&V.lastRefusal()?.fit.car.paint<.025,'Full stroke with less than 25 mm pitched-lining gap: '+JSON.stringify(D.nearDoorRoofLimit));
$('v-reset').click();loc('lift');
// Align with a ray to the real sectional panel, use the same E key as a visitor.
$('walk').click();space.move(feet,-3.95-feet.x,0);space.move(feet,0,3.9-feet.z);
const door=meshes.find(m=>m.userData.part.door?.kind==='garage');
function aimDoor(){
  update();const d=door.position.clone().sub(camera.position);
  heading=Math.atan2(d.x,d.z);tilt=Math.atan2(d.y,Math.hypot(d.x,d.z));update();
  host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
}
aimDoor();check(door.userData.open,'Normal E failed at apron '+feet.toArray());
D.open=snap();check(F().car.door>.7&&F().car.door<=F().car.doorAbove&&F().car.doorAbove<1.1,
  'Finite parked panel should be closer to the sloped glass diagonally than vertically');
slider('h',1.80);check(S().h===0&&$('v-warning').textContent.includes('refuzată'),'Open door must limit stroke');
slider('h',.36);check(S().h===.36,'Low stroke with open panel');
D.openRaised=snap();aimDoor();check(!door.userData.open,'E close after low lift');
slider('h',1.18);check(S().h===1.18,'Interior lift sample with closed panel');
aimDoor();check(!door.userData.open,'Opening into elevated Dacia not prevented');
D.deniedOpen=snap();
$('v-reset').click();check(S().loc==='bay'&&!S().h&&S().x===-3.90&&S().z===7.8,'Reset did not restore pose');
check(!blocked(-3.9,7.8,-.30)&&blocked(-13.7,-1.30,-.45),'Reset collision');
slider('h',1.8);near(S().h,1.8,'unloaded nominal stroke');check(blocked(-3.225,7.8,-.30),'Raised recess must obstruct walker');
D.unloaded=snap();$('v-reset').click();D.reset=snap();
