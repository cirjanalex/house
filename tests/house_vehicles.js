function walkRoute({via,visit}){
  const G=vehicleStudy.groups,at=vehicleStudy.state,door=model.children.flatMap(g=>g.children).find(m=>m.userData.part.door?.kind==='garage');
  const control=(id,v,type)=>{const e=$(id);e.value=v;e.dispatchEvent(new Event(type,{bubbles:true}));};
  function operate(m,open){
    if(!!m.userData.open===open)return;
    update();const q=m.position.clone().sub(camera.position);
    heading=Math.atan2(q.x,q.z);tilt=Math.atan2(q.y,Math.hypot(q.x,q.z));update();
    host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
    if(!!m.userData.open!==open)throw Error('Door did not respond at '+feet.toArray());
  }
  const stores=model.children.find(g=>g.userData.name==='Detached two-car carport').children.filter(m=>m.userData.part.door);
  via([-8.54,-3.31]);
  visit('Long bay · coupling and entry beam',-10.48,-4.12,-.45,266);
  via([-10.53,-2.63]);
  visit('Dacia · four headlamps',-10.06,-1.21,-.45,269);
  via([-10.54,-2.60]);visit('Occupied aisle · caravan and sedan',-14.06,-2.62,-.45,242);
  via([-16.30,-2.62]);visit('Dacia · early rear lamps',-16.51,-1.44,-.45,91);
  via([-16.34,-2.075]);operate(stores[0],true);
  visit('Carport technical store · inside',-17.64,-1.97,-.30,100);
  via([-17.31,-2.075],[-16.28,-2.075]);operate(stores[0],false);
  via([-16.26,.69],[-17.94,1.47]);operate(stores[1],true);
  visit('Carport garden store · inside',-17.945,-.411,-.30,95);
  via([-17.945,1.47]);operate(stores[1],false);
  via([-16.26,1.35],[-13.1,1.35],[-10.53,.91],[-8.40,-2.63],[-3.95,-1.28],[-3.95,3.88]);
  operate(door,true);via([-3.95,5.30]);
  visit('Workshop · recessed platforms at rest',-4.27,6.10,-.30,15);
  via([-3.95,5.3],[-3.95,3.88]);operate(door,false);
  control('v-location','lift','change');control('v-h','.40','input');
  if(at().loc!=='lift'||at().h!==.4)throw Error('Loaded layout selection failed');
  operate(door,true);via([-3.95,5.23],[-2.69,5.24],[-2.68,6.11]);
  visit('Workshop · loaded double scissors',-2.69,7.28,-.30,255);
  via([-2.66,9.96],[-2.76,10.22]);
  visit('Workshop · raised roof and clearances',-3.89,10.29,-.30,180);
  via([-2.68,10.26],[-2.68,5.24],[-3.95,5.24]);operate(door,false);
  control('v-location','bay','change');control('v-h','1.45','input');control('v-x','-3.7','input');
  if(at().loc!=='bay'||at().h!==1.45||at().x!==-3.7)throw Error('Alternate empty lift position failed');
  visit('Workshop · extended empty mechanism',-4.68,5.88,-.30,27);
  via([-3.95,5.24]);operate(door,true);via([-3.95,3.88]);operate(door,false);
  $('v-reset').click();if(at().loc!=='bay'||at().h!==0)throw Error('Reset unsuccessful');
  via([-3.95,-1.21],[-9.2,-2.73]);
  visit('Carport · restored parking',-9.86,-3.17,-.45,271);
  via([-8.54,-3.31],[1.72,-3.4]);
  return {bothStoresRelatched:stores.every(m=>!m.userData.open),final:at(),objects:[G.car.uuid,G.trailer.uuid]};
}
walkRoute.alignment='house-aligned-v1';
walkRoute.views=[[0,-17],[68,8],[174,-10],[282,5]];
