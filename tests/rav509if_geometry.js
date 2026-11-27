// Real scene, real controls, physical faces and navigation. Not a review decision.
const V=vehicleStudy,G=V.groups,S=V.state,F=V.fit,D=report.measurements;
const id=m=>m.userData.part.component,box=m=>new T.Box3().setFromObject(m,true),mid=(b,k)=>(b.min[k]+b.max[k])/2;
const parts=(g,n)=>g.children.filter(m=>id(m)===n).sort((a,b)=>a.position.x-b.position.x);
const near=(a,b,k)=>check(Number.isFinite(a)&&Math.abs(a-b)<.000045,`${k}: ${a} vs ${b}`);
const send=(k,v)=>{const e=$('v-'+k);e.value=v;e.dispatchEvent(new Event(e.type==='range'?'input':'change'));};
const able=(x,z)=>space.tryMove(new T.Vector3(x,-.30,z),x,z);
const cabinet=model.children.find(g=>g.userData.name==='RAV509IF · pupitru'),cb=box(cabinet);
const annex=model.children.find(g=>g.userData.name.startsWith('Attached annex'));
const slab=annex.children.find(m=>m.userData.part.slab);
const p=parts(G.lift,'platform'),bases=parts(G.lift,'recess floor');
const rayDown=(x,z)=>ray([x,-.292,z],[0,-1,0],[slab,pad,...G.lift.children.filter(m=>m.visible)]);
const ground=(x,z,obj,y)=>{
  const hits=rayDown(x,z);check(hits[0]?.object===obj,`floor face ${x}/${z}: ${hits[0]?.object.userData.part?.component}`);near(hits[0].point.y,y,'face elevation');
  check(new Set(hits.filter(h=>Math.abs(h.point.y-y)<1e-5).map(h=>h.object)).size===1,'duplicate hit at floor');
  if(obj!==slab)check(!hits.some(h=>h.object===slab||h.object===pad),'solid slab/terrain occludes real well');
};
check(!document.getElementById('v-len')&&p.length===2&&bases.length===2,'wrong deck/control count');
near(+($('v-h').max),1.825,'slider max');near(+($('v-h').step),.005,'slider step');
const cs=cb.getSize(new T.Vector3());near(cs.x,.281,'cabinet X');near(cs.z,.254,'cabinet Z');near(cs.y,1.325,'cabinet height');
near(cb.min.y,-.3,'cabinet floor');check(!able(mid(cb,'x'),mid(cb,'z')),'can stand inside cabinet');
const cside=[cb.max.x+.175,mid(cb,'z')];check(able(...cside),'no supported position beside cabinet');
D.console={min:cb.min.toArray(),max:cb.max.toArray(),stance:cside};
const fixed=()=>JSON.stringify([slab.geometry.uuid,slab.userData.part.slab,bases.map(box),box(cabinet)]);
const parked=JSON.stringify(G.car.matrixWorld.toArray()),parkRead=JSON.stringify([F().bays,F().trailer]);
for(const [x,z] of [[-3.9,7.8],[-3.65,8.05]]){
  send('h',0);send('x',x);send('z',z);near(S().x,x,'axis X');near(S().z,z,'axis Z');
  const installation=fixed();const base=p.map(box);
  near(base[1].min.x-base[0].max.x,.900,'decks clear');near(base[1].max.x-base[0].min.x,1.920,'deck envelope');
  const wells=bases.map(box);near(wells[1].min.x-wells[0].max.x,.880,'wells clear');
  for(let i=0;i<2;i++){
    const b=base[i],w=wells[i],xx=mid(b,'x')+.03;
    near(b.max.z-b.min.z,1.580,'fixed plate length');near(b.max.x-b.min.x,.510,'fixed plate width');
    near(w.max.z-w.min.z,1.610,'pit length');near(w.max.x-w.min.x,.545,'pit width');
    near(w.max.y,-.565,'finished well base');near(b.min.z-w.min.z,.015,'front reveal');near(w.max.z-b.max.z,.015,'rear reveal');
    near(b.min.x-w.min.x,i===0?.025:.010,'left reveal');near(w.max.x-b.max.x,i===0?.010:.025,'right reveal');
    ground(xx,z+.30,p[i],-.30);near(space.support(xx,z+.30,-.30),-.30,'flush foot support');check(able(xx,z+.30),'cannot cross flush deck');
    const hole=slab.userData.part.slab.at(-2+i);near(Math.min(...hole.map(t=>t[0])),w.min.x,'actual cutout edge');
  }
  for(const h of [.70,1.825]){
    send('h',h);near(S().h,h,'empty rise accepted');check(!V.lastRefusal(),'empty limit');
    check(fixed()===installation,'height moves wells or console');
    for(let i=0;i<2;i++){
      const b=box(p[i]),w=wells[i];near(b.max.y+.30,h,'actual top from finished floor');near(b.min.z,base[i].min.z,'longitudinal creep');
      ground(mid(b,'x')+.071,z+.32,bases[i],-.565);check(!able(mid(w,'x'),z+.32),'walk-through well');check(able(x,z+1.02),'unsupported floor beyond ends');
    }
    for(const k of [1,2]){
      const arms=parts(G.lift,'RAV scissor stage '+k);check(arms.length===8,'missing double-X arms'); // 4 per platform
      for(const m of arms){
        const a=m.localToWorld(new T.Vector3(0,0,-m.userData.part.size[2]/2)),b=m.localToWorld(new T.Vector3(0,0,m.userData.part.size[2]/2));
        near(a.distanceTo(b),1.265,'rigid link');near(Math.min(a.y,b.y),-.515+(k-1)*(h+.215-.0625)/2,'stage bearing lower');
      }
    }
    if(h===1.825&&x===-3.9)photo('empty-1825',[-2.65,1.50,5.42],[-3.92,.69,7.78],71);
  }
}
ground(-4.76,7.99,slab,-.30); // previously inside the default west well
check(parked===JSON.stringify(G.car.matrixWorld.toArray())&&parkRead===JSON.stringify([F().bays,F().trailer]),'parking disturbed');
$('v-reset').click();
// An obstruction is not an infinite X-only projection: the fixed console
// can cross the relocating west pit in Z. Test its two distinct states.
send('x',-4.60);check(S().x===-3.9&&V.lastRefusal()?.fit.pitClear<0,'pit overlaps west bench');
send('z',7.0);send('x',-4.60);
check(V.lastRefusal()?.fit.pair.dacia.pitConsole<0&&S().x===-3.9,'no signed console / well refusal');
D.console.pitOverlap=V.lastRefusal().fit.pair.dacia.pitConsole;
$('v-reset').click();check(!V.lastRefusal()&&S().pads==='S505A9','reset');
