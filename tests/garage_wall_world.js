// Fresh model-space witnesses. Real intersected faces, not part coordinates.
// Rays into the marked feature also run against the whole visible scene.
const D=report.measurements, V=vehicleStudy;
const eq=(a,b,k)=>check(Math.abs(a-b)<.00006,`${k}: ${a} != ${b}`);
const walls=meshes.filter(m=>m.userData.part.component==='workshop masonry');
check(walls.length===1&&!walls[0].parent.userData.furniture,'not one fixed architectural wall');
const solid=walls[0],annex=solid.parent.children;
const paint=meshes.filter(m=>m.parent.userData.name.startsWith('Annex · painted')&&m.userData.part.overhead);
const roofs=meshes.filter(m=>m.parent.userData.name.startsWith('Annex asymmetric'));
const hit=(o,d,ms)=>{const h=ray(o,d,ms)[0];check(h,'Miss '+o+'/'+d);return h;};
const visible=()=>model.children.filter(g=>g.visible).flatMap(g=>g.children.filter(m=>m.visible));
const walkAt=(x,z)=>space.tryMove(new T.Vector3(x,-.3,z),x,z);
const tread=annex.find(m=>m.userData.part.walkable&&m.position.y<-.2);
const landing=annex.find(m=>m.userData.part.walkable&&m!==tread);
const stepX=hit([-.9,-.22,6.30],[1,0,0],[tread]).point.x;
const upperX=hit([-.52,-.08,6.30],[1,0,0],[landing]).point.x;
const xs=[],zs=[];
for(const [z,y] of [[6.05,.12],[7.27,.95],[7.92,1.77],[9.39,.10]]){
  // Below the sills so even the window stations hit wall, not glass.
  // At the house doorway the landing's riser is the wall-face datum.
  const left=hit([-5.57,-.11,z],[-1,0,0],annex).point.x;
  const right=z>5.85&&z<6.75?hit([-.51,-.08,z],[1,0,0],[landing]).point.x:
    hit([-.79,.80,z],[1,0,0],annex).point.x;
  const near=hit([-2.40,y,z],[1,0,0],visible());
  const far=hit([-1.93,y,z],[-1,0,0],visible());
  check(near.object===solid&&far.object===solid,'wrong first face');
  const chain=[near.point.x-left,far.point.x-near.point.x,stepX-far.point.x,right-stepX];
  chain.forEach((v,i)=>eq(v,[3.50,.23,1.42,.30][i],'X'+i));
  eq(right-left,5.45,'inside width');eq(right,upperX,'landing alignment');
  xs.push({z,y,faces:[left,near.point.x,far.point.x,stepX,right],chain});
}
for(const [x,y] of [[-2.27,.12],[-2.18,1.50],[-2.08,2.10]]){
  const start=hit([x,y,5.41],[0,0,-1],annex),end=hit([x,y,10.0],[0,0,1],annex);
  const edge1=hit([x,y,5.43],[0,0,1],visible()),edge2=hit([x,y,10.07],[0,0,-1],visible());
  check(edge1.object===solid&&edge2.object===solid,'wrong end return');
  const f=[start.point.z,edge1.point.z,edge2.point.z,end.point.z];
  const chain=f.slice(1).map((v,i)=>v-f[i]);chain.forEach((v,i)=>eq(v,[1,3.70,.97][i],'Z'+i));
  eq(f[3]-f[0],5.67,'inside length');zs.push({x,y,faces:f,chain});
}
D.X=xs;D.Z=zs;
D.cap=[];
for(const x of [-2.2899,-2.175,-2.0601])for(const z of [5.9201,6.30,7.87,9.6199]){
  const top=hit([x,5,z],[0,-1,0],walls).point.y;
  const inner=hit([x,1.6,z],[0,1,0],paint).point.y,skin=hit([x,6,z],[0,-1,0],roofs).point.y;
  const floor=hit([x,0,z],[0,-1,0],annex.filter(m=>m.userData.part.slab)).point.y;
  eq(top,inner,'cap/lining');eq(skin-inner,.16,'lining/outer roof');
  D.cap.push({x,z,top,height:top-floor,skin});
}
// Opposite pitch is over hobby, not over the corrected length.
for(const z of [10.782,11.83]){
  const x=-2.18,inner=hit([x,2.32,z],[0,1,0],paint).point.y;
  eq(hit([x,6,z],[0,-1,0],roofs).point.y-inner,.16,'rear/ridge lining');
  check(!ray([x,5,z],[0,-1,0],walls).length,'phantom extension under rear pitch');
}
D.step=[-.77,-.50,-.17].map(x=>{
  const h=hit([x,.30,6.30],[0,-1,0],annex);eq(h.point.y,space.support(x,6.3,0),'actual step support');
  return {x,surface:h.point.y};});
eq(D.step[1].surface-D.step[0].surface,.15,'first rise');eq(D.step[2].surface-D.step[1].surface,.15,'second rise');
eq(upperX-stepX,.30,'going');
for(const on of [true,false]){
  if($('items').checked!==on)$('items').click();
  for(const z of [6.16,7.25,8.34,9.4]){
    for(const [x,dx] of [[-2.88,1],[-1.54,-1]]){
      const pos=new T.Vector3(x,-.30,z);check(walkAt(x,z),'bad starting stance '+[x,z]);
      space.move(pos,dx*1.28,0);
      check(dx>0?pos.x< -2.45&&pos.x> -2.54:pos.x> -1.90&&pos.x< -1.82,'walk crossed wall or ghost collider '+pos.x);
      eq(pos.y,-.30,'supported blocked walker');
    }
  }
  // Former east edge was X=-1.935. A 170 mm walker at -1.87
  // clears today's face, but would intersect the obsolete shelf.
  check(walkAt(-1.87,7.85),'old storage ghost');
  check(hit([-2.6,1.5,7.5],[1,0,0],visible()).object===solid,'switch removed architecture');
}
$('items').click();
check(!$('inventory-list').textContent.includes('Long divider')&&!data.groups.some(g=>g.use?.includes('Long divider')),'obsolete inventory');
D.support={going:upperX-stepX,eye:WALK_BODY.eye,collisions:'both sides at four stations, furnishings on and off'};
