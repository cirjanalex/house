// Four blocks, not wheel-supported runways. All catalogued height scenarios;
// projection overlap is not a claim of verified vehicle-specific support.
const V=vehicleStudy,G=V.groups,S=V.state,F=V.fit,D=report.measurements;
const box=m=>new T.Box3().setFromObject(m,true),id=m=>m.userData.part.component;
const near=(a,b,k)=>check(Math.abs(a-b)<.00004,`${k}: ${a} vs ${b}`);
const send=(k,v)=>{const e=$('v-'+k);e.value=v;e.dispatchEvent(new Event(e.type==='range'?'input':'change'));};
const codes={S505A9:.060,S505A7:.020,S505A6:.040,S505A5:.120,S505A1:.200};
check($('v-pads').options.length===5&&S().pads==='S505A9','untested selector');
const plates=G.lift.children.filter(m=>id(m)==='platform'),top=()=>box(plates[0]).max.y;
D.cases=[];D.actualLimits=[];
for(const car of ['dacia','mercedes']){
  $('v-reset').click();send('bay','center');send('car',car);send('location','lift');check(S().id===car&&S().loc==='lift','load');
  const pan=G.car.children.find(m=>['floor pan','illustrative floor pressing'].includes(id(m)));
  const tyre=G.car.children.filter(m=>['tyre','rounded sidewall'].includes(id(m)));
  for(const [set,ph] of Object.entries(codes)){
    send('h',0);send('pads',set);
    if(car==='mercedes'&&set==='S505A1'){
      const r=V.lastRefusal();check(S().pads!=='S505A1'&&r?.fit.car.by==='support'&&r.fit.car.max===null,'oversize pad lifted body from rest');
      near(box(G.car).min.y,-.30,'no artificial body rise');near(r.fit.car.verticalPadGap,-.005,'initial pad penetration');
      D.cases.push({car,set,refusal:r.fit.car});
      send('location','bay');send('pads',set);check(S().loc==='bay'&&S().pads===set&&!F().car,'empty can select case');
      for(const door of ['closed','open']){
        send('door',door);send('location','lift');check(S().loc==='bay'&&V.lastRefusal()?.fit.car.by==='support','loading penetration not refused');
        D.actualLimits.push({car,set,door,max:null});
      }
      continue;
    }
    check(S().pads===set,'pad selection: '+$('v-warning').textContent);
    const floorPan=box(pan),touch=floorPan.min.y-(top()+ph);
    const levels=[0,Math.max(0,Math.round((touch-.005)*200)/200),Math.round(touch*200)/200,.60];
    for(const h of levels){
      send('h',h);
      if(set==='S505A7'&&h>floorPan.min.y+.30-.025+.00001){
        // The 20 mm block is thinner than the study's 25 mm steel-to-car
        // reserve. Simulate the original request; verify the actual rollback.
        const r=V.lastRefusal(),expected=car==='dacia'?.210:.170;
        check(r?.fit.car.by==='body'&&r.fit.car.bodyGap<.025,'short block should meet steel reserve before pickup');
        near(r.proposal.h,h,'refused height');near(S().h,expected,'attainable limit');
        near(r.fit.car.max,expected,'reported cap');near(box(G.car).min.y,-.30,'no rise before pickup');
        if(h===.60)D.cases.push({car,set,actual:S().h,h,refusal:r.fit.car});continue;
      }
      near(S().h,h,'actual requested h');const f=F().car;
      const blocks=G.lift.children.filter(m=>id(m)==='rubber pad'&&m.visible).map(box);
      check(blocks.length===4,'missing rubber');const pbox=box(pan);
      for(const b of blocks){
        near(b.max.y-b.min.y,ph,'actual block height');near(b.max.x-b.min.x,.12,'block width');near(b.max.z-b.min.z,.16,'block depth');
        near(b.min.y,top(),'block grounded');near(pbox.min.y-b.max.y,f.verticalPadGap,'vertical pad clearance');
        near(Math.min(b.min.x-pbox.min.x,pbox.max.x-b.max.x),f.panEdge,'signed pad overhang');
        const plate=plates.map(box).find(p=>p.min.x<=b.min.x&&p.max.x>=b.max.x);
        check(plate&&Math.min(b.min.z-plate.min.z,plate.max.z-b.max.z)>.025,'pad over plate edge');
        near(Math.min(b.min.z-plate.min.z,plate.max.z-b.max.z),.110,'end margin');
        near(Math.min(b.min.x-plate.min.x,plate.max.x-b.max.x),.040,'inner edge');
      }
      near(f.contact,touch,'pickup from rendered pan');near(f.rise,Math.max(0,h-touch),'two-stage curve');
      near(box(G.car).min.y+.30,f.rise,'tyres/rest then rigid rise');
      const steelTr=VFit.triangles(plates),ts=VFit.triangles(G.car.children);
      near(VFit.vertical(steelTr,ts).m,f.bodyGap,'whole body over steel');
      check(VFit.vertical(steelTr,VFit.triangles(tyre)).m===Infinity&&f.tyreGap===Infinity,'false wheel support');
      const tb=[new T.Box3(),new T.Box3()];
      for(const t of VFit.triangles(tyre))for(const v of t.v)tb[Number(v.z>S().z)].expandByPoint(v);
      const p=box(plates[0]);near(p.min.z-tb[0].max.z,f.tyreEnds[0],'front tyre envelope');near(tb[1].min.z-p.max.z,f.tyreEnds[1],'rear tyre envelope');
      near(p.min.z-(tb[0].min.z+tb[0].max.z)/2,f.axleOutside[0],'front axle');near((tb[1].min.z+tb[1].max.z)/2-p.max.z,f.axleOutside[1],'rear axle');
      check(f.tyreEnds.every(v=>v>0)&&f.padOverlap>0,'wheel projection or no pad overlap');
      if(h===.60)D.cases.push({car,set,h,contact:touch,rise:f.rise,bodyGap:f.bodyGap,overlap:f.padOverlap,
        panEdge:f.panEdge,steelInner:f.inner,steelOuter:f.outer,ends:[f.padFront,f.padRear],axles:f.axleOutside,
        tyreEnds:f.tyreEnds,bumperOutside:f.bumperOutside,limits:f.limits});
    }
    for(const door of ['closed','open']){
      send('h',0);send('door',door);check(F().open===(door==='open'),'pad trial door not accepted');
      const max=F().car.max;send('h',max);near(S().h,max,'pad-specific cap');
      near(top()+.30,max,'actual deck top at cap');near(box(G.car).min.y+.30,Math.max(0,max-touch),'actual body above floor at cap');
      if(max<1.825){
        send('h',max+.005);near(S().h,max,'one increment over cap');
        check(V.lastRefusal()?.fit.car.ok===false,'no pad-specific refusal');
      }
      D.actualLimits.push({car,set,door,max,by:F().car.by,rise:F().car.rise,paint:F().car.paint});
    }
    send('h',0);send('door','closed');
  }
}
$('v-reset').click();
