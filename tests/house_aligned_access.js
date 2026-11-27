function walkRoute({via,visit}){
  if(![2,3].includes(data.aligned.repair))throw Error('Requires the repaired terraces and thresholds');
  const meshes=model.children.flatMap(g=>g.children);
  const ground=meshes.filter(m=>m.userData.part.groundStrips||m.userData.part.walkable||
    m.userData.part.slab&&!m.parent.userData.roof);
  const samples=[],checks={};
  function sample(name,x,z,expected){
    via([x,z]);update();
    const ray=new T.Raycaster(new T.Vector3(x,feet.y+.12,z),new T.Vector3(0,-1,0));
    const hit=ray.intersectObjects(ground)[0];
    if(!hit||Math.abs(feet.y-expected)>.0022||Math.abs(hit.point.y-feet.y)>.00025||
       Math.abs(camera.position.y-1.80-feet.y)>1e-8)throw Error('Walking/support mismatch: '+[name,x,z,feet.y,hit?.point.y]);
    samples.push({name,x,z,feet:feet.y,mesh:hit.point.y,eye:camera.position.y});
  }
  const deck=z=>-.01*(z-13.2),step=(z,i)=>-.45+(.45+deck(z))*(3-i)/3;
  via([-3.95,-1.30]);
  visit('Garage ramp · from court',-3.95,-.20,-.45,0);
  const toe=4.70-.15/.035;
  for(let i=0;i<=26;i++){
    const z=toe+.004+(4.699-toe-.004)*i/26;sample('striated ramp',-3.95,z,-.30+(z-4.70)*.035);
  }
  function garage(open){
    const m=meshes.find(m=>m.userData.part.door?.kind==='garage');
    if(!!m.userData.open!==open){
      update();const v=m.position.clone().sub(camera.position);heading=Math.atan2(v.x,v.z);tilt=Math.atan2(v.y,Math.hypot(v.x,v.z));update();
      host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
      if(!!m.userData.open!==open)throw Error('Exterior garage leaf did not respond');
    }
  }
  via([-3.95,3.98]);garage(true);via([-3.95,5.25]);
  visit('Garage threshold · inside',-3.95,5.37,-.30,180);
  via([-3.95,4.24]);garage(false);checks.garageReturnedLatched=true;
  via([-3.95,.36],[-9.95,.18]);
  for(let i=0;i<13;i++){
    const a=(i+.45)*Math.PI/26;sample('fan flag',-10.52+3.99*Math.sin(a),4.74-3.99*Math.cos(a),-.435);
  }
  visit('West annex · flag path',-6.53,7.035,-.435,172);
  for(const z of [8.34,11.385,14.43,16.17])sample('west flag',-6.53,z,-.435);
  via([-5.945,16.17],[-2.585,16.17]);visit('Rear annex · return flags',-1.325,16.17,-.435,90);
  sample('west lower',-.275,16.10,step(16.10,2));sample('west upper',.025,16.10,step(16.10,1));
  sample('west dining edge',.84,16.1,deck(16.1));
  visit('West terrace · lateral ascent',1.30,16.1,deck(16.1),100);
  via([1.30,14.0],[1.30,13.48],[4.88,13.48]);
  for(const z of [13.35,13.65,14,14.42,14.95,15.38,15.91,16.41,16.75]){
    sample('deck fall',4.88,z,deck(z));
  }
  for(const mode of [false,true]){
    if(($('canopy').getAttribute('aria-pressed')==='true')!==mode)$('canopy').click();
    for(const x of [.31,3.98,4.23,5.79]){
      if(space.tryMove(feet.clone(),x,17))throw Error('Walker can occupy rear canopy upright '+x);
    }
  }
  // Follow the furniture-free east aisle; inspect both bearings from within it.
  via([4.88,14.72]);visit('East terrace · lateral descent',5.55,14.72,deck(14.72),96);
  sample('east upper',6.11,14.72,step(14.72,1));sample('east lower',6.41,14.72,step(14.72,2));
  via([6.91,14.72],[6.91,17.92],[13.28,17.92],[13.54,6.51],[13.10,-3.18],[9.90,-3.40],[1.72,-3.40]);
  return {samples,checks};
}
walkRoute.alignment='house-aligned-v1';
