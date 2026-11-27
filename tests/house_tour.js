// Shared driver for trusted local route callbacks. No camera starts between stops.
function runWalkingReview(route, expectedRevision){
 window.addEventListener('load',()=>{
  const rooms=[],eyeMeasurements=[]; let stop='Start';
  function fail(msg){throw Error(`${stop}: ${msg} at (${feet.toArray().map(n=>n.toFixed(2)).join(', ')})`);}
  function walk(x,z){
    for(let i=0;i<1300;i++){
      const dx=x-feet.x,dz=z-feet.z,len=Math.hypot(dx,dz);
      if(len<.002)return;
      const old=feet.clone(),step=Math.min(.055,len);
      heading=Math.atan2(dx,dz);tilt=0;
      space.move(feet,step*dx/len,step*dz/len);
      if(old.distanceTo(feet)<.00001){
        update();pick(0,0,true);
        space.move(feet,step*dx/len,step*dz/len);
        if(old.distanceTo(feet)<.00001)fail(`blocked en route to ${x}, ${z}`);
      }
    }
    fail('route exceeded its distance limit');
  }
  function via(...pairs){for(const [x,z] of pairs)walk(x,z);}
  function visit(name,x,z,y,h){
    stop=name;walk(x,z);
    if(Math.abs(feet.y-y)>.025)fail(`expected floor ${y}`);
    const views=[];
    for(const [turn,pitch] of (route.views||[[0,18],[90,-12],[180,10],[270,-8]])){
      heading=(h+turn)*Math.PI/180;tilt=pitch*Math.PI/180;update();
      if(data.aligned){
        const supported=space.support(feet.x,feet.z,feet.y,.002);
        if(Math.abs(camera.position.y-feet.y-1.80)>1e-8 || Math.abs(feet.y-supported)>.002 ||
           Math.hypot(camera.position.x-feet.x,camera.position.z-feet.z)>1e-8)fail('Camera/support contract');
        if(!views.length)eyeMeasurements.push({stop:name,feet:feet.toArray(),actualEye:camera.position.toArray(),supported});
      }
      if(renderer.getContext().isContextLost() || !renderer.info.render.triangles)fail('no rendered geometry');
      views.push(renderer.domElement.toDataURL('image/jpeg',.84));
    }
    rooms.push({name,x,z,y,views});
  }
  function result(payload){const pre=document.createElement('pre');pre.id='tour-result';pre.textContent=JSON.stringify(payload);document.body.replaceChildren(pre);}
  try{
    if((data.aligned?.id||null)!==(route.alignment||null))
      fail('Use the explicit route for this export (house_aligned_* for the sheet-aligned candidate).');
    if(expectedRevision && expectedRevision!==data.hash)
      fail('default route is only for the bundled House geometry; provide --route for this concept');
    if(route.start){
      const i=starts.findIndex(item=>item.name===route.start);
      if(i<0)fail('missing walk start: '+route.start);
      $('start').value=String(i);
    }
    let overview;
    if(route.overview){
      $('site').click();update();
      const {calls,triangles}=renderer.info.render;
      overview={view:renderer.domElement.toDataURL('image/jpeg',.90),calls,triangles};
    }
    const nonWalk=route.beforeWalk?.();
    $('walk').click();
    const placed=model.children.filter(g=>g.userData.furniture);
    if(placed.length && (!$('items').checked || placed.some(g=>!g.visible)))
      fail('furnished review requires the entire furniture layer ON');
    const start=feet.clone();
    let inspection=route({via,visit});
    if(data.aligned)inspection={...inspection,eyeMeasurements,nonWalk};
    stop='Return to the start';
    if(!walking || !(feet.distanceTo(start)<=.005))fail('did not return to the walk start');
    if(placed.some(g=>!g.visible))fail('furniture hidden during walking review');
    if(!$('error').hidden)fail($('error').textContent);
    const details=route.details?.();
    result({ok:true,rooms,revision:data.hash,returned_to_start:true,overview,inspection,details});
  }catch(e){result({ok:false,error:String(e),visited:rooms.map(r=>r.name)});}
 });
}

function houseRoute({via,visit},legs={}){
    visit('Front porch',1.72,1.9,0,180);
    visit('Entrance hall',1.72,5.75,0,110);
    via([4.75,5.85],[4.75,4.52],[4.75,3.55]);
    visit('Office',4.72,2.1,0,160);
    via([4.75,3.5],[4.75,4.6]);
    visit('Secondary hall',6.92,4.62,0,130);
    via([6.97,3.36],[6.97,2.28]);
    visit('Plant room',8.4,1.65,0,70);
    via([6.97,2.15],[6.97,3.45],[6.97,4.71],[8.2,4.71]);
    visit('Ground-floor WC',8.65,4.1,0,100);
    via([8.25,4.71],[6.95,4.71],[4.84,4.71],[4.84,9.85]);
    if(legs.kitchen)legs.kitchen({via,visit});else visit('Kitchen and dining',3.65,11.55,0,175);
    via([3.41,9.85],[3.41,8.48]);
    visit('Pantry',2.45,7.88,0,80);
    via([3.41,8.08],[3.41,9.8],[5.3,10.4]);
    if(legs.living)legs.living({via,visit});else visit('Living room',8.1,11.2,0,45);
    via([5.15,10.95],[4.85,9.55],[4.85,6.3],[1.0,6.3],[-.75,6.3]);
    visit('Garage circulation and storage',-1.10,7.75,-.3,180);
    if(legs.workshop)legs.workshop({via,visit});else {
      visit('Garage workshop',-4.1,8.5,-.3,160);via([-1.0,9.75],[-1.0,11.5]);
    }
    if(legs.hobby)legs.hobby({via,visit});else visit('Hobby room',-3.1,11.8,-.3,35);
    via([-1.0,11.55],[-1.0,6.30],[1.0,6.30],[5.42,6.45],[5.42,7.45]);
    visit('Stair half-landing',8.82,7.45,1.4921,275);
    via([8.82,6.42],[5.36,6.42]);
    visit('Mansard landing and hall',4.99,6.45,3.15,80);
    via([4.79,6.03],[4.79,4.93]);
    visit('Master bedroom',7.05,3.2,3.15,135);
    via([4.79,4.16],[3.54,4.16]);
    visit('Dressing room',2.25,4.35,3.15,240);
    via([2.77,3.57],[2.77,2.5]);
    visit('En-suite bathroom',2.82,2.1,3.15,140);
    via([1.54,2.12],[1.54,1.30]);
    if(legs.sauna)legs.sauna({via,visit});else visit('Sauna',1.38,1.08,3.15,40);
    via([1.54,1.3],[1.54,2.27],[2.77,2.35],[2.77,4.17],[4.78,4.17],[4.79,6.2]);
    via([4.79,6.04],[3.4,6.04]);
    if(legs.laundry)legs.laundry({visit});else visit('Laundry',2.12,6.32,3.15,250);
    via([3.38,6.04],[4.8,6.04],[4.8,8.33],[3.44,8.33]);
    visit('Family bathroom',2.16,8.28,3.15,230);
    via([3.43,8.33],[4.87,8.33],[4.87,9.55],[4.87,10.52]);
    visit('Bedroom 2',3.65,11.48,3.15,35);
    via([4.87,10.52],[4.87,9.375],[6.45,9.375]);
    if(legs.bedroom)legs.bedroom({visit});else visit('Bedroom 1',7.58,10.92,3.15,52);
    via([6.46,9.375],[4.88,9.375],[4.88,6.42],[5.36,6.42],[8.82,6.42],[8.82,7.45],
        [5.42,7.45],[5.42,6.4],[1.72,6.4],[1.72,3.55],[1.72,1.88],[1.72,-3.4]);
}
