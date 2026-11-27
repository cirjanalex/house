// Separate inspection, starting once at the real street selector. All legs use walking collisions.
function houseSiteRoute({via,visit},extra={}){
  const gate=model.children.find(g=>g.userData.name.startsWith('Pedestrian gate'))?.children[0];
  const check=(ok,msg)=>{if(!ok)throw Error(`${msg} at ${feet.toArray()}`);};
  const interactions=[],position=v=>v.toArray().map(n=>Number(n.toFixed(3)));
  check(gate?.userData.toggle && !gate.userData.open,'Missing closed gate');
  function keyAtLeaf(caption){
    const to=gate.position.clone().sub(camera.position);
    heading=Math.atan2(to.x,to.z);tilt=Math.atan2(to.y,Math.hypot(to.x,to.z));update();
    host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
    check($('caption').textContent===caption,`Expected "${caption}", got "${$('caption').textContent}"`);
    interactions.push({feet:position(feet),action:'E',caption,open:!!gate.userData.open,leaf_center:position(gate.position)});
  }
  function operate(caption){
    update(); // via() advances the live feet without redrawing every 5 cm.
    keyAtLeaf(caption);
  }
  function blocked(label){
    const here=feet.clone(),center=gate.position.clone(),yaw=gate.rotation.y,open=!!gate.userData.open;
    operate('Step clear of the door.');
    check(feet.equals(here) && gate.position.equals(center) && gate.rotation.y===yaw && !!gate.userData.open===open,
      `Blocked ${label} changed the pose or moved the walker`);
    interactions.at(-1).probe=label;
  }
  const stop=(name,x,z,bearing)=>visit(name,x,z,space.grade,bearing);
  // Supplement (not a substitute for) the real walk: sample a representative
  // passenger-car body along two quarter-turns from the open drive mouth.
  const road=model.children.filter(g=>['Street-side apron','Drive and turning apron','Site paving and terrace'].includes(g.userData.name))
    .flatMap(g=>g.children).filter(m=>m.userData.part.slab).map(m=>m.userData.part.slab[0]);
  const solids=space.solids.filter(s=>s.low<space.grade+1.65 && s.top>space.grade+.10 &&
    (s.group.userData.site||s.group.userData.name==='Detached two-car carport'));
  let samples=0;
  function carAt(x,z,angle){
    for(let i=0;i<=12;i++)for(let j=0;j<=6;j++){
      const u=4.3*(i/12-.5),v=1.8*(j/6-.5),s=Math.sin(angle),c=Math.cos(angle);
      const px=x-u*s+v*c,pz=z+u*c+v*s;
      check(road.some(r=>space.inRing(px,pz,r)),`Car leaves paving at ${px},${pz}`);
      check(!solids.some(o=>o.distance(px,pz)<.12),`Obstruction in car approach at ${px},${pz}`);
      samples++;
    }
  }
  extra.openDrive?.();
  for(const [bay,park] of [[-4.45,-15.8],[-1.5,-14.1]]){
    const r=4.5,entry=-5.7,startZ=bay-r;
    for(let i=0;i<=40;i++)carAt(entry,-11.25+(startZ+11.25)*i/40,0);
    for(let i=0;i<=70;i++){const a=i*Math.PI/140;carAt(entry-r*(1-Math.cos(a)),startZ+r*Math.sin(a),a);}
    for(let i=0;i<=45;i++)carAt(entry-r+(park-entry+r)*i/45,bay,Math.PI/2);
  }
  stop('Street approach · closed gate',1.72,-11.8,0);
  via([1.72,-13.1]);operate('Move closer to operate the door.');
  check(!gate.userData.open,'Gate opened out of reach');
  via([1.72,-10.0]);space.move(feet,0,1.3);
  check(feet.z< -9.60 && feet.z> -9.8,'Closed gate did not block from street');
  via([1.72,-11.35]);operate('Door open');
  check(gate.userData.open && Math.abs(gate.rotation.y+Math.PI/2)<.001,'Gate did not open inward');
  stop('Street approach · leaf open',2.45,-11.6,-14);
  via([1.72,-10.3],[1.72,-9.45]);blocked('closed endpoint');
  via([1.72,-8.83]);blocked('closing mid-sweep');
  via([1.72,-7.55]);operate('Door closed');
  stop('Garden side · latched gate',1.72,-7.55,180);
  via([1.72,-8.83]);blocked('opening mid-sweep');
  via([1.10,-8.83]);blocked('open endpoint');
  via([1.72,-7.55]);
  space.move(feet,0,-2.8);check(feet.z> -9.30 && feet.z< -9.12,'Closed gate did not block from garden');
  via([1.72,-7.5],[4.5,-7.5]);space.move(feet,0,-3.3);
  check(feet.z> -9.30 && feet.z< -9.12,'Garden fence did not block');
  via([4.5,-7.55]);
  stop('Entry planting and frontage',4.5,-6.9,58);
  via([4.5,-5.7]);space.move(feet,4.2,0);
  check(feet.x>7.23 && feet.x<7.50,'Expected clear space under crown, then blocked by entry trunk');
  via([4.5,-5.7],[1.72,-3.4]);
  visit('Gate to front porch',1.72,1.9,0,180);
  via([1.72,3.55],[1.72,5.75],[1.72,1.9],[1.72,-3.4]);
  via([-4.9,-4.5],[-5.7,-8.4],[-5.7,-11.8],[-1.2,-11.8]);
  space.move(feet,0,3.4);check(feet.z< -9.60 && feet.z> -9.84,'Outside fence did not block');
  via([-1.2,-11.25],[-5.7,-11.8]);
  stop('Open drive mouth',-5.7,-11.8,-18);
  via([-5.7,-8.3],[-7.0,-6.3],[-9.35,-4.45]);
  extra.closeDrive?.();
  stop('Turn west into both carport bays',-8.5,-3.25,270);
  if(data.vehicles){
    // Same westward tour through both stalls in the occupied study. The old
    // centreline goes through two vehicles. Use the aisle and the store landing.
    via([-10.65,-2.62],[-14.95,-2.62],[-16.28,-2.62],[-16.28,-1.50],
        [-16.28,.70],[-14.96,.83],[-13.15,3.2]);
  }else via([-11.85,-4.5],[-15,-4.5],[-15,-1.5],[-10.6,-1.5],[-13.15,-1.5],[-13.15,3.2]);
  stop('West canopy from the parking court',-12.1,2.4,-30);
  stop('West garden and carport',-13.15,6.65,-46);
  via([-12.9,9.4]);space.move(feet,-4,0);check(feet.x> -15.82 && feet.x< -15.60,'West trunk did not block');
  via([-12.9,9.4],[-10,16],[-6,18.7]);
  stop('Rear garden and terrace',-6,18.7,66);
  via([-3.15,17.6]);space.move(feet,0,3.15);check(feet.z>19.5 && feet.z<19.76,'Rear trunk did not block');
  via([-3.15,18.6],[7,19.5]);
  stop('Rear canopy across the terrace lawn',7.6,20.8,-94);
  extra.circuit?.();
  via([14.2,17],[14.2,4.2],[13.2,-4.4],[9.2,-7.4],[4.6,-7.9],[1.72,-7.75]);
  operate('Door open');
  stop('Return · gate open from the garden',1.72,-7.75,180);
  via([1.72,-10.9]);operate('Door closed');
  check(!gate.userData.open,'Gate failed to latch on return');
  via([1.72,-11.8]);
  return {interactions,carport_check:{body_m:[1.8,4.3],turn_radius_m:4.5,bays:2,ground_and_obstacle_samples:samples},
    final_feet:position(feet)};
}
function walkRoute(io){return houseSiteRoute(io);}
walkRoute.start='Street · pedestrian gate';
walkRoute.views=[[0,-5],[90,8],[180,-6],[270,4]];
walkRoute.overview=true;
