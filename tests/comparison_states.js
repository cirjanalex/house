// Actual DOM interaction, same centres & requested course for both models.
const V=vehicleStudy,G=V.groups,S=V.state,F=V.fit,D=report.measurements;
function choose(id,v,type='change'){const el=$('v-'+id);el.value=v;el.dispatchEvent(new Event(type,{bubbles:true}));}
const set=(k,v)=>choose(k,v,'input'),near=(a,b,n)=>check(Math.abs(a-b)<.0002,n+': '+[a,b]);
const bb=g=>new T.Box3().setFromObject(g,true);
const blocked=(x,z,y)=>!space.tryMove(new T.Vector3(x,y,z),x,z);
function snap(){return {state:S(),open:F().open,pair:F().pair,bays:F().bays,trailer:F().trailer,warning:$('v-warning').textContent};}
const errors=[];window.addEventListener('error',e=>errors.push(e.message));
D.start=snap();
for(const id of ['bay','lift']){
  const old=camera.position.clone();$('v-'+id+'-view').click();
  check(camera.position.distanceTo(old)>1,'camera '+id+' button ineffective '+errors.join(';'));
  report.photos['control-'+id]=renderer.domElement.toDataURL('image/jpeg',.94);
}
$('level').value='all';$('level').onchange();
const daciaUUID=G.car.children[0].uuid;
choose('car','mercedes');check(S().id==='dacia'&&V.lastRefusal()?.fit.carport.front<-.25,'no silent overhang');D.originalRefusal=V.lastRefusal().fit.carport;
choose('bay','center');
for(const id of ['dacia','mercedes']){
  choose('car',id);check(S().id===id,'alternative placement: '+$('v-warning').textContent);
  const p=G.car.position.clone(),b=bb(G.car),car=data.comparison.cars[id],uuid=G.car.children[0].uuid;
  near(b.max.x-b.min.x,car.length,'bumper distance');near(b.max.z-b.min.z,car.mirrors,'deployed mirrors');
  near(b.max.y-b.min.y,car.height,'height');near(p.x,-14.075,'bay x');near(p.z,-1.13,'bay z');
  check(blocked(p.x,p.z,-.45),'walk-through parked car');
  photo(id+'-bay-front',[-9.9,1.08,-2.42],[-13.55,.29,-1.15],56);
  photo(id+'-bay-flank',[-12.9,1.42,2.73],[-14.2,.28,-1.2],73);
  D[id+'Bay']=snap();
  choose('location','lift');check(S().loc==='lift'&&G.car.children[0].uuid===uuid,'same model on lift');
  near(G.car.rotation.y,Math.PI,'garage heading');check(!blocked(p.x,p.z,-.45)&&blocked(S().x,S().z,-.30),'collision relocation');
  for(const open of [false,true]){
    choose('door',open?'open':'closed');check(F().open===open,'sectional command');
    set('h',.60);near(S().h,.60,'accepted lift');near(bb(G.car).min.y,-.3+F().car.rise,'actual rise');D[id+(open?'Open':'Closed')]=snap();
    const f=F().car,rayGap=ray(f.paintAt,[0,1,0],meshes.filter(m=>m.userData.part.overhead&&m.parent.userData.name.startsWith('Annex · painted')))[0];
    near(rayGap.distance,f.paint,'signed lining minimum');
    photo(id+'-same-stroke-'+(open?'open':'closed'),[-2.64,1.28,5.08],[-4.01,.68,7.93],88);
    const top=f.max;set('h',top);near(S().h,top,'highest reachable stroke: '+$('v-warning').textContent);
    if(top<1.80){set('h',+(top+.01).toFixed(2));near(S().h,top,'first disallowed cm');check(V.lastRefusal(),'missing refusal record');}
    photo(id+'-garage-'+(open?'open':'closed'),[-2.66,1.48,5.12],[-4.06,.53+f.rise*.8,7.46],83);
    set('h',0);
  }
  choose('door','closed');choose('location','bay');check(G.car.children[0].uuid===uuid&&G.car.position.distanceTo(p)<.001,'return pose');
}
choose('location','lift');set('h',.45);const ctr=G.car.position.clone();
choose('car','dacia');near(ctr.x,G.car.position.x,'same garage X');near(ctr.z,G.car.position.z,'same garage Z');near(S().h,.45,'same stroke');
check(G.car.children[0].uuid===daciaUUID,'restore original Dacia instance');choose('car','mercedes');
set('z',8.60);check(S().z===7.8&&V.lastRefusal()?.fit.car.ends[1]<0,'rear partition penetration');
set('x',-4.60);check(S().x===-3.9&&V.lastRefusal(),'pit–bench');
set('h',1.4);choose('door','open');check(!F().open&&$('v-warning').textContent.includes('oprită'),'panel sweep into elevated car');
$('v-reset').click();choose('location','lift');set('z',7.05);set('h',1.80);
check(S().h===0&&V.lastRefusal()?.fit.car.paint<.025,'low pitch at front');D.lowPitch=V.lastRefusal().fit.pair;
$('v-reset').click();set('x',-3.35);check(F().approachSides[1]<0&&$('v-warning').textContent.includes('Intrare nefezabilă'),'entry vs static');
$('v-reset').click();choose('location','lift');choose('door','open');set('h',1.80);
choose('car','mercedes');check(S().id==='mercedes'&&S().h===0&&$('v-comparison').textContent.includes('cursă 1,800')&&V.lastRefusal(),
  'visual toggle lost the common refused proposal');
$('v-reset').click();set('h',1.80);near(S().h,1.8,'unloaded stroke');check(blocked(-3.225,7.8,-.30),'exposed pit');
$('v-reset').click();choose('ac','on');near(F().trailer.height,2.775,'AC uses skin, not factory max');
D.ac=snap();photo('ac-unit',[-12.05,2.58,-2.24],[-15.23,1.97,-4.34],54);
set('ach',.50);check(S().ach===.225&&V.lastRefusal().fit.trailer.entry<0,'AC entry refusal');D.acRefused=V.lastRefusal();
set('ach',.18);near(F().trailer.height,2.73,'custom AC');choose('ac','off');near(F().trailer.entry,.240,'factory margin');
photo('no-ac',[-12.05,2.58,-2.24],[-15.23,1.97,-4.34],54);
$('v-reset').click();check(!S().ac&&S().id==='dacia'&&S().loc==='bay'&&S().x===-3.9&&S().h===0&&!F().open,'reset defaults');
check(!errors.length,'uncaught interaction error: '+errors.join(';'));
