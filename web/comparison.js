const vehicleStudy=(()=>{
  const spec=data.vehicles,L=spec.lift,C=data.comparison,margin=L.study_margin;
  const group=n=>model.children.find(g=>g.userData.name.startsWith(n));
  const G=Object.fromEntries(model.children.filter(g=>g.userData.vehicle).map(g=>[g.userData.vehicle,g]));
  const annex=group('Attached annex'),ports=group('Detached two-car'),slabParking=group('Site paving and terrace').children[0];
  const paint=group('Annex · painted'),bench=group('BROR workbench'),divider=group('Long divider');
  const panel=annex.children.find(m=>m.userData.part.door?.kind==='garage'),sideLeaves=annex.children.filter(m=>m!==panel&&m.userData.part.door);
  const stores=ports.children.filter(m=>m.userData.part.door),all=o=>[o,...o.children],box=o=>new T.Box3().setFromObject(o,true);
  const tr=VFit.triangles,tree=objs=>VFit.tree(tr(objs)),meshTree=ts=>VFit.tree(ts.slice()),gap=(a,b)=>VFit.nearest(a,b).m;
  const defaults={x:L.x,z:L.z,h:0,loc:'bay',id:'dacia',bay:'original',ac:false,ach:C.trailer.acHeight};
  const st={...defaults},state=()=>({...st}),pose=(g,p,yaw)=>{g.position.fromArray(p);g.rotation.y=yaw;g.updateWorldMatrix(true,true);};
  const carMeshes={dacia:[...G.car.children],mercedes:C.mercedesParts.map(make)},acMeshes=C.acParts.map(make);
  const shape=Object.fromEntries(Object.entries(carMeshes).map(([k,v])=>[k,tr(v)]));
  const sels=Object.keys(shape);
  const bayPos=b=>b==='original'?spec.carport.car:C.centeredBay,rise=(id,h)=>Math.max(0,h+L.pad-C.cars[id].pickup);
  function carPose(){
    if(G.car.children[0]!==carMeshes[st.id][0]){
      G.car.clear();G.car.add(...carMeshes[st.id]);
      for(const m of G.car.children)m.material=finishes(m.userData.part,$('finish').checked);
    }
    G.car.userData.name=C.cars[st.id].name;
    pose(G.car,st.loc==='bay'?bayPos(st.bay):[st.x,L.floor+rise(st.id,st.h),st.z],st.loc==='bay'?Math.PI/2:Math.PI);
  }
  function trailerPose(){
    for(const m of acMeshes){
      if(st.ac){
        if(m.parent!==G.trailer)G.trailer.add(m);
        m.position.set(0,C.trailer.skin,C.trailer.acZ);m.scale.y=st.ach/C.trailer.acHeight;
        m.material=finishes(m.userData.part,$('finish').checked);
      }else m.removeFromParent();
    }
    pose(G.trailer,spec.carport.trailer,Math.PI/2);
  }
  /* EXISTING LIFT */
  const paving=box(slabParking);CFit.cutGround(pad,paving);
  // A joint is a material mark, not an overlay slab or a change in elevation.
  function pave(base){
    const mat=base.clone(),prior=base.onBeforeCompile.bind(base);
    mat.onBeforeCompile=(sh,r)=>{
      prior(sh,r);sh.vertexShader='varying vec2 vBayP;\n'+sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\nvBayP=(modelMatrix*vec4(transformed,1.)).xz;');
      sh.fragmentShader='varying vec2 vBayP;\n'+sh.fragmentShader.replace('#include <color_fragment>',
        `#include <color_fragment>
         vec2 p=(vBayP-vec2(-19.30,-6.0))/vec2(.82,.48); p.x+=.5*mod(floor(p.y),2.);
         vec2 d=abs(fract(p+.5)-.5), aa=max(fwidth(vBayP)/vec2(.82,.48),vec2(.0001));
         vec2 l=1.-smoothstep(vec2(0.),aa+.006,d);
         diffuseColor.rgb*=1.-.21*max(l.x,l.y);`);
    };mat.customProgramCacheKey=()=>base.customProgramCacheKey()+'-short-bay-joints';return mat;
  }
  slabParking.userData.pitMaterials=[false,true].map(f=>pave(finishes(slabParking.userData.part,f)));
  slabParking.material=slabParking.userData.pitMaterials[Number($('finish').checked)];
  const roofObjs=ports.children.slice(7,21).concat(group('Carport roof').children),roofs=tr(roofObjs),entry=box(ports.children[20]).min.y,
    shortRear=box(ports.children[21]).max.x,shortLeft=box(ports.children[21]).min.z,shortRight=box(ports.children[4]).min.z,
    posts=tree(ports.children.slice(0,7)),screens=tree(model.children.filter(g=>g.userData.name.startsWith('Carport ·')).flatMap(g=>g.children));
  const ceiling=tr(paint.children.filter(m=>m.userData.part.overhead)),jambs=[4,5].map(i=>box(annex.children[i]));
  const arrays={
    bench:bench.children,divider:divider.children,wall:[...annex.children.filter(m=>!m.userData.part.door&&!m.userData.part.slab&&!m.userData.part.walkable),
      ...group('Annex and living projection').children,...group('Workshop · practical').children,...paint.children.filter(m=>!m.userData.part.overhead)]
  };
  const sets={},collisionBoxes=[];
  for(const [k,objs] of Object.entries(arrays)){sets[k]=tree(objs);for(const m of objs)collisionBoxes.push([k,box(m)]);}
  const names={paint:'plafon vopsit în pantă',door:'panou secțional',bench:'banc',divider:'separator',wall:'pereți / rame',pit:'cuve lângă mobilier',
    inside:'capătul boxei atelierului',nominal:'cursă nominală',side:'ușa pietonală',lift:'platforme'};
  const shut=box(panel);panel.userData.toggle(null);const opened=box(panel);panel.userData.toggle(null);
  const bend=shut.clone();bend.min.y=shut.max.y-.31;bend.max.y=shut.max.y+.05;bend.max.z+=.31;
  const sectionSweep=[shut,opened,bend];
  // The side jamb returns project farther into the room than the leaf.
  // Don't shrink the room between the jambs where the bumpers actually sit.
  const fore=shut.max.z,aft=box(annex.children[29]).min.z;
  let message='',rejected=null,proposal=null,fit={},cacheKey='',baselines,parkKey='',parked,storeTree,leafTree;
  let solids=[],activeBoxes=[];
  function syncSolids(){
    activeBoxes=[];
    for(const m of [...G.car.children,...G.trailer.children,...moving.filter(m=>m.visible)]){
      const b=box(m);activeBoxes.push({b,group:m.parent,low:b.min.y,top:b.max.y,
        distance(x,z){return Math.hypot(Math.max(b.min.x-x,0,x-b.max.x),Math.max(b.min.z-z,0,z-b.max.z));}});
    }
    for(const s of [-1,1])if(st.h>.018)activeBoxes.push({group:G.lift,low:L.floor,top:L.floor+.27,
      distance(x,z){return Math.hypot(Math.max(0,Math.abs(x-st.x-s*.675)-.287),Math.max(0,Math.abs(z-st.z)-.887));}});
    const old=new Set(solids);space.solids=space.solids.filter(o=>!old.has(o));space.solids.push(...activeBoxes);solids=activeBoxes;
  }
  const occupied=()=>walking&&activeBoxes.some(o=>o.low<feet.y+WALK_BODY.head&&o.top>feet.y+.018&&o.distance(feet.x,feet.z)<.17);
  function bayRead(){
    const key=[st.bay,st.ac,st.ach,...stores.map(o=>!!o.userData.open)].join('/');
    if(key===parkKey)return parked;
    const [x,y,z]=bayPos(st.bay),tt=tr(G.trailer.children),bt=meshTree(tt);
    storeTree=tree(ports.children.slice(21).flatMap(all));
    function measure(ts,t){
      const h=VFit.vertical(ts,roofs),b=t.b;
      return {up:h.m,at:h.at,entry:entry-b.max.y,post:gap(t,posts),store:gap(t,storeTree),
        screen:gap(t,screens),slab:Math.min(b.min.x-paving.min.x,paving.max.x-b.max.x,b.min.z-paving.min.z,paving.max.z-b.max.z)};
    }
    const cars={};
    for(const id of sels){
      const ts=CFit.move(shape[id],x,y,z,false),t=meshTree(ts),b=t.b;
      const f=cars[id]={...measure(ts,t),pair:gap(t,bt),front:paving.max.x-b.max.x,rear:b.min.x-shortRear,
        left:b.min.z-shortLeft,right:shortRight-b.max.z};
      f.min=Math.min(...['up','entry','post','store','screen','pair','front','rear','left','right'].map(k=>f[k]));
    }
    parkKey=key;return parked={cars,trailer:{...measure(tt,bt),height:bt.b.max.y-bt.b.min.y}};
  }
  // Fixed X/Z, rigid vertical motion: the first obstructed stroke, never a
  // possibly clear endpoint on the far side of a shelf. The panel model uses
  // its real ribbed endpoint bounds; no invented manufacturer track.
  function baseline(id,x,z){
    const ts=CFit.move(shape[id],x,L.floor,z,true),ct=meshTree(ts),b=ct.b;
    const head=VFit.vertical(ts,ceiling),contact=C.cars[id].pickup-L.pad;
    const rows=[[L.stroke,'nominal']];
    function limit(k,d){rows.push([d<0?-1:d+contact,k]);}
    limit('paint',head.m-margin/Math.abs(head.hit?ceiling.find(t=>t.object===head.hit).t.getNormal(new T.Vector3()).y:1));
    for(const [k,bb] of [...collisionBoxes,...sideLeaves.flatMap(m=>all(m).map(obj=>['side',box(obj)]))])
      limit(k,CFit.firstRise(ts,bb,margin));
    const recess=staticLift.reduce((bounds,m)=>bounds.union(box(m)),new T.Box3());
    const pitClear=Math.min(recess.min.x-sets.bench.b.max.x,sets.divider.b.min.x-recess.max.x);
    if(pitClear<margin)rows.push([-1,'pit']);
    const ends=[b.min.z-fore,aft-b.max.z];if(Math.min(...ends)<margin)rows.push([-1,'inside']);
    function cap(bb){
      const d=CFit.firstRise(ts,bb,margin),[first,by]=[...rows,[d<0?-1:d+contact,'door']].sort((a,b)=>a[0]-b[0])[0];
      return {max:first<0?null:Math.floor((first+1e-9)*100)/100,by};
    }
    const limits={closed:cap(shut),open:cap(opened)};
    return {ts,ct,paint:head.m,paintAt:head.at,contact,ends,pitClear,limits,...limits[panel.userData.open?'open':'closed'],
      approachSides:[b.min.x-jambs[0].max.x,jambs[1].min.x-b.max.x]};
  }
  const panelSet=()=>tree(all(panel));
  function readPair(x,z,h){
    const key=[x,z,!!panel.userData.open,...sideLeaves.map(o=>!!o.userData.open)].join('/');
    if(cacheKey!==key){
      baselines={};for(const id of sels)baselines[id]=baseline(id,x,z);
      baselines.doorSet=panelSet();baselines.doorTr=tr(all(panel));leafTree=tree(sideLeaves.flatMap(all));cacheKey=key;
    }
    const pair={};
    for(const id of sels){
      const f=baselines[id],dy=rise(id,h),ct=dy?VFit.transformed(f.ct,new T.Matrix4().makeTranslation(0,dy,0)):f.ct;
      const car=C.cars[id],padX=.675-.12,padHalf=.145/2,halfPan=car.panWidth/2;
      pair[id]={paint:f.paint-dy,paintAt:f.paintAt?.map((v,i)=>v+(i===1?dy:0)),doorAbove:panel.userData.open?VFit.vertical(f.ts,baselines.doorTr).m-dy:Infinity,
        door:gap(ct,baselines.doorSet),bench:gap(ct,sets.bench),divider:gap(ct,sets.divider),wall:Math.min(gap(ct,sets.wall),gap(ct,leafTree)),
        ends:f.ends,approachSides:f.approachSides,max:f.max,by:f.by,limits:f.limits,pitClear:f.pitClear,rise:dy,panEdge:halfPan-(padX+padHalf),
        padOverlap:Math.max(0,Math.min(halfPan,padX+padHalf)-(padX-padHalf)),verticalPadGap:Math.max(0,f.contact-h),
        axleOutside:car.axles.map(a=>Math.abs(a)-L.platform_length/2),ok:f.max!==null&&h<=f.max+1e-8};
    }return pair;
  }
  function observe(){
    const pair=readPair(st.x,st.z,st.h),f=pair[st.id],bay=bayRead(),lt=tr(moving.filter(m=>m.visible)),t=meshTree(lt);
    fit={pair,car:st.loc==='lift'?f:null,carport:st.loc==='bay'?bay.cars[st.id]:null,bays:bay.cars,trailer:bay.trailer,
      approachSides:f.approachSides,open:!!panel.userData.open,pitClear:f.pitClear,
      lift:{paint:VFit.vertical(lt,ceiling).m,door:gap(t,baselines.doorSet),bench:gap(t,sets.bench),divider:gap(t,sets.divider),wall:gap(t,sets.wall)}};
  }
  function apply(){trailerPose();place();syncSolids();observe();}
  const fmt=n=>Number.isFinite(n)?n.toFixed(3).replace('.',','):'—',label=id=>C.cars[id].name;
  function bad(){
    const c=fit.car,b=fit.carport,t=fit.trailer;
    if(Math.min(t.entry,t.up)<margin)return `rulotă ${fmt(t.height)} m, traversă ${fmt(t.entry)} m, în repaus ${fmt(t.up)} m`;
    if(b&&b.min<margin)return `boxă scurtă: față ${fmt(b.front)} / spate ${fmt(b.rear)} m, lateral ${fmt(b.left)} / ${fmt(b.right)} m. Selectați explicit amplasamentul alternativ sau garajul`;
    if(c&&!c.ok)return `${label(st.id)} · ${names[c.by]}; maxim de la repaus ${fmt(c.max)} m`;
    if(fit.pitClear<margin||Math.min(...Object.values(fit.lift))<margin)return 'cuve / platforme prea aproape de amenajarea atelierului';
    if(occupied())return 'eliberați zona ocupată de pieton';
    return '';
  }
  function change(next){
    const last=state(),prior=proposal,priorRefusal=rejected;message='';rejected=null;proposal=null;Object.assign(st,next);apply();
    const why=bad();
    if(why){
      rejected={proposal:state(),fit};proposal={state:state(),pair:fit.pair,bays:fit.bays,trailer:fit.trailer};
      message=`Poziție refuzată: ${why}. Scena păstrează poziția anterioară.`;
      Object.assign(st,last);apply();
    }else if(next.id&&prior&&['x','z','h'].some(k=>prior.state[k]!==st[k])){
      // Switching the visible model at the accepted pose must NOT erase a
      // failed common stroke/axis comparison or jump to the rejected centre.
      proposal=prior;rejected=priorRefusal;message='Mașină schimbată la poziția acceptată. Tabelul păstrează propunerea comună refuzată; scena nu a fost mutată.';
    }
    display();renderer.shadowMap.needsUpdate=true;draw();return !why;
  }
  // The closed leaf, parked leaf (with ribs) and conservative elbow prism
  // cover the sectional surface's assumed travel. Also protect the walker.
  const togglePanel=panel.userData.toggle;
  panel.userData.toggle=pos=>{
    const load=tr([...moving.filter(m=>m.visible),...(st.loc==='lift'?G.car.children:[])]);
    const person=pos&&new T.Box3(new T.Vector3(pos.x-.17,pos.y+.018,pos.z-.17),new T.Vector3(pos.x+.17,pos.y+WALK_BODY.head,pos.z+.17));
    if(sectionSweep.some(b=>CFit.firstRise(load,b,margin)<=0||person&&person.intersectsBox(b))){
      message='Ușa oprită: gabarit insuficient pe cursa panoului sau în zona cotului estimat.';display();return false;
    }
    if(!togglePanel(pos)){message='Ușa oprită: eliberați golul.';display();return false;}
    rejected=null;proposal=null;message='';observe();display();renderer.shadowMap.needsUpdate=true;draw();return true;
  };
  for(const leaf of [...stores,...sideLeaves]){
    const toggle=leaf.userData.toggle;
    leaf.userData.toggle=pos=>{
      if(!toggle(pos))return false;observe();
      if(bad()){toggle(null);observe();message='Ușă oprită: zona este ocupată.';display();return false;}
      rejected=null;proposal=null;message='';display();return true;
    };
  }
  function display(){
    const ps=proposal?.state||st,P=proposal?.pair||fit.pair,B=proposal?.bays||fit.bays;
    const opts={car:st.id,location:st.loc,bay:st.bay,ac:st.ac?'on':'off',door:fit.open?'open':'closed'};
    for(const [k,v] of Object.entries(opts))$('v-'+k).value=v;
    for(const k of ['x','z','h','ach']){
      $('v-'+k).value=st[k];$('v-'+k+'o').textContent=fmt(st[k])+' m';
    }$('v-ach').disabled=!st.ac;
    let html='';
    function table(title,rows){
      html+=`<table><caption>${title}</caption><thead><tr><th>Metri, dacă nu se indică altfel</th><th>Dacia</th><th>S 500 L</th></tr></thead><tbody>`;
      for(const [n,fn] of rows)html+=`<tr><th>${n}</th>${sels.map(id=>{
        const v=fn(id,P[id],B[id]);return `<td class="${typeof v==='number'&&v<0?'bad':''}">${typeof v==='number'?fmt(v):v}</td>`;}).join('')}</tr>`;
      html+='</tbody></table>';
    }
    table(`Atelier · ${proposal?'propunere refuzată':'propunere comună'} X ${fmt(ps.x)}, Z ${fmt(ps.z)}, cursă ${fmt(ps.h)} · ușă ${fit.open?'deschisă':'închisă'}`,[
      ['Poziție statică',(_,f)=>f.ok?'încape':'REFUZ'],['Max. · ușă închisă',(_,f)=>f.limits.closed.max===null?'nu încape':f.limits.closed.max],
      ['Max. · ușă deschisă',(_,f)=>f.limits.open.max===null?'nu încape':f.limits.open.max],
      ['Limită',(_,f)=>names[f.by]],['Până la plafon (vertical)',(_,f)=>f.paint],['Până la panou (3D)',(_,f)=>f.door],
      ['Sub panoul deschis',(_,f)=>f.doorAbove],['La banc / separator',(_,f)=>[f.bench,f.divider].map(fmt).join(' / ')],
      ['Perete / ramă (3D)',(_,f)=>f.wall],['Bare față / spate la limite',(_,f)=>f.ends.map(fmt).join(' / ')],
      ['Toc la intrare st. / dr.¹',(_,f)=>f.approachSides.map(fmt).join(' / ')]]);
    table('Sprijin ilustrativ · patru tampoane 0,145 × 0,169',[
      ['Lățime caroserie / oglinzi',id=>[C.cars[id].body,C.cars[id].mirrors].map(fmt).join(' / ')],
      ['Masă DIN / totală (kg)',id=>id==='mercedes'?'2010 / 2660':'neverificată'],
      ['Ampatament',id=>C.cars[id].wheelbase],['Axe în afara platoului 1,75 (sp./față)',(_,f)=>f.axleOutside.map(fmt).join(' / ')],
      ['Lățime tampon sub planșeul proxy',(_,f)=>f.padOverlap],['Rezervă laterală pe planșeu²',(_,f)=>f.panEdge],
      ['Gol vertical tampon–proxy',(_,f)=>f.verticalPadGap],['Caroserie ridicată',(_,f)=>f.rise]]);
    table(`Carport · 5,450 m · X ${fmt(bayPos(ps.bay)[0])} / Z ${fmt(bayPos(ps.bay)[2])}`,[
      ['Poziție statică',(_,f,b)=>b.min>=margin?'încape':'REFUZ'],
      ['Arc R 4,50 din X −5,70¹',id=>id==='dacia'?'trece':ps.bay==='center'?'CONTACT':'depășire'],
      ['Bară față / margine',(_,f,b)=>b.front],['Bară spate / magazie',(_,f,b)=>b.rear],
      ['Oglinzi spre boxă / stâlpi',(_,f,b)=>[b.left,b.right].map(fmt).join(' / ')],['Distanță la rulotă',(_,f,b)=>b.pair],
      ['Traversă / plafon parcat',(_,f,b)=>[b.entry,b.up].map(fmt).join(' / ')],['La magazie / stâlp (3D)',(_,f,b)=>[b.store,b.post].map(fmt).join(' / ')]]);
    $('v-comparison').innerHTML=html;
    $('v-trials').textContent=(ps.bay==='center'?
      'Centru alternativ comun: cu rulota parcată, pe arcul din X −5,70 m, Dacia trece la aproximativ 0,058 m; S 500 L atinge structura carportului, deși încape în repaus. Pe arcul separat din X −4,50 m, S 500 L ajunge la același centru: aproximativ 0,045 m până la obstacol și 0,280 m până la limita pavajului. '+
      'Deschiderea completă a ușilor magaziilor tehnică / grădină: cel puțin 0,576 / 1,388 m pentru ansamblul cu Dacia și 0,191 / 0,962 m cu S 500 L. Pietonul intră în magazia tehnică din culoarul rulotei; pentru magazia de grădină ocolește pe la bara din față. Cei 0,119 m rămași în spatele Mercedesului nu sunt pasaj. ':
      'Centru inițial: cu rulota parcată, Dacia trece pe arcul din X −5,70 m, cu circa 0,224 m până la obstacol și 0,456 m la marginea pavajului. La ambele vehicule parcate, baleiajul complet al magaziilor tehnică / grădină păstrează cel puțin 0,576 / 1,799 m. Mercedesul depășește pavajul cu 0,257 m; nu există probă de acces valabilă la această poziție. ')+
      'La axul inițial al atelierului (X −3,90), proba separată pe rampă cu panoul deschis: minim 0,215 m pentru Dacia, 0,060 m pentru S 500 L. Nu se extrapolează la alte axe.';
    $('v-clear').textContent=`Scenă: ${label(st.id)}, ${st.loc==='bay'?'carport':'atelier'}, ax elevator ${fmt(st.x)} / ${fmt(st.z)}, cursă reală ${fmt(st.h)} m. `+
      `Cuve–mobilier ${fmt(fit.pitClear)} m. ¹ Oglinzi desfășurate; accesul cere ușa deschisă și nu dovedește virajul. `+
      `² Negativ = o parte din tampon depășește planșeul simplificat. Centrele tampoanelor: ecart 1,110 m × 1,220 m longitudinal. `+
      `Tampon pe platou: 0,083 m la marginea interioară / 0,323 m la cea exterioară; la capăt 0,081–0,281 m (aici 0,181 m). Puncte portante reale necunoscute pentru ambele.`;
    const t=fit.trailer;
    $('v-trailer').textContent=`Înălțime totală ${fmt(t.height)} m (Δ ${fmt(t.height-C.trailer.factory)} m față de catalogul 2,570). `+
      `Traversă ${fmt(t.entry)} m; deasupra în repaus ${fmt(t.up)} m; stâlp ${fmt(t.post)} m; magazie ${fmt(t.store)} m. `+
      `Corp 5,35 m, cu proțap 6,71 m; lățime 2,32 m. Piele estimată sub AC ${fmt(C.trailer.skin)} m; coama din spate rămâne la 2,570 m. `+
      `AC FJX4 2200: lățime 0,702 × lungime 0,752 × înălțime nominală 0,225 m. Fără AC rămân nominal 0,240 m la intrare, nu o garanție pentru exemplarul dvs.`;
    $('v-warning').textContent=message||(Math.min(...fit.approachSides)<margin?'Intrare nefezabilă drept pe acest ax. Poziția statică nu dovedește accesul.':
      'Comparația folosește același ax și aceeași cerere pentru ambele mașini. Valorile negative indică depășiri.');
  }
  for(const k of ['x','z','h','ach'])$('v-'+k).oninput=e=>change({[k]:Number(e.target.value)});
  for(const [k,id] of [['car','id'],['location','loc'],['bay','bay']])$('v-'+k).onchange=e=>change({[id]:e.target.value});
  $('v-ac').onchange=e=>change({ac:e.target.value==='on'});
  $('v-door').onchange=e=>{if((e.target.value==='open')!==!!panel.userData.open)panel.userData.toggle(walking?feet:null);};
  $('v-reset').onclick=()=>{if(change(defaults)&&panel.userData.open)panel.userData.toggle(walking?feet:null);};
  for(const [id,bay] of [['v-bay-view',true],['v-lift-view',false]])$(id).onclick=()=>{
    if(walking){message='Ieșiți din mers pentru o vedere de ansamblu.';display();return;}
    $('level').value='0';refresh();
    target.set(...(bay?[-14.90,.49,-2.82]:[st.x,.46+(st.loc==='lift'?rise(st.id,st.h)*.65:0),st.z]));
    yaw=bay?1.20:-.47;pitch=bay?.38:1.02;distance=(bay?10.8:7.8)/Math.min(1,camera.aspect);update();
  };
  for(const item of [...spec.references,...C.sources]){
    const a=document.createElement('a');a.href=item.url;a.textContent=item.name;a.target='_blank';a.rel='noopener noreferrer';
    $('v-sources').append(a,document.createElement('br'));
  }
  for(const k of ['v_chrome','v_wheel','v_platform','v_silver','c_blue'])Object.assign(material(k,true),{roughness:.40,metalness:.40});
  for(const k of ['v_glass','v_camperglass','c_glass','v_lamp'])Object.assign(material(k,true),{roughness:.19,metalness:.15});
  $('status').textContent='House · comparație de gabarit';apply();display();renderer.shadowMap.needsUpdate=true;draw();
  return {state,fit:()=>fit,lastRefusal:()=>rejected,groups:G,roofObjs};
})();
