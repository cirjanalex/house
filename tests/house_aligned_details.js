// @route-base house_aligned_legs.js
function walkRoute({via,visit}){
  const surfaces=[],hops=[],controls={},photos={};
  const check=(ok,msg)=>{if(!ok)throw Error(`${msg} at ${feet.toArray()}`);};
  function eye(label,y=null){
    update();
    check(walking && Math.abs(camera.position.y-feet.y-1.80)<1e-8 &&
      camera.position.x===feet.x && camera.position.z===feet.z && camera.near<.025,'Wrong actual walk camera: '+label);
    if(y!==null)check(Math.abs(feet.y-y)<.003,'Wrong datum: '+label);
    return {label,feet:feet.toArray(),actualEye:camera.position.toArray(),near:camera.near};
  }
  function surface(label,x,z,y){
    via([x,z]);surfaces.push(eye(label,y));
    check(Math.abs(space.support(x,z,feet.y,.001)-feet.y)<.002,'Floating on '+label);
  }
  function jump(label,limited){
    const start=feet.y,frames=[];$('jump').click();check(space.flight,'Actual jump control failed');
    let apex=0,previous=0;
    for(let i=0;i<80&&space.flight;i++){
      space.advanceJump(feet,.0125);const height=feet.y-start;
      if(i%7===0||!space.flight||(previous===apex&&height<previous)){
        frames.push(eye(label));
        const gap=Math.min(...space.ceilings.map(c=>c(feet.x,feet.z)))-camera.position.y;
        check(gap>.025,'Eye crossed roof in flight');
      }
      apex=Math.max(apex,height);previous=height;
    }
    check(!space.flight&&Math.abs(feet.y-start)<.002&&(limited?apex<.32:apex>.34),'Wrong landing or apex: '+label);
    hops.push({label,apex,frames});
  }
  function look(name,targets){
    update();const [x,y,z]=feet.toArray(),e=camera.position.y;
    walkRoute.views=targets.map(([u,h,v])=>[Math.atan2(u-x,v-z)*180/Math.PI,Math.atan2(h-e,Math.hypot(u-x,v-z))*180/Math.PI]);
    visit(name,x,z,y,0);
  }
  function example(name,target){
    update();const v=new T.Vector3(...target).sub(camera.position);
    heading=Math.atan2(v.x,v.z);tilt=Math.atan2(v.y,Math.hypot(v.x,v.z));
    const old=renderer.getSize(new T.Vector2()),ratio=renderer.getPixelRatio();
    try{
      renderer.setPixelRatio(1);renderer.setSize(1280,768,false);update();
      photos['example-'+name]={size:[1280,768],jpeg:renderer.domElement.toDataURL('image/jpeg',.94)};
    }finally{renderer.setPixelRatio(ratio);renderer.setSize(old.x,old.y,false);update();}
  }
  function inventoryView(name,target){
    update();const v=new T.Vector3(...target).sub(camera.position);
    heading=Math.atan2(v.x,v.z);tilt=Math.atan2(v.y,Math.hypot(v.x,v.z));update();
    photos['furnishing-'+name]=renderer.domElement.toDataURL('image/jpeg',.92);
  }
  function light(on){
    if(($('practicals').getAttribute('aria-pressed')==='true')!==on)$('practicals').click();
  }
  const canopy=(on)=>{
    if(($('canopy').getAttribute('aria-pressed')==='true')!==on)$('canopy').click();
    const panels=model.children.filter(g=>g.userData.canopyState).flatMap(g=>g.children)
      .filter(m=>m.visible&&m.userData.slot==='a_canvas');
    const above=z=>new T.Raycaster(new T.Vector3(2.07,1.10,z),new T.Vector3(0,1,0)).intersectObjects(panels)[0];
    check(panels.length===1 && !!above(15.75)===on && !!above(13.63),'No real change in textile coverage');
    controls[on?'extended':'retracted']={coversDining:!!above(15.75),fabricAtHeadbox:!!above(13.63)};
  };
  surface('Exterior grade',1.72,-3.4,-.45);jump('open air',false);
  via([1.25,-5.80]);look('North facade · recessed panels',[[1.54,3.96,0],[4.32,1.53,0],[1.3,1.1,2.95],[5.53,5.60,-.28]]);
  via([-4.9,-4.6],[-8.75,-7.78],[-11.55,-7.48]);
  look('Carport screens and bin shelter',[[-13,.52,-6.59],[-15,1,-5.85],[-17,.5,-2.5],[-5,.40,-9.3]]);
  via([-8.75,-7.78],[-8.46,2.62],[-8.65,7.77]);
  look('West annex · grille and gable',[[-5.99,1.37,6.52],[-5.99,1.40,9.25],[-6.0,3.29,10.43],[-5.89,.23,5.30]]);
  via([-8.46,2.62],[-4.9,-4.6],[1.72,-3.4]);
  surface('Porch first step',1.72,.45,-.30);surface('Porch second step',1.72,.76,-.15);
  surface('Front porch',1.72,1.90,0);
  houseAlignedRoomRoute({via,visit(name,x,z,y){
    via([x,z]);surfaces.push(eye(name,y));
    const inventoryTargets={
      'Entrance hall':['entrance-storage',[1.47,.96,4.55]],'Pantry':['pantry-shelves',[1.44,.85,7.44]],
      'Garage circulation and storage':['garage-divider',[-2.13,.48,7.89]],
      'Dressing room':['dressing-runs',[3.00,3.94,5.17]],'Bedroom 1':['east-bedroom',[8.47,3.75,10.43]],
      'Bedroom 2':['west-bedroom',[1.68,3.76,11.44]]};
    if(inventoryTargets[name])inventoryView(...inventoryTargets[name]);
    if(name==='Hobby room'){
      via([-3.10,11.10],[-1.16,11.10]);inventoryView('hobby-counter',[-3.81,.34,12.0]);
      via([-3.10,11.10],[x,z]);
    }
    if(name==='Plant room'){
      via([7.47,2.26]);inventoryView('service-plant',[8.27,.91,.75]);via([x,z]);
    }
    if(name==='Laundry'){
      via([2.63,5.99]);inventoryView('washer-dryer',[1.34,3.63,6.61]);
      inventoryView('ironing',[2.86,3.97,6.78]);via([x,z]);
    }
    if(name==='Master bedroom'){
      inventoryView('master-reading-pair',[7.65,3.77,4.58]);
      via([4.94,4.78]);inventoryView('master-bed-and-bench',[7.82,3.81,1.58]);via([x,z]);
    }
    if(name==='Office'){
      look('Office · two work positions',[[5.77,.91,1.58],[5.77,.91,2.88],[3.36,.71,2.17],[4.36,1.39,.24]]);
    }else if(name==='Kitchen and dining'){
      via([4.75,10.05],[2.43,10.05]);
      for(const [u,v] of [[1.53,11.43],[1.46,11.84],[2.0,11.82],[1.99,11.80],[1.55,11.60]]){
        via([u,v]);surfaces.push(eye('Kitchen operating stance',0));
      }
      via([2.43,10.05],[4.75,10.05],[4.81,12.02],[4.85,13.69]);
      surface('Rear terrace finish',4.85,14.01,-.0081);
      via([4.91,16.51]);
      const aims=[[2.45,1.58,14.05],[2.20,2.72,14.82],[2.92,.56,15.10],[5.3,1.55,13.02]];
      canopy(true);look('Terrace walk · extended',aims);
      canopy(false);look('Terrace walk · retracted',aims);
      canopy(true);
      via([4.91,14.78]);surface('East terrace upper step',6.11,14.78,-.16053);
      surface('East terrace lower step',6.41,14.78,-.30527);
      via([6.83,14.78],[6.83,18.55],[5.90,18.55]);
      for(const on of [true,false]){canopy(on);example('terrace-'+(on?'extended':'retracted'),[2.70,1.65,14.95]);}
      canopy(true);via([8.41,19.36]);
      look('South facade · two blind arrays',[[8.02,1.58,14.20],[4.59,4.87,13.2],[-2.98,1.36,13.01],[3.1,2.70,16.9]]);
      via([12.59,15.04]);
      look('Rain chain and east window guards',[[12.34,1.48,13.16],[12.34,3.16,13.16],[12.34,-.39,13.16],[10.05,4.0,9.0]]);
      via([14.48,14.21],[15.11,6.11]);
      look('East elevation · metal window guards',[[10.075,4.01,4.62],[10.075,4.01,9.025],[11.39,2.75,4.0],[12.34,3.19,13.16]]);
      via([14.48,14.21],[12.59,15.04]);
      via([7.15,18.58],[-.81,18.58],[-.81,16.10]);
      surface('West terrace lower step',-.275,16.10,-.30967);
      surface('West terrace upper step',.025,16.10,-.16933);
      via([1.54,16.10],[1.54,16.65],[4.91,16.65],[4.85,13.69],[4.85,12.02],[x,z]);
    }else if(name==='Living room'){
      look('Living · sectional and media',[[7.95,.67,9.45],[8.56,.63,11.36],[10.80,1.0,11.18],[8.85,.58,12.75]]);
      via([6.16,11.74]);example('living-room',[9.12,.88,10.87]);via([x,z]);
    }else if(name==='Stair half-landing'){
      via([8.82,7.45]);surface('Lower tread',6.26,7.45,.16579);
      surface('Turn platform',8.82,7.45,1.49211);
      via([8.82,6.42]);surface('Upper tread',8.022,6.42,1.65789);
      via([8.82,6.42],[x,z]);
    }else if(name==='En-suite bathroom'){
      via([1.54,2.12]);update();
      const leaf=model.children.flatMap(g=>g.children).find(m=>m.userData.part.saunaLeaf);
      const aim=leaf.position.clone().sub(camera.position);heading=Math.atan2(aim.x,aim.z);
      tilt=Math.atan2(aim.y,Math.hypot(aim.x,aim.z));update();
      if(!leaf.userData.open)host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
      check(leaf.userData.open,'Sauna leaf not opened by user control');
      via([1.55,1.945]);
      const aims=[[1.35,3.90,.69],[2.01,3.75,.65],[.57,4.15,1.03],[2.12,4.49,.66]];
      for(const mode of [false,true]){light(mode);look('Sauna threshold · '+(mode?'practicals':'daylight'),aims);}
      via([1.54,2.12],[x,z]);
    }else if(name==='Sauna'){
      const aims=[[1.05,3.90,.66],[2.01,3.75,.657],[.61,4.10,1.28],[2.78,4.20,2.13]];
      for(const mode of [false,true]){light(mode);look('Sauna inside · '+(mode?'practicals':'daylight'),aims);}
      jump('sloped sauna lining',true);
      const leaf=model.children.flatMap(g=>g.children).find(m=>m.userData.part.saunaLeaf);
      const key=()=>{
        update();const v=leaf.position.clone().sub(camera.position);heading=Math.atan2(v.x,v.z);
        tilt=Math.atan2(v.y,Math.hypot(v.x,v.z));update();host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
      };
      key();check(leaf.userData.open && $('caption').textContent==='Step clear of the door.','Occupied sauna sweep');
      via([1.98,1.15]);key();check(!leaf.userData.open,'Cannot shut sauna from its free interior stance');
      via([1.76,1.40]);example('sauna',[1.28,3.98,.65]);via([1.98,1.15]);
      key();check(leaf.userData.open,'Cannot reopen from inside');via([x,z]);controls.saunaDoor='closed and reopened from inside';
    }
  }});
  check($('items').checked && $('finish').checked && $('practicals').getAttribute('aria-pressed')==='true',
        'Finish, lights or furniture disabled at end');
  walkRoute.details=()=>photos;
  return {surfaces,hops,canopy:controls};
}
walkRoute.alignment='house-aligned-v1';
walkRoute.beforeWalk=()=>{
  const views={};
  for(const id of ['home','plan','site']){
    $(id).click();views[id]=camera.position.toArray();
    if(walking||camera.near!==.08||camera.fov!==40)throw Error('Walking optics leaked into '+id);
  }
  if(views.plan[1]===views.home[1]||views.site[1]===views.plan[1])throw Error('Orbit locked to walking eye');
  return views;
};
