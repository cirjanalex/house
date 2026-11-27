// Supplemental fixture studies, reached via the normal House interior walk and its stairs.
function walkRoute({via,visit}){
  const eyeHeight=camera.position.y-feet.y;
  const meshes=model.children.flatMap(g=>g.children);
  const down=(x,y,z)=>new T.Raycaster(new T.Vector3(x,y,z),new T.Vector3(0,-1,0)).intersectObjects(meshes,false)[0];
  const check=(test,msg)=>{if(!test)throw Error(msg);};
  const lightCheck={},mounts={},mountPhotos={};
  for(const [room,y,x,z,axis,sideX,sideZ,top] of [
    ['Ground-floor WC',0,9.13,5.30,'z',-1,0,1.58],
    ['En-suite bathroom',3.15,3.80,1.24,'x',0,1,1.53]]){
    const hardware=meshes.filter(m=>m.parent.userData.name===room+' · screened shower' && m.userData.slot==='b_silver');
    const tiles=meshes.filter(m=>m.parent.userData.name===room+' · ceramic floor and wall finish');
    const dir=new T.Vector3(+(axis==='x'),0,+(axis==='z'));
    mounts[room]=[];
    for(const [offset,height,label] of [[-.075,.994,'inlet A'],[.075,.994,'inlet B'],[0,top,'rail bracket']]){
      // Cast off the revolution axis: measure the two actual skin intersections,
      // not a bounding box, part name or assumed pipe depth.
      const u=offset+.0031,ray=new T.Raycaster(new T.Vector3(x+u*sideX,y+height+.0016,z+u*sideZ),dir);
      const tile=ray.intersectObjects(tiles,false)[0];
      check(tile?.object.userData.slot==='b_glaze',`BATH-01 ${room} ${label}: no tile witness`);
      const depth=tile.distance;
      const solids=hardware.map(m=>ray.intersectObject(m,false)).filter(h=>h.length>=2)
        .map(h=>[h[0].distance,h.at(-1).distance]);
      const shoe=solids.find(([front,back])=>front<depth-.007 && back>depth+.001);
      check(shoe,`BATH-01 ${room} ${label}: metal does not cross the finished tile`);
      const overlap=Math.max(0,...solids.filter(s=>s!==shoe && s[0]<shoe[0])
        .map(s=>Math.min(s[1],shoe[1])-Math.max(s[0],shoe[0])));
      check(overlap>.002,`BATH-01 ${room} ${label}: trim does not join the mixer or rail`);
      mounts[room].push({label,tile_plane_m:tile.point[axis],tile_engagement_mm:+((shoe[1]-depth)*1000).toFixed(2),
        fixture_engagement_mm:+(overlap*1000).toFixed(2)});
    }
  }
  function detail(key,eye,aim,fov){
    const c=camera.clone();c.position.fromArray(eye);c.fov=fov;c.updateProjectionMatrix();c.lookAt(...aim);
    renderer.render(scene,c);mountPhotos[key]=renderer.domElement.toDataURL('image/jpeg',.95);
  }
  function pixels(){
    update();const gl=renderer.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    const bytes=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
    const l=[];for(let i=0;i<bytes.length;i+=4*29)l.push(.213*bytes[i]+.715*bytes[i+1]+.072*bytes[i+2]);return l;
  }
  function compare(name,target,noSpill){
    const p=new T.Vector3(...target).sub(new T.Vector3(feet.x,feet.y+eyeHeight,feet.z));
    heading=Math.atan2(p.x,p.z);tilt=Math.atan2(p.y,Math.hypot(p.x,p.z));
    const button=$('practicals');if(button.getAttribute('aria-pressed')==='true')button.click();
    const day=pixels();button.click();const lit=pixels();
    const gain=lit.reduce((sum,v,i)=>sum+Math.abs(v-day[i]),0)/lit.length;
    const extremes=day.filter(v=>v>251||v<4).length/day.length;
    check(noSpill?gain<.65:gain>2,`Unexpected practical response in ${name}: ${gain}`);
    check(extremes<.15,`Excessive clipped daylight samples in ${name}: ${extremes}`);
    lightCheck[name]={mean_abs_luma_change:gain,daylight_extreme_fraction:extremes};
  }
  for(const [name,y,x,z,dx,dz,wx,wz] of [
    ['Ground',0,8.15,3.209,0,1,9.16,3.351],
    ['En-suite',3.15,3.77,2.025,-1,0,.792,2.53],
    ['Family',3.15,2.81,7.41,0,1,1.82,7.551]]){
    const drain=down(x+.034*dx,y+.89,z+.034*dz),recess=down(x+dz*.10+.035*dx,y+.88,z-dx*.10+.035*dz);
    const rim=down(x+dz*.33,y+.87,z-dx*.33),water=down(wx,y+.55,wz);
    check(drain?.object.userData.slot==='b_silver'&&Math.abs(drain.point.y-y-.703)<.003,`${name}: waste covered`);
    check(rim?.object.userData.slot==='b_porcelain'&&recess?.object.userData.slot==='b_porcelain'&&
      rim.point.y-recess.point.y>.08,`${name}: inset basin is not hollow`);
    check(water?.object.userData.slot==='b_water'&&Math.abs(water.point.y-y-.253)<.002,`${name}: WC pan blocked`);
    check(!space.tryMove(new T.Vector3(wx,y,wz),wx,wz),`${name}: walker can occupy WC`);
  }
  const shots={
    'Ground-floor WC':[
      [[8.14,4.58],[[8.15,.84,3.2],[9.16,.43,3.33],[9.18,1.1,5.14],[8.65,.05,4.0]]],
      [[8.88,4.21],[[8.15,1.02,3.2],[9.15,1.4,5.4],[9.18,.40,3.35],[7.68,1.05,4.72]]]],
    'En-suite bathroom':[
      [[2.74,2.0],[[3.81,1.01,2.03],[.76,.46,2.53],[3.58,1.06,1.1],[1.54,1.18,1.65]]],
      [[1.55,2.19],[[.74,.44,2.53],[3.76,1.04,2.03],[3.05,1.42,1.35],[2.77,1.17,3.0]]]],
    'Family bathroom':[
      [[3.46,8.35],[[.83,.48,8.15],[1.84,.49,7.53],[2.81,1.0,7.41],[1.46,2.03,8.54]]],
      [[1.73,8.57],[[.84,.44,8.13],[1.82,.52,7.45],[2.8,1.08,7.41],[4.05,1.19,8.33]]]]
  };
  const interior=data.aligned?houseAlignedRoomRoute:houseRoute;
  interior({via,visit(name,x,z,y){
    via([x,z]);
    if(name==='Sauna'){
      // Isolate spill from the *bath* in a solid corner. With the new, separate
      // cabin emitter enabled the same comparison must also detect its own light.
      if(data.aligned){
        compare('Sauna own shaded lamp',[.42,y+1.34,.43],false);
        saunaAccent.value=0;
      }
      compare(name,[.42,y+1.34,.43],true);
      if(data.aligned)saunaAccent.value=1;
    }
    if(!shots[name])return;
    for(const [[a,b],targets] of shots[name]){
      via([a,b]);
      if(a===shots[name][0][0][0])compare(name,[targets[0][0],y+targets[0][1],targets[0][2]],false);
      walkRoute.views=targets.map(([u,h,v])=>[180/Math.PI*Math.atan2(u-a,v-b),
        180/Math.PI*Math.atan2(h-eyeHeight,Math.hypot(u-a,v-b))]);
      for(const mode of ['daylight','practicals']){
        if((mode==='practicals')!==($('practicals').getAttribute('aria-pressed')==='true'))$('practicals').click();
        visit(`${name} · ${a===shots[name][0][0][0]?'door side':'reverse'} · ${mode}`,a,b,y,0);
      }
    }
    if(name==='Ground-floor WC'){
      via([8.87,4.15],[8.95,4.42],[8.95,5.10]);
      detail('ground-shower-side',[8.91,1.54,5.23],[9.13,1.00,5.405],63);
      detail('ground-shower-oblique',[feet.x,feet.y+eyeHeight,feet.z],[9.13,1.40,5.425],57);
      via([8.95,4.42],[8.20,4.12],[8.15,3.83]);
    }else if(name==='Family bathroom'){
      via([2.4,8.44],[2.81,8.02]);
    }else if(name==='En-suite bathroom'){
      // Enter the walk-in shower through its opening, then walk to the sauna on the base tour.
      via([2.77,2.04],[3.11,2.025],[2.75,1.76],[2.75,1.21],[3.36,.98]);
      detail('master-shower-side',[3.78,4.76,.73],[3.94,4.19,1.24],62);
      detail('master-shower-oblique',[feet.x,feet.y+eyeHeight,feet.z],[3.987,4.48,1.24],55);
      via([2.75,1.21],[2.75,1.76]);
    }
    via([x,z]);
  }});
  walkRoute.details=()=>mountPhotos;
  return {comparison:'Same eyes and targets; only the practical switch changes. All 22 base positions physically traversed.',lightCheck,mounts};
}
