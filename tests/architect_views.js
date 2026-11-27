// Supplemental paired cameras. All image bytes come from the local WebGL canvas.
check($('items').checked && $('finish').checked,'Need the complete furnished building');
if($('canopy').getAttribute('aria-pressed')==='true')$('canopy').click();
const pics=report.measurements.cameras={};
function view(name,x,y,z,u,v,w,fov){
  pics[name]={eye:[x,y,z],target:[u,v,w],verticalFov:fov};
  photo(name,[x,y,z],[u,v,w],fov);
}
view('08-west-gable',-16,1.35,15.2,-4.4,1.85,9.3,49);
view('07-west-elevation',-15,1.35,8.85,-5.9,1.6,8.85,41);
view('08-garage-inside',-2.95,1.50,7.86,-5.90,1.34,7.85,72);
view('06-hobby-and-terrace',-.80,1.35,22.35,.05,1.6,14.25,52);
view('04-rear-corner',16.8,1.35,26.8,5.2,2.1,13.2,45);
view('02-east-side',19,1.35,-5,9.8,2.0,4.7,53);
view('01-front-court',-.5,1.35,-8.70,1.40,2.12,3.8,62);
view('09-annex-entry',-5.55,1.35,-.65,-2.81,1.02,4.8,55);
view('013-living-to-kitchen',10.22,1.80,9.15,5.00,1.09,12.33,67);
view('014-kitchen-to-garden',4.72,1.80,9.83,6.78,1.16,13.26,68);
const door=meshes.find(m=>m.userData.part.leafStyle==='greyPanel');
const hallEye=[3.78,1.80,6.04],aim=[1.70,1.24,4.05];
const picks=report.measurements.hallPicks={};
for(const open of [false,true]){
  if(!!door.userData.open!==open)check(door.userData.toggle(new T.Vector3(...[2,0,5.6])),'Entry did not operate');
  const label=open?'open':'shut';
  view('hall-report-'+label,...hallEye,...aim,55);
  view('hall-from-entrance-'+label,1.78,1.80,3.63,.65,1.05,4.83,72);
  picks[label]={};
  for(const [name,target] of [['panel',[2.45,1.47,4.62]],['cubbies',[.80,.52,4.98]],
      ['upper-leaf',open?[1.07,2.12,3.53]:[1.63,2.12,2.98]]]){
    const r=new T.Raycaster(new T.Vector3(...hallEye),new T.Vector3(...target).sub(new T.Vector3(...hallEye)).normalize());
    const h=r.intersectObjects(model.children.filter(g=>g.visible),true)[0];
    const m=h.object.userData.part?h.object:h.object.parent;
    picks[label][name]={group:m.parent.userData.name,slot:m.userData.slot,hit:h.point.toArray()};
  }
}
