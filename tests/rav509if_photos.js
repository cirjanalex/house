// Same supported eye station and orthographic projection for old and new
// models. Only architectural overhead is cut in plan; never move a camera
// between versions to hide clipping. No source pages, labels or raster art.
const V=vehicleStudy,L=V.groups.lift,send=(k,v)=>{const e=$('v-'+k);e.value=v;e.dispatchEvent(new Event(e.type==='range'?'input':'change'));};
const box=m=>new T.Box3().setFromObject(m,true);
const shot=(n,x,z,aim)=>{const y=space.support(x,z,-.30,.002);
  check(Math.abs(y+.30)<.001&&space.tryMove(new T.Vector3(x,y,z),x,z),'photo stance '+n);
  photo(n,[x,y+1.80,z],aim,68);
};
const fixed=!!data.rav509if;
report.measurements={name:L.userData.name,eye:1.80,fixed};
function plan(n){
  $('level').value='0';refresh();const overhead=meshes.filter(m=>m.userData.part.overhead),was=overhead.map(m=>m.visible);
  for(const m of overhead)m.visible=false;
  const w=9,h=5.4,c=new T.OrthographicCamera(-w/2,w/2,h/2,-h/2,.1,60);
  c.position.set(-3.51,20,7.68);c.up.set(0,0,-1);c.lookAt(-3.51,0,7.68);c.updateProjectionMatrix();renderer.render(scene,c);
  report.photos[n]=renderer.domElement.toDataURL('image/png');
  overhead.forEach((m,i)=>m.visible=was[i]);$('level').value='all';refresh();
}
plan('empty-flush-plan');shot('empty-flush-eye',-3.46,5.26,[-4.21,-.26,7.81]);
send('h',1.20);check(V.state().h===1.20,'matched raised station');shot('empty-raised-eye',-2.69,5.52,[-4.11,.34,7.78]);
shot('console-and-wells',-4.78,5.52,[-5.09,.26,7.40]);plan('empty-raised-plan');
send('h',0);send('location','lift');send('h',.60);check(V.state().h===.60&&V.state().loc==='lift','common loaded comparison');
shot('dacia-lift-eye',-2.65,5.40,[-4.04,.61,7.63]);plan('dacia-lift-plan');
$('v-reset').click();
