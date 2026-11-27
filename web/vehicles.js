const vehicleStudy=(()=>{
  const spec=data.vehicles, L=spec.lift,G={};
  for(const g of model.children)if(g.userData.vehicle)G[g.userData.vehicle]=g;
  const group=name=>model.children.find(g=>g.userData.name.startsWith(name));
  const ports=group('Detached two-car'), canopy=group('Carport roof'), annex=group('Attached annex'),
        paint=group('Annex · painted'),bench=group('BROR workbench'),divider=group('Long divider'),
        panel=annex.children.find(m=>m.userData.part.door?.kind==='garage');
  const lip=group('Annex and living projection');
  const tris=VFit.triangles, tree=o=>VFit.tree(tris(o)), name=o=>o?.userData.part?.component||o?.parent?.userData?.name||'—';
  const meshTree=o=>VFit.tree(o.slice());
  const st={x:L.x,z:L.z,h:0,loc:'bay'}, margin=L.study_margin;
  let fit={},message='',rejected=null;
  const state=()=>({...st}), pose=(g,p,yaw)=>{g.position.fromArray(p);g.rotation.y=yaw;g.updateWorldMatrix(true,true);};
  pose(G.trailer,spec.carport.trailer,Math.PI/2);
  function carPose(){
    const rise=st.loc==='lift'?Math.max(0,st.h+L.pad-L.pickup_above_ground):0;
    pose(G.car,st.loc==='bay'?spec.carport.car:[st.x,L.floor+rise,st.z],st.loc==='bay'?Math.PI/2:Math.PI);
  }
  const pit={x:{value:st.x},z:{value:st.z}};
  function mask(base){
    const m=base.clone(),prior=base.onBeforeCompile.bind(base);
    m.onBeforeCompile=(sh,r)=>{
      prior(sh,r);sh.uniforms.vPitX=pit.x;sh.uniforms.vPitZ=pit.z;
      sh.vertexShader='varying vec2 vStudyXZ;\n'+sh.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\nvStudyXZ=(modelMatrix*vec4(transformed,1.)).xz;');
      sh.fragmentShader='varying vec2 vStudyXZ; uniform float vPitX,vPitZ;\n'+sh.fragmentShader.replace(
        '#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif(abs(abs(vStudyXZ.x-vPitX)-.675)<.287 && abs(vStudyXZ.y-vPitZ)<.887)discard;');
    };
    m.customProgramCacheKey=()=>base.customProgramCacheKey()+'-study-recess';return m;
  }
  const slab=annex.children.find(o=>o.userData.part.slab);
  slab.userData.pitMaterials=[false,true].map(f=>mask(finishes(slab.userData.part,f)));
  slab.material=slab.userData.pitMaterials[Number($('finish').checked)];pad.material=mask(pad.material);
  const liftParts=[],moving=[], staticLift=[];
  function part(id,slot,w,h,d,fx,{functional=true}={}){
    const p={component:id,slot,box:[0,0,0],size:[w,h,d]},m=make(p);
    G.lift.add(m);liftParts.push(m);
    (functional?moving:staticLift).push(m);
    m.userData.place=fx;return m;
  }
  for(const s of [-1,1]){
    const x=s*(L.platform_gap+L.platform_width)/2;
    const fixed=(a,b,c)=>m=>m.position.set(a,b,c);
    part('recess floor','v_pit',.575,.012,1.775,fixed(x,-L.embedded-.006,0),{functional:false});
    for(const i of [-1,1]){
      part('recess lining','v_pit',.009,L.embedded,1.774,fixed(x+i*.29,-L.embedded/2,0),{functional:false});
      part('recess lining','v_pit',.576,L.embedded,.009,fixed(x,-L.embedded/2,i*.891),{functional:false});
    }
    part('platform','v_platform',L.platform_width,.060,L.platform_length,m=>m.position.set(x,st.h-.03,0));
    for(const end of [-1,1]){
      part('extendible toe','v_safety',.52,.005,.14,m=>m.position.set(x,st.h-.0025,end*.797));
      part('rubber pad','v_dark',.145,L.pad,.169,m=>{
        m.visible=st.loc==='lift';m.position.set(x-s*.12,st.h+L.pad/2,end*.61);
        m.raycast=m.visible?T.Mesh.prototype.raycast:()=>{};
      });
    }
    const bottom=-.228, arm=1.36;
    for(const rail of [-1,1])for(const k of [0,1])for(const sign of [-1,1]){
      const u=x+rail*.18+sign*.011;
      part('double scissor '+k,'v_graphite',.021,.066,arm,m=>{
        const dy=(st.h-.066-bottom)/2;
        m.rotation.x=-sign*Math.asin(dy/arm);
        m.position.set(u,bottom+dy*(k+.5),0);
      });
      if(sign===1)part('pivot','v_safety',.081,.079,.079,m=>{
        m.position.set(u,bottom+(st.h-.066-bottom)*(k+.5)/2,0);
      });
    }
  }
  function place(){
    carPose();pit.x.value=st.x;pit.z.value=st.z;
    G.lift.position.set(st.x,L.floor,st.z);
    for(const m of liftParts)m.userData.place(m);
    G.lift.updateWorldMatrix(true,true);
  }
  // Reuse the renderer’s live walker. These solids follow both placement and
  // stroke, including the separate drawbar. Flush plates remain traversable.
  const solidBoxes=[];
  for(const g of [G.car,G.trailer,G.lift]){
    const parts=g===G.lift?moving:g.children;
    for(const m of parts){
      const b=new T.Box3(), obj={b,m,group:g,
        get low(){return m.visible?b.min.y:Infinity;},get top(){return b.max.y;},
        distance(x,z){return Math.hypot(Math.max(b.min.x-x,0,x-b.max.x),Math.max(b.min.z-z,0,z-b.max.z));}};
      solidBoxes.push(obj);space.solids.push(obj);
    }
  }
  // Raised platforms expose a recess: don't let feet walk through the edge of
  // the study pit just because the inherited structural support is unmodified.
  for(const s of [-1,1])space.solids.push({group:G.lift,get low(){return st.h>.018?L.floor:Infinity;},
    top:L.floor+.27,distance(x,z){return Math.hypot(Math.max(0,Math.abs(x-st.x-s*.675)-.287),
      Math.max(0,Math.abs(z-st.z)-.887));}});
  function syncBoxes(){for(const o of solidBoxes)o.b.setFromObject(o.m,true);}
  const roofObjs=ports.children.slice(7,21).concat(canopy.children);
  const roofs=tris(roofObjs), posts=tree(ports.children.slice(0,7)), storage=()=>tree(ports.children.slice(21).flatMap(o=>[o,...o.children])),
        screens=tree(model.children.filter(g=>g.userData.name.startsWith('Carport ·')).flatMap(g=>g.children));
  const sideLeaves=annex.children.filter(m=>m.userData.part.door&&m!==panel);
  const ceiling=tris(paint.children.filter(o=>o.userData.part.overhead)), work=tree(bench.children),
        tools=tree(divider.children),walls=tree([...annex.children.filter(m=>!m.userData.part.door&&!m.userData.part.slab&&!m.userData.part.walkable),
          ...lip.children,...group('Workshop · practical').children]);
  const portRoad=group('Site paving and terrace').children[0].geometry;
  portRoad.computeBoundingBox();const paving=portRoad.boundingBox;
  const gap=(t,k)=>VFit.nearest(t,k).m;
  function bayFit(g,store){
    const ts=tris(g.children),t=meshTree(ts),b=t.b,h=VFit.vertical(ts,roofs);
    return {up:h.m,over:name(h.hit),at:h.at,entry:new T.Box3().setFromObject(ports.children[20],true).min.y-b.max.y,
      roof3d:gap(t,meshTree(roofs)),post:gap(t,posts),
      store:gap(t,store),screen:gap(t,screens),
      slab:Math.min(b.min.x-paving.min.x,paving.max.x-b.max.x,b.min.z-paving.min.z,paving.max.z-b.max.z)};
  }
  const trTree=tree(G.trailer.children),storeStart=storage();
  let storeNow=storeStart, trailerFit=bayFit(G.trailer,storeNow),carBay=null;
  const jambs=[4,5].map(i=>new T.Box3().setFromObject(annex.children[i],true));
  const halfWidth=Math.max(...G.car.children.map(m=>{
    m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;return Math.max(Math.abs(b.min.x),Math.abs(b.max.x));
  }));
  function observe(){
    const c=tris(G.car.children),ct=meshTree(c),lt=tree(moving.filter(o=>o.visible));
    const sideTree=tree(sideLeaves.flatMap(m=>[m,...m.children]));
    if(st.loc==='bay'&&!carBay)carBay={...bayFit(G.car,storeNow),pair:gap(ct,trTree)};
    function equipment(ts,t){
      const d=panel.userData.open?VFit.vertical(ts,tris([panel,...panel.children])):{m:Infinity};
      const head=VFit.vertical(ts,ceiling);
      return {paint:head.m,paintAt:head.at,doorAbove:d.m,doorAt:d.at,door:gap(t,tree([panel,...panel.children])),
        bench:gap(t,work),divider:gap(t,tools),wall:Math.min(gap(t,walls),gap(t,sideTree))};
    }
    const ltTr=tris(moving.filter(o=>o.visible)),lift=equipment(ltTr,lt);
    const car=st.loc==='lift'?equipment(c,ct):null;
    // The proposed pit must remain free even with the moving deck above a
    // bench: project the full stationary recess and actual bench/divider onto X.
    const recess=staticLift.reduce((box,m)=>box.union(new T.Box3().setFromObject(m,true)),new T.Box3());
    const pitClear=Math.min(recess.min.x-boundsForBench.max.x,boundsForTools.min.x-recess.max.x);
    const approachSides=[st.x-halfWidth-jambs[0].max.x,jambs[1].min.x-st.x-halfWidth];
    fit={lift,car,pitClear,approachSides,carport:st.loc==='bay'?carBay:null,trailer:trailerFit,open:!!panel.userData.open};
    return fit;
  }
  function minimum(f){return Math.min(f.paint,f.doorAbove,f.door,f.bench,f.divider,f.wall);}
  function constraint(){
    const labels={paint:'plafon în pantă',doorAbove:'sub panoul deschis',door:'panoul ușii',bench:'banc',
                  divider:'separator',wall:'perete / ramă'};
    const rows=[[fit.pitClear,'cuve – mobilier']];
    for(const [f,n] of [[fit.car,'Dacia'],[fit.lift,'platforme']])if(f)for(const k of Object.keys(labels))
      rows.push([f[k],n+' – '+labels[k]]);
    rows.sort((a,b)=>a[0]-b[0]);return rows[0];
  }
  function resetValues(){
    $('v-location').value=st.loc;for(const k of ['x','z','h']){
      $('v-'+k).value=st[k];$('v-'+k+'o').textContent=st[k].toFixed(2)+' m';
    }
    const val=n=>Number.isFinite(n)?Math.max(0,n).toFixed(3)+' m':'—';
    const garage=f=>`plafon ${val(f.paint)}, panou ${val(f.door)}${fit.open?' (vertical '+val(f.doorAbove)+')':''}, banc ${val(f.bench)}, separator ${val(f.divider)}, pereți/rame ${val(f.wall)}`;
    $('v-clear').textContent=`Rulotă: sus în repaus ${val(fit.trailer.up)}, la traversa de intrare ${val(fit.trailer.entry)}, stâlp ${val(fit.trailer.post)}, magazie ${val(fit.trailer.store)}, margine dală ${val(fit.trailer.slab)}. `+
      (fit.carport?`Dacia în carport: sus ${val(fit.carport.up)}, traversă intrare ${val(fit.carport.entry)}, stâlp ${val(fit.carport.post)}, magazie ${val(fit.carport.store)}, dală ${val(fit.carport.slab)}, între vehicule ${val(fit.carport.pair)}. `:`Dacia în garaj: ${garage(fit.car)}. `)+
      `Elevator: ${garage(fit.lift)}. Contur cuve–mobilier ${val(fit.pitClear)}. Intrare drept pe axul propus (st./dr.): ${fit.approachSides.map(n=>n.toFixed(3)+' m').join(' / ')}. Ușă ${fit.open?'deschisă':'închisă'}.`;
    const [clear,what]=constraint();
    $('v-warning').textContent=message||(Math.min(...fit.approachSides)<margin?'Intrare nefezabilă drept pe acest ax: gabaritul lateral la toc nu are rezerva de 25 mm. Poziție statică, nu traseu de conducere.':clear<.10?`Aproape de limită: ${what}, ${val(clear)}.`:
      'Studiu geometric. Rezervă de afișare 25 mm; nu este o distanță de siguranță.');
  }
  function occupancy(){
    if(!walking)return false;
    return solidBoxes.some(o=>o.low<feet.y+WALK_BODY.head&&o.top>feet.y+.018&&o.distance(feet.x,feet.z)<.17)||
      st.h>.018&&feet.y<=L.floor+.018&&Math.abs(feet.z-st.z)<1.057&&Math.abs(Math.abs(feet.x-st.x)-.675)<.457;
  }
  function change(next){
    const last=state();message='';rejected=null;
    Object.assign(st,next);place();syncBoxes();observe();
    if(minimum(fit.lift)<margin||fit.car&&minimum(fit.car)<margin||fit.pitClear<margin||occupancy()){
      const [clear,what]=constraint();
      rejected={proposal:state(),fit};
      message=occupancy()?'Mișcare refuzată: eliberați zona de studiu.':
        `Poziție refuzată: ${what}, ${clear.toFixed(3)} m la propunerea nouă (< 0,025 m). Poziția anterioară păstrată.`;
      Object.assign(st,last);place();syncBoxes();observe();
    }
    resetValues();renderer.shadowMap.needsUpdate=true;draw();
  }
  // Inherited sectional panel travels up at the reveal then parks under its
  // head. Both endpoint solids (including ribs), plus a conservative proposed
  // 300 mm transition zone at the turn. NOT a measured track radius.
  const closedPanel=new T.Box3().setFromObject(panel,true),bend=new T.Mesh(new T.BoxGeometry(
    closedPanel.max.x-closedPanel.min.x,.36,.36));
  bend.position.set((closedPanel.max.x+closedPanel.min.x)/2,closedPanel.max.y-.13,panel.position.z+.13);
  const turnZone=tree([bend]);
  const inherited=panel.userData.toggle;
  panel.userData.toggle=pos=>{
    const previous=!!panel.userData.open;
    if(!inherited(pos))return false;
    observe();const turnGap=Math.min(gap(tree(moving.filter(m=>m.visible)),turnZone),
      st.loc==='lift'?gap(tree(G.car.children),turnZone):Infinity);
    const bad=minimum(fit.lift)<margin||fit.car&&minimum(fit.car)<margin||turnGap<margin;
    if(bad){inherited(null);observe();message='Ușa oprită: gabarit insuficient la panou sau la zona presupusă de schimbare a direcției.';}
    else message='';
    resetValues();return !bad&&previous!==!!panel.userData.open;
  };
  for(const leaf of ports.children.filter(o=>o.userData.part.door)){
    const toggle=leaf.userData.toggle;
    leaf.userData.toggle=pos=>{
      if(!toggle(pos))return false;
      storeNow=storage();trailerFit=bayFit(G.trailer,storeNow);carBay=null;
      observe();resetValues();return true;
    };
  }
  for(const leaf of sideLeaves){
    const toggle=leaf.userData.toggle;leaf.userData.toggle=pos=>{
      if(!toggle(pos))return false;observe();resetValues();return true;
    };
  }
  for(const k of ['x','z','h'])$('v-'+k).oninput=e=>change({[k]:Number(e.target.value)});
  $('v-location').onchange=e=>change({loc:e.target.value});
  $('v-reset').onclick=()=>change({x:L.x,z:L.z,h:0,loc:'bay'});
  const boundsForBench=work.b,boundsForTools=tools.b;
  for(const [id,bay] of [['v-bay-view',true],['v-lift-view',false]])$(id).onclick=()=>{
    if(walking){message='Ieșiți din mers pentru o vedere de ansamblu.';resetValues();return;}
    $('level').value='0';refresh();target.set(...(bay?[-14.85,.81,-2.9]:[st.x,.54,st.z]));
    yaw=bay?1.20:-.47;pitch=bay?.38:1.00;distance=(bay?10.8:7.5)/Math.min(1,camera.aspect);update();
  };
  for(const item of spec.references){
    const a=document.createElement('a');a.href=item.url;a.textContent=item.name;a.target='_blank';a.rel='noopener noreferrer';
    $('v-sources').append(a,document.createElement('br'));
  }
  for(const key of ['v_chrome','v_wheel','v_platform','v_silver'])Object.assign(material(key,true),{roughness:.46,metalness:.46});
  for(const key of ['v_glass','v_camperglass','v_lamp'])Object.assign(material(key,true),{roughness:.19,metalness:.13});
  $('status').textContent='House · studiu vehicule';
  place();syncBoxes();observe();resetValues();renderer.shadowMap.needsUpdate=true;draw();
  return {state,fit:()=>fit,lastRefusal:()=>rejected,groups:G,roofObjs};
})();
