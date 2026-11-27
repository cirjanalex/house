// @route-base house_site_tour.js
function walkRoute(io){
  const {via,visit}=io, record=[];
  const leaf=model.children.find(g=>g.userData.name.startsWith('Vehicle gate'))?.children[0];
  if(!leaf || leaf.userData.open)throw Error('Missing initially closed vehicle gate');
  const check=(ok,msg)=>{if(!ok)throw Error(`${msg} at ${feet.toArray()}`);};
  function key(caption,u){
    update();const at=leaf.localToWorld(new T.Vector3(u,0,0)),to=at.sub(camera.position);
    heading=Math.atan2(to.x,to.z);tilt=Math.atan2(to.y,Math.hypot(to.x,to.z));update();
    host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
    check($('caption').textContent===caption,`Drive key: expected ${caption}, got ${$('caption').textContent}`);
    record.push({caption,feet:feet.toArray(),pose:leaf.position.toArray()});
  }
  const stop=(name,x,z,bearing)=>visit(name,x,z,space.grade,bearing);
  const base=houseSiteRoute(io,{
    openDrive(){
      via([-5.55,-11.8]);stop('Vehicle leaf · closed from street',-5.55,-10.65,0);
      space.move(feet,0,2.4);check(feet.z< -9.49 && feet.z> -9.62,'Walker passed closed slider from street');
      via([-5.55,-10.60]);key('Door open',0);
      via([-7.8,-10.60],[-7.8,-9.285]);key('Step clear of the door.',3.025);
      check(leaf.userData.open && Math.abs(leaf.position.x+12.12)<.001,'Blocked slide moved the leaf');
      via([-7.80,-7.95]);key('Door closed',3.025);
      via([-5.55,-7.95]);space.move(feet,0,-2.8);
      check(feet.z> -9.10 && feet.z< -8.97,'Walker passed closed slider from garden');
      via([-5.55,-7.95]);key('Door open',0);
      stop('Vehicle leaf · open from court',-7.70,-7.75,215);
      via([-5.55,-7.95],[-5.55,-11.80],[1.72,-11.80]);
    },
    closeDrive(){
      via([-7.0,-6.3],[-7.8,-7.92]);key('Door closed',3.025);
      via([-7.0,-6.3],[-9.35,-4.45]);
    },
    circuit(){
      const block=(dx,dz,msg)=>{const prev=feet.clone();space.move(feet,dx,dz);
        const dist=prev.distanceTo(feet);check(dist>.25 && dist<Math.hypot(dx,dz)-.25,msg);};
      via([7.6,27.90]);stop('Rear enclosure · inner face',-4,28.90,0);
      block(0,2.15,'Rear fence did not block');via([-4,28.5],[-14.28,28.5]);
      stop('Western return · oblique boundary',-16.6,16.3,258);
      block(-3.4,0,'West fence did not block');via([-16.6,16.3],[-20.82,-7.9]);
      stop('Northwest corner · frontage junction',-20.82,-7.90,220);
      via([12.8,-8.24]);block(0,-2.6,'Front extension did not block');
      via([12.8,-8.05],[22.90,-8.05]);stop('East enclosure · front to rear',22.96,9.3,0);
      block(3.0,0,'East fence did not block');
      via([22.8,9.3],[22.8,28.55]);stop('Southeast corner · back to house',22.8,28.55,225);
      via([7.6,28.55],[7.6,20.8]);
    }
  });
  check(!leaf.userData.open,'Vehicle gate not latched at end');
  return {...base,drive:record,parcel_m2:data.refined.area_m2};
}
walkRoute.start='Street · pedestrian gate';
walkRoute.views=[[0,-5],[90,8],[180,-6],[270,4]];
walkRoute.overview=true;
// Deliberately separate from walking evidence: exterior design comparisons after return.
walkRoute.details=()=>{
  if($('practicals').getAttribute('aria-pressed')==='true')$('practicals').click();
  const out={},modelMeshes=model.children.flatMap(g=>g.children);
  const ray=(eye,dir)=>new T.Raycaster(new T.Vector3(...eye),new T.Vector3(...dir))
    .intersectObjects(modelMeshes,false)[0];
  for(const [x,z] of [[2,-.55],[-.55,4],[10.48,1.5],[1.42,13.68],[5.3,-.17],[4.86,13.31],[10.19,4.21],[10.19,8.91]]){
    const hit=ray([x,4.18,z],[0,1,0]);
    if(!hit?.object.userData.slot?.startsWith('e_board'))throw Error(`Missing boarded intrados at ${x},${z}`);
  }
  const west=[-.95,-.62,-.23,-.025].map(x=>ray([x,4.18,6.1],[0,1,0]));
  if(west.some(hit=>hit?.object.userData.slot!=='e_board_z'||Math.abs(hit.point.y-4.293)>.002))
    throw Error('A–A west soffit fails to run level back to the facade');
  for(const [eye,d] of [[[2,4.38,-1.30],[0,0,1]],[[-1.3,4.38,4],[1,0,0]],[[1,4.38,14.48],[0,0,-1]],
    [[11.3,4.38,1.5],[-1,0,0]],[[5.3,5.56,-.52],[0,0,1]],[[4.22,4.60,-.65],[-1,0,0]]]){
    if(ray(eye,d)?.object.userData.slot!=='e_fascia')throw Error('Missing folded eave at '+eye);
  }
  for(const [key,eye,target] of [
    ['house-eave',[.01,3.45,-1.95],[-.61,4.43,-.71]],
    ['carport-eave',[-18.30,1.28,-7.75],[-18.92,2.26,-6.51]],
    ['master-dormer',[3.51,4.53,-3.81],[5.16,5.51,-.20]]]){
    const cam=camera.clone();cam.fov=49;cam.updateProjectionMatrix();cam.position.fromArray(eye);
    cam.lookAt(...target);renderer.render(scene,cam);
    out[key]=renderer.domElement.toDataURL('image/jpeg',.94);
  }
  update();return out;
};
