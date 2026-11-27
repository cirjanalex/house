// Matched physical model images, NOT a drawing overlay. No imported pixels.
const V=vehicleStudy,changed=!!data.garageWall,annex=model.children.find(g=>g.userData.name.startsWith('Attached annex'));
const wall=changed?annex.children.filter(m=>m.userData.part.component==='workshop masonry'):
  model.children.find(g=>g.userData.use==='Long divider / tool storage').children;
const bounds=ms=>ms.reduce((b,m)=>b.union(new T.Box3().setFromObject(m,true)),new T.Box3());
const hit=(o,d,ms)=>ray(o,d,ms)[0].point;
const control=(k,v)=>{const e=$('v-'+k);e.value=v;e.dispatchEvent(new Event(e.type==='range'?'input':'change'));};
control('location','lift');check(V.state().loc==='lift','Dacia not shown at rest');
const z=7.27,solid=bounds(wall);
const left=hit([-5.6,.1,z],[-1,0,0],annex.children).x,east=hit([-.89,.1,z],[1,0,0],annex.children).x;
const tread=annex.children.find(m=>m.userData.part.walkable),step=bounds([tread]);
const zx=-2.17,front=hit([zx,.3,5.43],[0,0,-1],annex.children).z,
      rear=hit([zx,.3,10.05],[0,0,1],annex.children).z;
const X=[left,solid.min.x,solid.max.x,step.min.x,east],Z=[front,solid.min.z,solid.max.z,rear];
const B=V.fit().pair, L=V.groups.lift;
const rim=bounds(L.children.filter(m=>m.userData.part.component==='fixed side rim'));
report.measurements={X,Z,stepSpan:step.max.x-step.min.x,pitGap:solid.min.x-rim.max.x,
  rest:Object.fromEntries(Object.entries(B).map(([k,f])=>[k,{side:f.masonry??f.divider,bench:f.bench,ends:f.ends}]))};
// Walk-eye height above the actual supported floor; not a replacement for a walk.
const shots=[
  ['bay-to-wall',[-3.26,5.25],[-2.31,1.33,8.22]],
  ['passage-to-wall',[-1.12,5.35],[-2.06,1.47,7.78]],
  ['hobby-return',[-1.43,10.91],[-2.26,1.35,8.25]]];
for(const [name,[x,z],aim] of shots){
  const y=space.support(x,z,-.30,.002);check(space.tryMove(new T.Vector3(x,y,z),x,z),'Unsupported camera '+name);
  photo(name,[x,y+1.80,z],aim,70);
}
$('level').value='0';refresh();
// Remove only overhead layers for the orthographic cutaway. Retain wall,
// actual cars, benches, step, reveal and all eligible ground-level objects.
for(const m of meshes)if(m.userData.part.overhead)m.visible=false;
const h=8.1,w=h*5/3,cam=new T.OrthographicCamera(-w/2,w/2,h/2,-h/2,.1,60);
cam.position.set(-2.90,30,7.74);cam.up.set(0,0,-1);cam.lookAt(-2.90,0,7.74);cam.updateProjectionMatrix();
renderer.render(scene,cam);
const cv=document.createElement('canvas');cv.width=1000;cv.height=600;
const c=cv.getContext('2d');c.drawImage(renderer.domElement,0,0,1000,600);
const point=(x,z)=>{const p=new T.Vector3(x,0,z).project(cam);return [(p.x+1)*500,(1-p.y)*300];};
const ink='#133241',amber='#f8cd73',blue='#96e7fb',f=n=>n.toFixed(3).replace(/0$/,'');
function line(a,b,color,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();}
function label(x,y,text,color='#fff',size=15){
  c.font=`600 ${size}px system-ui`;const wid=c.measureText(text).width;
  c.fillStyle='rgba(17,38,48,.95)';c.fillRect(x-5,y-size-3,wid+10,size+9);
  c.fillStyle=color;c.fillText(text,x,y);
}
const px=x=>point(x,0)[0],pz=z=>point(0,z)[1];
// Actual end faces projected to dimension ticks above/in front of garage.
const tx=pz(front)-12,tz=px(east)+32;
line([px(left),tx],[px(east),tx],blue);
for(const x of X)line([px(x),tx-6],[px(x),tx+8],blue);
line([tz,pz(front)],[tz,pz(rear)],amber);
for(const zz of Z)line([tz-7,pz(zz)],[tz+10,pz(zz)],amber);
for(let i=0;i<3;i++)label(tz+15,(pz(Z[i])+pz(Z[i+1]))/2+5,f(Z[i+1]-Z[i])+' m',amber);
c.fillStyle='rgba(17,38,48,.95)';c.fillRect(0,0,1000,38);
c.font='600 19px system-ui';c.fillStyle='white';c.fillText((changed?'AFTER  /  Fixed workshop wall':'BEFORE  /  Low storage proxy')+'     •     Dacia at rest     /     Model cutaway',18,26);
// Bilateral wall boundary highlighted; don't paint in a replacement object.
c.strokeStyle=amber;c.lineWidth=2;c.strokeRect(px(solid.min.x),pz(solid.min.z),px(solid.max.x)-px(solid.min.x),pz(solid.max.z)-pz(solid.min.z));
label(18,92,'CROSS SECTION  /  m',blue);const rows=['West face → feature','Feature thickness','Feature → tread edge','Edge → house face','Total inside width'];
const dx=X.slice(1).map((v,i)=>v-X[i]);
rows.forEach((r,i)=>label(18,120+i*25,`${r}:  ${f(i===4?east-left:dx[i])}`,blue,14));
label(18,262,'Actual tread: '+f(step.max.x-step.min.x)+' m',blue,14);
label(18,293,'Depth: '+f(rear-front)+' m',amber,14);
label(18,321,'Mirror → feature: '+f(B.dacia.masonry??B.dacia.divider)+' m',amber,14);
c.fillStyle='rgba(17,38,48,.93)';c.fillRect(0,565,1000,35);c.fillStyle='white';c.font='15px system-ui';
c.fillText('Front / garage door at top. Dimensions between model faces. Cyan: west → house. Amber: front → hobby.',18,588);
report.photos['dimensioned-plan']=cv.toDataURL('image/png');
