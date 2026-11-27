function walkRoute({via,visit}){
  const V=vehicleStudy,store=model.children.find(g=>g.userData.name==='Detached two-car carport').children.filter(m=>m.userData.part.door);
  const send=(id,value,type='change')=>{const e=$('v-'+id);e.value=value;e.dispatchEvent(new Event(type,{bubbles:true}));};
  function E(m,open){
    if(!!m.userData.open===open)return;update();
    const d=m.position.clone().sub(camera.position);heading=Math.atan2(d.x,d.z);tilt=Math.atan2(d.y,Math.hypot(d.x,d.z));update();
    host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));if(!!m.userData.open!==open)throw Error('Leaf did not respond '+feet.toArray());
  }
  const car=id=>{send('car',id);if(V.state().id!==id)throw Error('Car selection '+$('v-warning').textContent);};
  const garage=model.children.flatMap(g=>g.children).find(m=>m.userData.part.door?.kind==='garage');
  send('bay','center');via([-8.54,-3.31],[-10.52,-2.62]);
  visit('Short bay · Dacia at common datum',-10.46,-2.53,-.45,276);
  car('mercedes');visit('Short bay · Mercedes at common datum',-10.46,-2.53,-.45,276);
  via([-15.93,-2.62],[-16.40,-2.40],[-16.47,-2.275]);E(store[0],true);
  via([-16.725,-2.26],[-16.83,-2.22],[-16.865,-2.13],[-17.25,-2.13]);visit('Technical store · past parked Mercedes',-17.64,-1.97,-.30,100);
  via([-17.25,-2.13],[-16.865,-2.13],[-16.83,-2.22],[-16.725,-2.26],[-16.47,-2.275]);E(store[0],false);
  // The 119 mm rear gap is not a passage. Retrace the aisle, then go
  // around the FRONT bumper and the open outer side to reach the garden door.
  via([-16.40,-2.47],[-15.93,-2.62],[-10.52,-2.62],[-10.51,.75],[-17.945,1.47]);E(store[1],true);
  visit('Garden store · around parked Mercedes',-17.945,-.411,-.30,95);
  via([-17.945,1.47]);E(store[1],false);via([-10.51,1.35],[-9.96,-2.65]);
  send('ac','on');visit('KNAUS · estimated rooftop AC',-10.43,-3.14,-.45,256);
  send('ac','off');visit('KNAUS · factory height restored',-10.43,-3.14,-.45,256);
  via([-8.54,-3.31],[-3.95,-1.28],[-3.95,3.88]);E(garage,true);
  // Enter the side aisle BEFORE loading the vehicle, as a real walker.
  via([-3.95,5.16],[-2.66,5.23],[-2.64,7.88]);E(garage,false);
  send('location','lift');send('h','.40','input');
  if(V.state().loc!=='lift'||V.state().h!==.4)throw Error('Could not load lift: '+$('v-warning').textContent);
  car('dacia');visit('Workshop · Dacia closed sectional',-2.65,7.88,-.30,254);
  car('mercedes');visit('Workshop · Mercedes closed sectional',-2.65,7.88,-.30,254);
  send('door','open');if(!V.fit().open)throw Error('Sectional did not open');car('dacia');
  visit('Workshop · Dacia open sectional',-2.65,7.88,-.30,254);
  car('mercedes');visit('Workshop · Mercedes open sectional',-2.65,7.88,-.30,254);
  // The near mirror narrows the side aisle. Return around the front of the
  // tool divider and through the existing pedestrian leaf, not via the bonnet.
  const pedestrian=garage.parent.children.find(m=>m.userData.part.door&&m!==garage);
  via([-2.60,7.88],[-2.60,5.59],[-1.05,5.59]);E(pedestrian,true);
  via([-1.05,4.26]);E(pedestrian,false);via([-3.95,3.88]);E(garage,false);
  send('h','0','input');send('location','bay');if(V.state().loc!=='bay')throw Error('Return refused');
  via([-3.95,-1.28],[-8.54,-3.31]);visit('Short bay · Mercedes returned',-10.46,-2.53,-.45,276);
  via([-8.54,-3.31],[1.72,-3.4]);return {final:V.state(),sectionalOpen:V.fit().open,bothStoresShut:store.every(m=>!m.userData.open)};
}
walkRoute.alignment='house-aligned-v1';
walkRoute.views=[[0,-14],[65,12],[180,-9],[286,6]];
