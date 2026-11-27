// Supplemental route. All eight prior stop lists remain mandatory.
function walkRoute({via,visit}){
  const V=vehicleStudy,garage=model.children.flatMap(g=>g.children).find(m=>m.userData.part.door?.kind==='garage');
  const send=(k,v)=>{const e=$('v-'+k);e.value=v;e.dispatchEvent(new Event(e.type==='range'?'input':'change'));};
  const door=open=>{
    if(!!garage.userData.open!==open){update();const d=garage.position.clone().sub(camera.position);
      heading=Math.atan2(d.x,d.z);tilt=Math.atan2(d.y,Math.hypot(d.x,d.z));update();
      host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));}
    if(!!garage.userData.open!==open)throw Error('Sectional did not respond');
  };
  via([-3.95,-1.28],[-3.95,3.87]);door(true);via([-3.95,5.42],[-4.98,5.64]);
  visit('RAV · fixed console beside west bay',-5.22,6.49,-.30,260);
  via([-4.98,6.70]);visit('RAV · flush deck and inner reveal',-4.60,7.55,-.30,110);
  via([-4.98,6.70],[-4.98,5.64],[-3.20,5.42]);
  send('h',1.825);if(V.state().h!==1.825)throw Error('Unloaded full stroke not reached');
  visit('RAV · double scissors at full stroke',-2.85,6.41,-.30,325);
  send('h',0);via([-2.65,7.88]);send('location','lift');send('h',.60);
  if(V.state().loc!=='lift'||V.state().h!==.60)throw Error('Dacia not raised');
  visit('RAV · underbody pad scenario',-2.65,7.88,-.30,252);
  send('h',0);send('location','bay');via([-2.65,5.42],[-3.95,5.42],[-3.95,3.87]);door(false);
  via([-3.95,-1.28],[1.72,-3.4]);
}
walkRoute.alignment='house-aligned-v1';
walkRoute.views=[[0,-20],[69,12],[179,-13],[279,5]];
