(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = JSON.parse($('scene-data').textContent);
  const error = msg => { $('error').textContent = msg; $('error').hidden = false; };
  $('title').textContent = data.title;
  const furnished = data.groups.some(g => g.furniture);
  function itemDetails(g, container) {
    const cm=n=>Number((n*100).toFixed(2)), [w,h,d]=g.size;
    container.textContent=[g.use, `${cm(w)} × ${cm(d)} × ${cm(h)} cm`, g.sku && `Art. ${g.sku}`].filter(Boolean).join(' · ');
    if(g.product){
      const link=document.createElement('a'); link.href=g.product; link.target='_blank'; link.rel='noopener noreferrer';
      link.textContent=g.product.startsWith('https://www.ikea.com/ro/ro/')?'IKEA Romania':'Product reference';
      container.append(' · ',link);
    }else if(!g.sku && g.name.includes('PROXY'))container.append(' · Generic concept; not a retailer SKU');
    if(g.note)container.append(`. ${g.note}`);
  }
  if(furnished){
    const rooms=new Map();
    for(const g of data.groups.filter(g=>g.furniture)){
      const room=g.room||data.levels[g.level];
      if(!rooms.has(room)){
        const title=document.createElement('h3'),list=document.createElement('ul');
        title.textContent=room; $('inventory-list').append(title,list); rooms.set(room,list);
      }
      const li=document.createElement('li'),name=document.createElement('b'),details=document.createElement('div');
      name.textContent=g.name; itemDetails(g,details); li.append(name,details); rooms.get(room).append(li);
    }
    $('inventory-button').hidden=false; $('inventory-button').onclick=()=>dialog('inventory');
    $('selection').textContent='Furnished overview'; $('reference').textContent='Select furniture for dimensions and sources, or a building element for its drawing references.';
    $('brief-heading').textContent='Revise the furnishing'; $('brief-status').textContent='The placed layer is available above. A new request does not change it.';
  }
  $('status').textContent = furnished ? 'Furnished concept' : 'Unfurnished concept';
  $('revision').textContent = data.hash.slice(0, 10);
  for (const text of data.notes) {
    const li = document.createElement('li'); li.textContent = text; $('noteList').append(li);
  }
  for (const cr of data.credits) {
    const p = document.createElement('p'), a = document.createElement('a');
    a.href = cr.source; a.textContent = cr.title || new URL(cr.source).pathname.split('/').pop();
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    p.append(a, ` · ${cr.license}${cr.author ? ' · '+cr.author : ''} · adapted for visualization`);
    $('credits').append(p);
  }
  $('credits').append('Rendering engine: Three.js (MIT).');
  let brief=null;
  function dialog(which) {
    for(const id of ['notes','preferences','handoff','inventory'])$(id).hidden=id!==which;
    if(!$('drawer').open)$('drawer').showModal();
  }
  $('review').onclick = () => dialog('notes');
  $('brief').onclick = () => dialog(brief?'handoff':'preferences');
  $('edit-request').onclick=()=>dialog('preferences');
  $('preferences').onsubmit = ev => {
    ev.preventDefault();
    const retailer = $('retailer').value.trim(), style = $('style').value.trim();
    if (!retailer && !style) { $('notice').textContent = 'Enter a retailer or a style first.'; return; }
    brief = {version:1, approved:true, geometry_sha256:data.hash, retailer, style, budget:$('budget').value.trim()};
    $('request-text').value=`Use the concept-renderer skill to furnish ${data.title} using the approved brief below. Where exact licensed models are unavailable, identify dimensional proxies. Keep the approved shell unchanged and export a furnished walkthrough.\n\n${JSON.stringify(brief,null,2)}`;
    $('brief-status').textContent='Request ready for this session. Give it to your agent to generate a furnished version; no items have been added by this request.';
    $('brief').textContent='View furniture request';$('notice').textContent='';$('copy-status').textContent='';dialog('handoff');
  };
  $('copy-request').onclick=async()=>{
    try{await navigator.clipboard.writeText($('request-text').value);$('copy-status').textContent='Copied. Paste into the project’s agent chat.';}
    catch{ $('request-text').focus();$('request-text').select();$('copy-status').textContent='Clipboard unavailable. Copy the selected text or download the JSON.'; }
  };
  $('save-request').onclick=()=>{
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(brief,null,2)],{type:'application/json'}));
    a.href = url; a.download = 'furniture-brief.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('copy-status').textContent = 'Download requested. Attach the JSON to your project’s agent chat.';
  };
  try {
    const T = THREE, host = $('viewport'), renderer = new T.WebGLRenderer({antialias:true,alpha:false});
    host.append(renderer.domElement);
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.addEventListener('webglcontextlost', () => error('Graphics context lost. Reload this page to restore the model.'));
    const scene = new T.Scene(), model = new T.Group();
    scene.background = new T.Color(0xd4e6ee); scene.add(model);
    const camera = new T.PerspectiveCamera(40,1,0.08,1200);
    const hemi = new T.HemisphereLight(0xfffcf1,0xc6c1ac,1.85); scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff2df,2.15); sun.castShadow = true; scene.add(sun, sun.target);
    sun.shadow.mapSize.set(2048,2048); sun.shadow.normalBias=.025; sun.shadow.bias=-.00018;
    const swatches = {render:0xf5f1e5,partition:0xefeadf,floor:0xd5c6b0,timber:0xb7926e,roof:0x67717a,
      glass:0xb4d4de,frame:0x515c61,skylight:0xb7dbec,ceiling:0xf8f4e9,stone:0xc5c3b6,pv:0x36557a,fabric:0x899d86,
      f_pine:0xc59968,f_white:0xe6e3da,f_ink:0x343b3c,f_moss:0x4f694e,f_sage:0x78966c,f_linen:0xf2e5d2,
      f_clay:0xc28166,f_blue:0x72889a,f_metal:0x798486,f_silver:0xb5bdbc};
    const styled = new Map(), neutral = new Map(), loader = new T.TextureLoader();
    const invalid = () => error('An embedded texture could not be decoded.');
    let ready = false, walking = false;
    function draw() { if (ready) renderer.render(scene,camera); }
    function material(key, finish) {
      const cache = finish ? styled : neutral;
      if (cache.has(key)) return cache.get(key);
      const style = finish ? data.styles[key] : null;
      const structural = ['glass','frame','skylight','pv'].includes(key);
      const color = style?.color ?? ((finish || structural) ? swatches[key] ?? 0xdad9cc : key==='roof' ? 0xb4b9b6 : 0xe5e1d5);
      const glazed = key==='glass'||key==='skylight';
      const m = new T.MeshStandardMaterial({color, side:T.DoubleSide, roughness:glazed?.16:.83,
        metalness:key==='pv'?.3:.02, transparent:glazed,opacity:key==='skylight'?.22:key==='glass'?.48:1,depthWrite:!glazed});
      if (style?.map) {
        const tex = loader.load(style.map, draw, undefined,invalid);
        tex.colorSpace=T.SRGBColorSpace; tex.wrapS=tex.wrapT=T.RepeatWrapping; tex.repeat.setScalar(1/style.tile);
        tex.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy()); m.map=tex;
      } else if (finish && (key==='roof' || key==='pv')) {
        const cv=document.createElement('canvas'); cv.width=cv.height=128;
        const c=cv.getContext('2d'); c.fillStyle='#ffffff'; c.fillRect(0,0,128,128);
        c.fillStyle=key==='pv'?'#a8b6c1':'#b4b9bb'; c.fillRect(0,0,3,128);
        if(key==='pv') { c.fillRect(0,0,128,3); for(let i=16;i<128;i+=16)c.fillRect(i,0,1,128); }
        const tex=new T.CanvasTexture(cv); tex.wrapS=tex.wrapT=T.RepeatWrapping; tex.repeat.setScalar(key==='pv'?1:2.15);
        tex.colorSpace=T.SRGBColorSpace; m.map=tex;
      }
      cache.set(key,m); return m;
    }
    function metricUV(geo, key) {
      const pos=geo.attributes.position, norm=geo.attributes.normal, uv=[];
      for(let i=0;i<pos.count;i++) {
        const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
        const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i)),nz=Math.abs(norm.getZ(i));
        if(key==='roof' && ny>=nx && ny>=nz && nx>nz) uv.push(z,x);
        else if(ny>=nx&&ny>=nz) uv.push(x,z); else if(nx>=nz)uv.push(z,y); else uv.push(x,y);
      }
      geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    }
    function finishes(p, enabled) {
      return p.edge_slot||p.soffit_slot ?
        [p.slot,p.edge_slot||p.slot,p.soffit_slot||p.slot].map(k=>material(k,enabled)) : material(p.slot,enabled);
    }
    function make(p) {
      let geo;
      if(p.profile){
        geo=new T.BufferGeometry();
        geo.setAttribute('position',new T.Float32BufferAttribute(p.profile.flat(),3));geo.computeVertexNormals();
      } else if(p.box && p.corner_radius){
        const [w,h,d]=p.size, x=w/2,z=d/2,r=p.corner_radius,shape=new T.Shape();
        shape.moveTo(-x+r,-z); shape.lineTo(x-r,-z); shape.quadraticCurveTo(x,-z,x,-z+r);
        shape.lineTo(x,z-r); shape.quadraticCurveTo(x,z,x-r,z); shape.lineTo(-x+r,z);
        shape.quadraticCurveTo(-x,z,-x,z-r); shape.lineTo(-x,-z+r); shape.quadraticCurveTo(-x,-z,-x+r,-z);
        geo=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:4});
        geo.rotateX(-Math.PI/2); geo.translate(0,-h/2,0);
      } else if(p.box) geo=new T.BoxGeometry(...p.size);
      else if(p.slab) {
        const paths=p.slab.map(r=>r.map(([x,z])=>new T.Vector2(x,-z)));
        const shape=new T.Shape(paths[0]); shape.holes=paths.slice(1).map(r=>new T.Path(r));
        geo=new T.ExtrudeGeometry(shape,{depth:p.depth,bevelEnabled:false}); geo.rotateX(-Math.PI/2); geo.translate(0,p.base,0);
        if(p.edge_slot||p.soffit_slot){
          geo.clearGroups();
          const normals=geo.attributes.normal;
          for(let i=0;i<normals.count;i+=3){
            const y=normals.getY(i), index=y>.5?0:y<-.5?2:1, last=geo.groups.at(-1);
            if(last && last.materialIndex===index)last.count+=3;else geo.addGroup(i,3,index);
          }
        }
      } else {
        geo=new T.BufferGeometry();
        geo.setAttribute('position',new T.Float32BufferAttribute((p.mesh||p.face).flat(),3));
        geo.setIndex(p.indices||(p.face.length===3?[0,1,2]:[0,1,2,0,2,3]));
        geo.computeVertexNormals();
      }
      metricUV(geo,p.slot);
      const mesh=new T.Mesh(geo,finishes(p,true)); mesh.userData.slot=p.slot; mesh.userData.part=p;
      if(p.box||p.at)mesh.position.fromArray(p.box||p.at);
      mesh.rotation.y=(p.yaw||0)*Math.PI/180; mesh.castShadow=!['glass','skylight'].includes(p.slot); mesh.receiveShadow=true;
      if(p.door && p.door.kind==='door'){
        const [w,h,d]=p.size, latch=(p.door.hand.startsWith('start')?1:-1)*(w/2-.11);
        for(const side of [-1,1]){
          const grip=new T.Mesh(new T.BoxGeometry(.115,.023,.05),material('frame',true));
          grip.position.set(latch,Math.min(1.02,h*.55)-h/2,side*(d/2+.022));mesh.add(grip);
        }
      }
      return mesh;
    }
    for(const g of data.groups) {
      const group=new T.Group(); group.userData=g; model.add(group);
      for(const p of g.parts)group.add(make(p));
    }
    const bounds=new T.Box3().setFromObject(model), ctr=bounds.getCenter(new T.Vector3()), span=bounds.getSize(new T.Vector3());
    const radius=Math.max(8,span.length()*.55);
    const pad=new T.Mesh(new T.PlaneGeometry(radius*30,radius*30),new T.MeshStandardMaterial({color:0xd8ddce,roughness:1}));
    const grade=data.grade??(bounds.min.y-.015);
    pad.rotation.x=-Math.PI/2; pad.position.set(ctr.x,grade-.003,ctr.z); pad.receiveShadow=true; scene.add(pad);
    sun.position.copy(ctr).add(new T.Vector3(-radius,2*radius,radius)); sun.target.position.copy(ctr);
    Object.assign(sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,near:.1,far:6*radius}); sun.shadow.camera.updateProjectionMatrix();
    const target=new T.Vector3(); let yaw=.68,pitch=.53,distance=data.viewDistance;
    const maxDist=Math.max(200,span.length()*8);
    const space=new @space@(model.children,grade,bounds), feet=new T.Vector3(),keys=new Set();
    let heading=0,tilt=0,savedLevel='all',lastTick=0,frame=0;
    const starts=data.walk_starts.length?data.walk_starts:[{name:'Site entrance',xz:[ctr.x,bounds.min.z-2],floor:space.grade,heading:0}];
    for(const [i,s] of starts.entries())$('start').add(new Option(s.name,String(i)));
    function update() {
      if(walking){
        camera.position.set(feet.x,feet.y+@eye@,feet.z);
        camera.lookAt(camera.position.x+Math.sin(heading)*Math.cos(tilt),camera.position.y+Math.sin(tilt),
          camera.position.z+Math.cos(heading)*Math.cos(tilt));
        draw();return;
      }
      pitch=T.MathUtils.clamp(pitch,.065,Math.PI/2-.0001); distance=T.MathUtils.clamp(distance,1,maxDist);
      camera.position.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(distance).add(target);
      camera.lookAt(target); draw();
    }
    function home() { target.fromArray(data.focus); yaw=.73; pitch=.35; distance=data.viewDistance/Math.min(1,camera.aspect); update(); }
    $('home').onclick=home;
    $('site').onclick=()=>{target.copy(ctr);distance=radius/Math.sin(Math.min(1,camera.aspect)*camera.fov*Math.PI/360);pitch=.72;update();};
    $('plan').onclick=()=>{yaw=0;pitch=Math.PI/2;update();};
    for(const [i,name] of data.levels.entries())$('level').add(new Option(name+' cutaway',String(i)));
    $('items').checked=furnished; $('items').disabled=!furnished;
    $('furniture-switch').hidden=!furnished;
    $('finish').checked=Object.keys(data.styles).length>0; $('finish').disabled=!$('finish').checked;
    function refresh() {
      const v=$('level').value, fin=$('finish').checked;
      for(const g of model.children){
        const meta=g.userData; g.visible=(v==='all'||(!meta.roof&&meta.level<=Number(v)))&&(!meta.furniture||$('items').checked);
        for(const mesh of g.children)mesh.material=finishes(mesh.userData.part,fin);
      }
      $('caption').textContent=walking?'@caption@':v==='all'?'Exterior':data.levels[Number(v)]+' cutaway'; draw();
    }
    for(const id of ['level','finish','items'])$(id).onchange=refresh;
    function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();update();}
    new ResizeObserver(resize).observe(host); resize(); home(); refresh(); ready=true; draw();
    function startAt(){
      const s=starts[Number($('start').value)], [x,z]=s.xz;
      space.flight=null;feet.set(x,space.support(x,z,s.floor),z);heading=s.heading*Math.PI/180;tilt=(s.look_up||0)*Math.PI/180;keys.clear();update();host.focus();
    }
    function tick(now){
      if(!walking)return;
      const dt=Math.min(.05,(now-lastTick)/1000);lastTick=now;
      const down=(...codes)=>Number(codes.some(c=>keys.has(c)));
      const front=down('KeyW','ArrowUp')-down('KeyS','ArrowDown'),side=down('KeyD')-down('KeyA');
      const turn=down('ArrowLeft')-down('ArrowRight');
      const jumped=space.advanceJump(feet,dt);
      if(front||side||turn||jumped) {
        heading+=turn*dt*1.6;
        const speed=2.4*dt/Math.max(1,Math.hypot(front,side));
        space.move(feet,(front*Math.sin(heading)-side*Math.cos(heading))*speed,
          (front*Math.cos(heading)+side*Math.sin(heading))*speed);update();
      }
      frame=requestAnimationFrame(tick);
    }
    function toggleWalk(){
      walking=!walking;keys.clear();
      $('walk').setAttribute('aria-pressed',String(walking));$('walk').textContent=walking?'Exit walk':'Walk through';
      $('starts').hidden=$('pad').hidden=!walking;
      for(const id of ['level','home','site','plan'])$(id).disabled=walking;
      $('hint').textContent=walking?'WASD to move · Space to jump · click doors or aim + E':'Drag to orbit · right-drag to pan · scroll to zoom';
      camera.fov=walking?73:40;@near@camera.updateProjectionMatrix();
      if(walking){savedLevel=$('level').value;$('level').value='all';startAt();lastTick=performance.now();frame=requestAnimationFrame(tick);}
      else{cancelAnimationFrame(frame);space.flight=null;$('level').value=savedLevel;update();}
      refresh();
    }
    $('walk').onclick=toggleWalk;$('start').onchange=startAt;
    $('jump').onclick=()=>{if(walking){space.jump(feet);host.focus();}};
    for(const button of $('pad').querySelectorAll('[data-key]')){
      button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);};
      button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.key);
    }
    window.addEventListener('keyup',e=>keys.delete(e.code));
    window.addEventListener('blur',()=>keys.clear());
    document.addEventListener('visibilitychange',()=>keys.clear());
    $('drawer').addEventListener('close',()=>{if(walking)host.focus();});
    const pointers=new Map(); let start=null,moved=false;
    host.oncontextmenu=e=>e.preventDefault();
    host.onpointerdown=e=>{host.focus();host.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);start=[e.clientX,e.clientY];moved=pointers.size>1;};
    host.onpointermove=e=>{
      const prev=pointers.get(e.pointerId);if(!prev)return;
      const next=[e.clientX,e.clientY],dx=next[0]-prev[0],dy=next[1]-prev[1];
      pointers.set(e.pointerId,next); moved||=Math.hypot(next[0]-start[0],next[1]-start[1])>4;
      if(walking){heading-=dx*.004;tilt=T.MathUtils.clamp(tilt-dy*.004,-1.38,1.38);update();return;}
      if(pointers.size===2){
        const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];
        const old=Math.hypot(prev[0]-other[0],prev[1]-other[1]),now=Math.hypot(next[0]-other[0],next[1]-other[1]);
        if(now>1&&old>1)distance*=old/now;
      } else if(e.buttons===2||e.shiftKey){
        const s=distance*.0012; target.x+=(-Math.cos(yaw)*dx-Math.sin(yaw)*dy)*s;target.z+=(Math.sin(yaw)*dx-Math.cos(yaw)*dy)*s;
      } else {yaw-=dx*.006;pitch+=dy*.006;}
      update();
    };
    function pick(x,y,doorOnly=false){
      const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(x,y),camera);
      const hit=ray.intersectObjects(model.children.filter(g=>g.visible),true)[0];if(!hit)return;
      const obj=hit.object.userData.part?hit.object:hit.object.parent;
      if(obj.userData.toggle && walking){
        const msg=hit.distance>3?'Move closer to operate the door.':!obj.userData.toggle(feet)?'Step clear of the door.':
          obj.userData.open?'Door open':'Door closed';
        $('caption').textContent=msg;$('selection').textContent=msg;
        $('reference').textContent=obj.userData.part.door.inferred?'Handing inferred; verify on site.':'Click the leaf again to reverse it.';
        draw();return;
      }
      if(doorOnly)return;
      const g=obj.parent.userData;$('selection').textContent=g.name;
      if(g.furniture)itemDetails(g,$('reference'));
      else $('reference').textContent=`${g.basis} · `+g.pages.map(p=>`p.${p} ${data.sheets[p]}`).join(' / ');
    }
    host.onpointerup=e=>{
      pointers.delete(e.pointerId);
      if(moved||e.button!==0)return;
      const rect=host.getBoundingClientRect();
      pick((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    };
    host.onpointercancel=e=>pointers.delete(e.pointerId);
    host.addEventListener('wheel',e=>{e.preventDefault();if(!walking){distance*=Math.exp(Math.max(-1,Math.min(1,e.deltaY*.001)));update();}},{passive:false});
    host.onkeydown=e=>{
      if(walking){
        if(e.key==='Escape'){e.preventDefault();toggleWalk();}
        else if(e.code==='Space'){e.preventDefault();if(!e.repeat)space.jump(feet);}
        else if(e.code==='KeyE'&&!e.repeat){e.preventDefault();pick(0,0,true);}
        else if(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){
          e.preventDefault();keys.add(e.code);
        }return;
      }
      switch(e.key){case 'ArrowLeft':yaw-=.1;break;case 'ArrowRight':yaw+=.1;break;case 'ArrowUp':pitch+=.1;break;case 'ArrowDown':pitch-=.1;break;
        case '+':case '=':distance*=.9;break;case '-':distance/= .9;break;default:return;}e.preventDefault();update();
    };/*SITE_CONTROLS*/
  } catch(e) { error(`The 3D view could not start: ${e.message}. Enable WebGL in a modern browser.`); console.error(e); }
})();
