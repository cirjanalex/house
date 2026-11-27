// Supplemental probe of the LENGTH control, not a substitute for any room walk.
// Observe actual UI events, current child geometry and the existing walk solver.
const V=vehicleStudy,G=V.groups,S=V.state,D=report.measurements;
const comp=m=>m.userData.part.component;
const parts=(g,k)=>g.children.filter(m=>comp(m)===k);
const bounds=m=>new T.Box3().setFromObject(m,true),mid=(b,k)=>(b.min[k]+b.max[k])/2;
const near=(a,b,t)=>check(Number.isFinite(a)&&Math.abs(a-b)<.00003,`${t}: ${a} vs ${b}`);
function send(k,v){
  const e=$('v-'+k);e.value=String(v);e.dispatchEvent(new Event(e.type==='range'?'input':'change',{bubbles:true}));
}
const text=k=>$('v-'+k).textContent,ro=(n,d)=>n.toFixed(d).replace('.',',');
const access=(x,z)=>space.tryMove(new T.Vector3(x,-.30,z),x,z);
const lenses=[1.55,1.75,1.95],ids=['dacia','mercedes'];
const input=$('v-len');
check(input?.type==='range'&&input.labels[0].textContent.includes('Lungime platforme')&&input.getClientRects().length,
  'visible, labelled range missing');
near(+input.min,1.55,'min');near(+input.max,1.95,'max');near(+input.step,.01,'step');near(+input.value,1.75,'initial');
const slab=model.children.find(g=>g.userData.name.startsWith('Attached annex')).children.find(m=>m.userData.part.slab);
function pitSnapshot(){return JSON.stringify([slab.geometry.uuid,slab.userData.part.slab,...parts(G.lift,'fixed end rim').map(bounds)]);}
const lift=G.lift,L=data.vehicles.lift,deck=(k,s)=>parts(lift,k).find(m=>(m.position.x>0)===s);
const printedRow=s=>[...$('v-comparison').querySelectorAll('tr')].find(r=>r.cells[0].textContent.includes(s));
function surfaces(x,z){
  const objects=[pad,...model.children.filter(g=>g.visible).flatMap(g=>g.children.filter(m=>m.visible&&m.isMesh))];
  return ray([x,L.floor+.008,z],[0,-1,0],objects);
}
function surface(x,z,m,y,tag){
  const hits=surfaces(x,z);
  check(hits[0]?.object===m,`${tag}: expected ${comp(m)}, saw ${hits[0]?.object.userData.part?.component||'terrain / other'}`);
  near(hits[0].point.y,y,tag+' Y');
  check(new Set(hits.filter(h=>Math.abs(h.point.y-y)<1e-5&&h.face.normal.y>.9).map(h=>h.object)).size===1,tag+' duplicate face');
  check(!hits.some(h=>h.object===pad||h.object===slab),tag+' turf or slab in cut');
}
const pit0=pitSnapshot();
const parkedPos=G.car.matrixWorld.toArray(),outside0=JSON.stringify({bays:V.fit().bays,trailer:V.fit().trailer});
// All endpoints: the fixed shallow-backed cover meets the changing nose at
// floor level. Neither a hidden second slab nor the outdoor lawn is flooring.
D.unloaded=[];
for(const len of lenses){
  send('len',len);send('h',0);near(S().len,len,'accepted UI length');
  for(const s of [false,true]){
    const main=deck('platform',s),nose=deck('sliding crosshead',s),base=bounds(main),tip=bounds(nose);
    const x=mid(base,'x')+.042,z=S().z;
    near(base.max.z-tip.min.z,len,'length from distinct child ends');near(tip.max.x-tip.min.x,.55,'tip width');
    near(base.max.x-base.min.x,.55,'base width');near(base.max.z,z+.825,'fixed rear datum');
    surface(x,z+.210,main,L.floor,'flush fixed');surface(x,tip.min.z+.001,nose,L.floor-.003,'socket lip');
    const rim=parts(lift,'fixed side rim').find(m=>Math.abs(bounds(m).min.x-base.max.x)<.00001);
    surface(base.max.x+.006,z+.168,rim,L.floor,'rim');
    if(len<1.95)surface(x,(tip.min.z+z-1.125)/2,deck('unused travel cover',s),L.floor,'unused travel');
    if(len>1.55)surface(x,(tip.max.z+base.min.z)/2,deck('floor insert between runners',s),L.floor,'inter-rail floor');
    for(const dz of [-1.102,-.947,-.810,.22]){
      check(access(x,z+dz),'unloaded flush floor blocked');const y=surfaces(x,z+dz)[0].point.y;
      check(Math.abs(y-L.floor)<.0031,'unsupported step');near(space.support(x,z+dz,L.floor),y,'solver vs actual floor');
    }
  }
  send('h',.70);near(S().h,.70,'unloaded raised');
  for(const s of [false,true]){
    const main=deck('platform',s),b=bounds(main),x=mid(b,'x')+.042,z=S().z;
    near(b.max.y,L.floor+.70,'fixed deck raised');near(bounds(deck('sliding crosshead',s)).max.y,b.max.y-.003,'nose raised');
    surface(x,z+.22,deck('recess floor',s),L.floor-L.embedded,'open well');
    check(!access(x,z+.22),'exposed pit walk-through');
    const skids=parts(lift,'fixed scissor bed rail').filter(m=>(m.position.x>0)===s);
    check(skids.length===2,'base rails per deck');for(const skid of skids){
      near(bounds(skid).min.y,bounds(deck('recess floor',s)).max.y,'grounded chassis');
      near(bounds(skid).max.y,L.floor-.228,'lower pivot datum');
    }
    check(access(x,z-1.012)===(len===1.55),'walker did not follow active footprint at front '+len);
    check(access(x,z+1.02),'rear footprint incorrectly expands');
    if(len<1.95)surface(x,(z+.825-len+z-1.125)/2,deck('unused travel cover',s),L.floor,'raised unused cover');
    if(len>1.55)surface(x,(z+.875-len+b.min.z)/2,deck('floor insert between runners',s),L.floor,'raised inter-rail floor');
  }
  check(pitSnapshot()===pit0,'pit moved/resized on length or stroke edit');
  check(JSON.stringify(G.car.matrixWorld.toArray())===JSON.stringify(parkedPos)&&
    JSON.stringify({bays:V.fit().bays,trailer:V.fit().trailer})===outside0,'deck edit disturbed parking/canopy measurements');
  if(len!==1.75){
    // Matched real scene photos with NO car obscuring the runners. Framing
    // fits both decks, the fixed rims, empty cover, crossheads and scissors.
    photo(len===1.55?'retracted-1550':'extended-1950',[-2.91,1.91,5.63],[-3.90,.09,7.64],59);
  }
  D.unloaded.push({len,h:S().h,car:G.car.position.toArray(),frontZ:bounds(deck('sliding crosshead',true)).min.z});
}
send('h',0);send('location','lift');check(S().loc==='lift','loading refused');
D.loaded=[];
// Directly measure axle centres from the selected car's TYRES, not its spec.
// Compare both sides' rubber edges to the deck along the actual light/bumper
// heading. Trust neither a displayed literal nor an overall lift group AABB.
for(const id of ids){
  send('car',id);check(S().id===id,'model not switched');
  const car=G.car,pan=parts(car,id==='dacia'?'floor pan':'illustrative floor pressing')[0];
  const tyre=parts(car,'tyre');check(tyre.length>0,'missing actual wheels');
  const frontLamp=parts(car,id==='dacia'?'four round headlamps':'wide rectangular headlamp')[0];
  check(mid(bounds(frontLamp),'z')<car.position.z,'nose direction wrong');
  for(const h of [0,.70]){
    send('len',1.55);send('h',h);near(S().h,h,'load height');const pose=car.matrixWorld.toArray(),panBox=bounds(pan);
    // The original model batches all four tyres into one indexed mesh.
    const rings=[new T.Box3(),new T.Box3()];
    for(const m of tyre){
      const v=new T.Vector3(),points=m.geometry.attributes.position;
      for(let i=0;i<points.count;i++){
        m.localToWorld(v.fromBufferAttribute(points,i));rings[Number(v.z>car.position.z)].expandByPoint(v);
      }
    }
    const [frontAxle,rearAxle]=rings.map(b=>mid(b,'z'));
    for(const len of lenses){
      send('len',len);
      const denied=id==='dacia'&&h===.70&&len===1.95;
      if(denied){
        // Through the UI, command the real maximum extension unloaded/flush
        // (already measured on this car above). At raised stroke its tyre
        // intersects the crosshead. The proposed comparison still reports
        // both sets of end margins, but must not render that penetration.
        const r=V.lastRefusal();check(r?.proposal.len===len&&r.proposal.h===h&&r.fit.car.by==='tyre'&&r.fit.car.tyreGap<0&&r.fit.car.max===0,'wheel interference not refused');
        near(S().len,1.75,'accepted slider preserved');near(+input.value,1.75,'accepted UI');
        check(text('warning').includes('1,950 m')&&text('comparison').includes('platforme 1,950 m')&&text('clear').includes('lungime platforme 1,750 m'),'attempt/accepted lengths mixed');
        near(r.fit.pair.dacia.padFront,.4305,'refused Dacia front');near(r.fit.pair.mercedes.padRear,.1305,'refused Mercedes rear');
        check(JSON.stringify(car.matrixWorld.toArray())===JSON.stringify(pose)&&pitSnapshot()===pit0,'refusal moved scene');
        D.loaded.push({id,len,h,refused:true,accepted:S(),pair:r.fit.pair});continue;
      }
      near(S().len,len,'loaded length');check(!V.lastRefusal(),'unexpected refusal '+text('warning'));
      check(JSON.stringify(car.matrixWorld.toArray())===JSON.stringify(pose)&&JSON.stringify(bounds(pan))===JSON.stringify(panBox),'car moved or stretched');
      check(pitSnapshot()===pit0,'well moved under load');const card=V.fit().pair[id];
      for(const s of [false,true]){
        const a=bounds(deck('platform',s)),b=bounds(deck('sliding crosshead',s));
        const pads=parts(lift,'rubber pad').filter(m=>(m.position.x>0)===s&&m.visible).map(bounds).sort((v,w)=>v.min.z-w.min.z);
        check(pads.length===2,'missing actual contacts');
        near(mid(pads[0],'z'),S().z-.61,'front pad slipped');near(mid(pads[1],'z'),S().z+.61,'rear pad slipped');
        for(const p of pads){
          near(p.max.z-p.min.z,.169,'pad depth');near(p.max.x-p.min.x,.145,'pad width');
          near(p.min.y,a.max.y,'pad grounded to fixed steel');
          check(p.min.z>=a.min.z&&p.max.z<=a.max.z&&p.min.x>=a.min.x&&p.max.x<=a.max.x,'pad unsupported on fixed steel');
          near(Math.min(p.min.x-panBox.min.x,panBox.max.x-p.max.x),card.panEdge,'lateral pan margin');
          near(panBox.min.y-p.max.y,card.verticalPadGap,'underbody elevation');
        }
        const front=pads[0].min.z-b.min.z,rear=a.max.z-pads[1].max.z;
        near(front,.0305+len-1.55,'signed front');near(rear,.1305,'signed rear');
        check(Math.min(front,rear)>=.025,'longitudinal display reserve insufficient');
        near(card.padFront,front,'measured vs reported front');near(card.padRear,rear,'reported rear');
        near(card.axleOutside[0],b.min.z-frontAxle,'front tyre vs end');near(card.axleOutside[1],rearAxle-a.max.z,'rear tyre vs end');
        const column=1+ids.indexOf(id);
        check(printedRow('Tampon → capăt').cells[column].textContent===[front,rear].map(v=>ro(v*1000,1)).join(' / '),'pad UI row');
        check(printedRow('Axe dincolo').cells[column].textContent===card.axleOutside.map(v=>ro(v,3)).join(' / '),'axle UI row');
      }
      check(printedRow('Tampon → capăt').cells[1].textContent===printedRow('Tampon → capăt').cells[2].textContent,'same provisional pad basis expected');
      check(text('comparison').includes('platforme '+ro(len,3)+' m')&&text('leno')===ro(len,3)+' m','common length missing');
      if(len===1.75){
        near(card.limits.closed.max,1.80,'preserved default closed-door limit');
        near(card.limits.open.max,id==='dacia'?1.10:.96,'preserved default open-door limit');
      }
      if(h===0&&len===1.95&&id==='dacia'){
        // Independent actual-tyre witness, 0.5 mm inside the front edge.
        const n=bounds(deck('sliding crosshead',true)),x=S().x+.70,z=n.min.z+.0005;
        const hit=ray([x,n.max.y,z],[0,1,0],tyre)[0];
        check(hit&&hit.distance<.025&&Math.abs(card.tyreGap-hit.distance)<.001,'at-rest tyre/crosshead witness');
        send('h',.70);const r=V.lastRefusal();
        check(r?.fit.car.by==='tyre'&&r.fit.car.tyreGap<0&&r.fit.car.max===0&&S().len===len&&S().h===0,'actuating up through tyre');
        const rubberTop=bounds(parts(lift,'rubber pad')[0]).max.y;
        near(r.fit.car.tyreGap,card.tyreGap-(panBox.min.y-rubberTop),'rigid pad-pickup tyre gap');
      }
      D.loaded.push({id,len,h,x:car.position.x,z:car.position.z,bodyY:car.position.y,
        pad:[card.padFront,card.padRear],axle:card.axleOutside,fixed:card.fixedFrontReserve,lateral:card.panEdge});
    }
  }
  if(id==='dacia'){
    send('car','mercedes');
    check(S().id==='mercedes'&&S().len===1.75&&V.lastRefusal()?.proposal.len===1.95&&
      text('comparison').includes('propunere refuzată'),'swapping car lost length-only refusal');
  }
}
// Obstruction refusal at a non-default length, alternate model at accepted
// pose, X/Z edits, door controls and external fit do NOT erase the new datum.
send('h',0);send('door','open');send('h',1.80);
check(S().h===0&&V.lastRefusal()?.proposal.len===1.95&&text('warning').includes('1,950 m')&&text('comparison').includes('propunere refuzată'),
  'refusal omitted or detached from the proposed length');
send('car','dacia');check(S().id==='dacia'&&text('comparison').includes('cursă 1,800 m · platforme 1,950 m'),'lost refused proposal on toggle');
$('v-reset').click();check(!V.lastRefusal()&&S().len===1.75&&+input.value===1.75&&S().loc==='bay'&&!S().ac&&!V.fit().open,'reset did not clear refusal / restore defaults');
send('x',-3.65);send('z',8.05);send('len',1.55);
near(bounds(deck('platform',true)).max.z,8.05+.825,'shifted datum');near(G.lift.position.x,-3.65,'shifted axis');
check(!surfaces(-3.65+.675,8.05+.2).some(hit=>hit.object===slab||hit.object===pad),'slab/turf inside shifted well');
check(surfaces(-3.90-.675-.14,7.8+.21)[0].object===slab,'old well not closed on axis move');
send('bay','center');send('car','mercedes');send('ac','on');
check(S().id==='mercedes'&&S().bay==='center'&&S().ac,'inherited selectors refused');
send('ach',.50);check(S().ach===.225&&V.lastRefusal()?.fit.trailer.entry<0&&text('warning').includes('1,550 m'),'AC refusal at adjusted length');
check(text('clear').includes('22,5 mm')&&text('clear').includes('adaptoarele reale'),'support warnings lost');
$('v-reset').click();near(S().len,1.75,'final reset');D.reset=S();
