// Ray-test the actual rendered envelope from each side, including old paint, frame and glass.
const visible=meshes.filter(m=>m.visible && m.parent.visible);
const hit=(o,d,objects=visible)=>{
  const h=ray(o,d,objects)[0];check(h,'No physical surface at '+o+' -> '+d);return h;
};
const eq=(a,b,name)=>check(Math.abs(a-b)<.00015,`${name}: measured ${a}, expected ${b}`);
const garage=meshes.filter(m=>m.parent.userData.name.startsWith('Attached annex'));
const windows=report.measurements.windows=[];
for(const z of [6.50,9.20]){
  const floor=hit([-5.36,0,z],[0,-1,0],garage).point.y;
  eq(floor,-.30,'garage finished floor');
  for(const s of [-1,1]){
    const side=s<0?'outside':'inside',x=-5.9+s*.083;
    const y=1.07,zz=z+.17;
    const sill=hit([x,y,zz],[0,-1,0]).point.y, head=hit([x,y,zz],[0,1,0]).point.y;
    const north=hit([x,y,zz],[0,0,-1]).point.z,south=hit([x,y,zz],[0,0,1]).point.z;
    windows.push({side,x,north,south,width:south-north,sill,head,floor,height:head-sill,sillAboveFloor:sill-floor,headAboveFloor:head-floor});
    eq(head-sill,2.05,side+' rough opening height');
    eq(sill-floor,.55,side+' rough sill');eq(head-floor,2.60,side+' rough head');
    eq(south-north,1,side+' rough width');eq(north,z-.5,'north jamb');
    const probe=(u,h,slot,targetX)=>{
      const m=hit([-5.9+s*.24,h,u],[-s,0,0]);
      check(m.object.userData.slot===slot,`${side} at (${u}, ${h}): hit ${m.object.userData.slot}, not ${slot}`);
      if(targetX!==undefined)eq(m.point.x,targetX,side+' '+slot+' face');
    };
    for(const u of [-.42,-.22,.13,.42])for(const h of [.31,.42,.55,1.08,1.74,2.09,2.24])
      probe(z+u,h,'glass',-5.9+s*.0125);
    for(const u of [-.47,.47])probe(z+u,1.07,'frame',-5.9+s*.045);
    for(const h of [.27,2.28])probe(zz,h,'frame',-5.9+s*.045);
    probe(zz,1.36,'frame',-5.9+s*.04);
    probe(zz,sill-.010,'stone');probe(zz,sill-.035,s<0?'a_plaster':'render');
    for(const u of [-.501,.501])probe(z+u,1.71,s<0?'a_plaster':'render');
    check(!['glass','frame'].includes(hit([-5.9+s*.24,head+.02,zz],[-s,0,0]).object.userData.slot),
      side+' missing gable above head');
  }
}
const start=hit([-5.96,1.02,4.35],[0,0,1],garage).point.z;
const end=hit([-5.96,1.02,13.4],[0,0,-1],garage).point.z;
const [a,,b]=windows;
const chain=[a.north-start,a.width,b.north-a.south,b.width,end-b.south];
chain.forEach((v,i)=>eq(v,[1.30,1,1.70,1,3.30][i],'wall chain '+i));eq(end-start,8.30,'full wall');
report.measurements.wallChain={start,end,chain};
