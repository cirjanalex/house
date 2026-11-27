// Actual default body and UI. Loop around BOTH returns, then the hobby
// threshold and the two house steps, and retrace to the exterior start.
function walkRoute({via,visit}){
  const sectional=model.children.flatMap(g=>g.children).find(m=>m.userData.part.door?.kind==='garage');
  function operate(open){
    if(!!sectional.userData.open===open)return;update();
    const d=sectional.position.clone().sub(camera.position);
    heading=Math.atan2(d.x,d.z);tilt=Math.atan2(d.y,Math.hypot(d.x,d.z));update();
    host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
    if(!!sectional.userData.open!==open)throw Error('Sectional did not respond');
  }
  via([-3.95,-1.28],[-3.95,3.87]);operate(true);
  via([-3.95,5.41]);
  visit('Front opening · garage wall',-2.17,5.43,-.30,0);
  via([-1.28,5.43],[-1.28,7.68]);
  visit('Passage · finished east face',-1.23,8.22,-.30,242);
  via([-1.25,10.10]);
  visit('Hobby opening · garage wall',-2.17,10.10,-.30,185);
  via([-3.14,10.10],[-3.14,8.14]);
  visit('Workshop · finished west face',-3.28,7.42,-.30,47);
  via([-3.14,5.43],[-1.18,5.43],[-1.15,6.30]);
  visit('House step · intermediate tread',-.49,6.30,-.15,90);
  via([1.02,6.30],[-1.15,6.30],[-1.15,11.15]);
  visit('Hobby · return to passage',-2.93,11.20,-.30,330);
  via([-1.15,11.15],[-1.15,5.43],[-3.95,5.43],[-3.95,3.87]);operate(false);
  via([-3.95,-1.28],[1.72,-3.4]);
}
walkRoute.alignment='house-aligned-v1';
