// RAV-M01: real controls, both platforms. Never use placement metadata, nominal
// solid sizes or source joint coordinates to establish engagement/contact.
const V=vehicleStudy,L=V.groups.lift,D=report.measurements;
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),kind=m=>m.userData.part.component;
const box=m=>new T.Box3().setFromObject(m,true),ctr=m=>box(m).getCenter(v());
const send=(k,s)=>{const e=$('v-'+k);e.value=s;e.dispatchEvent(new Event('input'));};
const near=(a,b,msg,t=3e-6)=>check(Math.abs(a-b)<t,`${msg}: ${a} vs ${b}`);
const select=n=>L.children.filter(m=>kind(m)===n);
const tris=ms=>VFit.triangles(ms),tree=ts=>VFit.tree(ts.slice());
const sep=(a,b)=>VFit.nearest(a,b).m;
const along=(p,o,d)=>p.clone().sub(o).dot(d),axial=m=>v(0,0,1).transformDirection(m.matrixWorld);
function span(ts,o,d){
  let lo=Infinity,hi=-Infinity;
  for(const t of ts)for(const p of t.v){const s=along(p,o,d);lo=Math.min(lo,s);hi=Math.max(hi,s);}
  return [lo,hi];
}
// Distances to actual two-sided faces, including the internal bore surfaces.
function cuts(ts,p,d){
  const r=new T.Ray(p,d),hits=[];
  for(const t of ts){
    const hit=r.intersectTriangle(...t.v,false,v());
    if(hit)hits.push(along(hit,p,d));
  }
  return hits.sort((a,b)=>a-b).filter((n,i,a)=>i===0||n>a[i-1]+1e-6);
}
function floorAndDeck(side,ts){
  const bounds=tree(ts).b,p=box(side.plate),b=box(side.base);
  const ends=side.all.filter(m=>kind(m)==='fixed end rim').map(box).sort((a,b)=>a.min.z-b.min.z);
  const sides=side.all.filter(m=>kind(m)==='fixed side rim').map(box).sort((a,b)=>a.min.x-b.min.x);
  const c={wellFloor:bounds.min.y-b.max.y,deckUnderside:p.min.y-bounds.max.y,
    side:Math.min(bounds.min.x-sides[0].max.x,sides[1].min.x-bounds.max.x),
    end:Math.min(bounds.min.z-ends[0].max.z,ends[1].min.z-bounds.max.z)};
  check(Math.min(...Object.values(c))>.0005,'mechanism breaks deck/lining/floor envelope: '+JSON.stringify(c));
  return c;
}
const xx=v(1,0,0),ref=new Map(),lengths=[[],[]],legacy=[];
D.sweep=[];D.units='metres; negative section gaps denote a pin crossing structural material';
function measure(side,i,h,x){
  const {body,rod,bpin,hpin,all,plate}=side,tb=tris([body]),tr=tris([rod]),B=tree(tb),R=tree(tr);
  const ranges=[tb,tr].map((ts,i)=>{const mm=span(ts,v(),axial(i?rod:body));return mm[1]-mm[0];});
  lengths[i].push(ranges);
  const other=tree(tris(all.filter(m=>m.visible&&m!==body&&m!==rod)));
  const row={h,x,side:i,bodyLength:ranges[0],rodLength:ranges[1],
    bodyToOther:sep(B,other),rodToOther:sep(R,other),bodyToRod:sep(B,R)};
  D.sweep.push(row);
  if(!bpin||!hpin){legacy.push(row);return;}
  const bp=tris([bpin]),hp=tris([hpin]),cx=ctr(plate).x;
  const center=m=>{const p=ctr(m);p.x=cx;return p;};
  const a=center(bpin),b=center(hpin),e=b.clone().sub(a).normalize(),n=v().crossVectors(e,xx);
  near(axial(body).dot(e),1,'casing not on pin line');near(axial(rod).dot(e),1,'rod not on pin line');
  for(const m of [body,rod]){
    near(v().crossVectors(e,m.getWorldPosition(v()).sub(a)).length(),0,'offset from pin centre line');
  }
  row.pinCentres=[a.toArray(),b.toArray()];
  row.pinSpacing=a.distanceTo(b);
  function joint(m,p,ts,pints,targets){
    check(targets.length===2,'pin does not join a pair of real structural members');
    const ptree=tree(pints),shaft=span(pints,p,xx),sectionGaps=[],pinToMembers=[];
    const eyeToPin=sep(tree(ts),ptree);near(eyeToPin,0,'no eye/shaft contact');
    // The full-width shaft must actually go through *both* structural webs,
    // not terminate in an unattached boss, or just touch a rail at its edge.
    for(const t of targets){
      const tt=tris([t]),gap=sep(tree(tt),ptree);near(gap,0,kind(t)+' missed by pin');pinToMembers.push(gap);
      const origin=p.clone().addScaledVector(xx,-1);
      const walls=cuts(tt,origin,xx).map(q=>q-1);
      check(walls.length===2,'no finite web section through pivot');
      const overlap=Math.min(walls[1],shaft[1])-Math.max(walls[0],shaft[0]);
      sectionGaps.push(-overlap);
      check(shaft[0]<walls[0]-.002&&shaft[1]>walls[1]+.002&&overlap>.02,'pin fails to traverse web');
      const local=t.worldToLocal(p.clone().addScaledVector(xx,(walls[0]+walls[1])/2));
      if(!ref.has(t))ref.set(t,local);
      near(ref.get(t).distanceTo(local),0,'pin slides along its structural member');
      // In-plane edge depth of the pivot in the real convex link/rail, not
      // its rotated AABB: the actual pin section must be inside the web.
      const sample=p.clone();sample.x=ctr(t).x;
      for(const tri of tt){
        const normal=tri.t.getNormal(v());
        if(Math.abs(normal.x)>.99)continue;
        const depth=-along(sample,tri.v[0],normal);
        const radius=cuts(pints,sample,normal)[0];
        check(Number.isFinite(radius)&&depth-radius>.004,'pivot runs off a structural edge');
      }
    }
    // Open eye in the transverse direction, seated on the shaft across an
    // actual bearing width, not just an intersection at a single triangle.
    check(!cuts(ts,p.clone().addScaledVector(xx,-.1),xx).length,'no bore through actuator eye');
    let maxMismatch=0;
    for(const w of [-.009,0,.009])for(let k=0;k<6;k++){
      const q=p.clone().addScaledVector(xx,w),theta=k*Math.PI/3;
      const dir=v(0,Math.cos(theta),Math.sin(theta)),ring=cuts(ts,q,dir),pin=cuts(pints,q,dir);
      check(ring.length>=2&&pin.length===1&&ring[0]>.007&&ring[1]-ring[0]>.004,'not an annular bearing');
      maxMismatch=Math.max(maxMismatch,Math.abs(ring[0]-pin[0]));
    }
    near(maxMismatch,0,'shaft and eye bearing surface mismatch');
    // Measure actual distance to every NON-mating structural component too.
    const other=all.filter(q=>q!==m&&![body,rod,...targets].includes(q)&&q.visible);
    const unrelated=sep(ptree,tree(tris(other)));
    check(unrelated>.0002,'pin strikes a non-mating structural member: '+unrelated);
    return {eyeToPin,pinToMembers,sectionGaps,maxMismatch,unrelated};
  }
  row.bed=joint(bpin,a,tb,bp,all.filter(m=>kind(m)==='fixed scissor bed rail'));
  row.link=joint(hpin,b,tr,hp,all.filter(m=>kind(m)==='RAV scissor stage 2'&&axial(m).y>0));
  // Blind bore floor, lip and rod tip from world-space faces. No guessed
  // rod clipping plane. A solid (unbored) tube fails the axial ray test.
  const lip=span(tb,a,e)[1],tip=span(tr,a,e)[0];
  const back=cuts(tb,b,e.clone().negate())[0],bottom=row.pinSpacing-back;
  // The bored lug is not an ornament suspended next to the tube. Trace
  // material along off-centre chords from inside the eye into the solid
  // end of each rotating member: the two skins interlock over finite depth.
  function neck(ts,p,d){
    let depth=Infinity;
    for(const off of [-.006,.004]){
      const start=p.clone().addScaledVector(xx,off),r=new T.Ray(start,d),hits=[];
      for(const t of ts){
        const hit=r.intersectTriangle(...t.v,false,v());
        if(hit)hits.push([along(hit,start,d),-Math.sign(t.t.getNormal(v()).dot(d))]);
      }
      const seq=hits.sort((a,b)=>a[0]-b[0]).filter((q,i,a)=>!i||q[0]-a[i-1][0]>1e-6);
      check(seq.length>=4&&seq.slice(0,4).map(q=>q[1]).join(',')==='1,1,-1,-1','eye does not join rigid member');
      depth=Math.min(depth,seq[2][0]-seq[1][0]);
    }
    check(depth>.001,'insufficient actual eye-to-member overlap');return -depth;
  }
  row.bed.eyeNeckSigned=neck(tb,a,e);row.link.eyeNeckSigned=neck(tr,b,e.clone().negate());
  row.engagement=lip-tip;row.pocketReserve=tip-bottom;row.exposedToPin=row.pinSpacing-lip;
  check(row.engagement>.012&&row.pocketReserve>.01&&row.exposedToPin>.025,'lost engagement, bottomed or buried rod eye');
  let gapMin=Infinity,gapMax=-Infinity;
  for(const t of [.04,.5,.96])for(const d of [xx,n]){
    const q=a.clone().addScaledVector(e,tip+t*(lip-tip));
    for(const mesh of [tb,tr]){
      const pos=cuts(mesh,q,d),neg=cuts(mesh,q,d.clone().negate());
      check(pos.length===(mesh===tb?2:1),'section is not hollow casing around solid rod');
      near(pos[0],neg[0],'eccentric rod or pocket');
    }
    const clearance=cuts(tb,q,d)[0]-cuts(tr,q,d)[0];
    gapMin=Math.min(gapMin,clearance);gapMax=Math.max(gapMax,clearance);
  }
  check(gapMin>0&&gapMax<.001,'mating radial clearance: '+[gapMin,gapMax]);
  row.radialClearance=[gapMin,gapMax];row.envelope=floorAndDeck(side,[...tb,...tr,...bp,...hp]);
  const outsiders=all.filter(m=>![body,rod,bpin,hpin].includes(m)&&m.visible);
  row.sleeveAndRodToNonPins=sep(tree([...tb,...tr]),tree(tris(outsiders)));
  check(row.sleeveAndRodToNonPins>.0005,'actuator strikes unintended frame/deck/liner');
}
for(const [x,heights] of [[-3.90,[0,.005,.125,.3,.6,.9,1.2,1.5,1.75,1.82,1.825]],
                          [-3.30,[1.825,1.2,.6,.125,0]]]){
  send('x',x);near(V.state().x,x,'wall-axis command');near(V.state().z,7.8,'Z');
  const plates=select('platform').sort((a,b)=>ctr(a).x-ctr(b).x);
  check(plates.length===2,'two separate decks');
  for(const h of heights){
    send('h',h);near(V.state().h,h,'rejected empty height');
    if([0,.6,1.825].includes(h)&&x===-3.90||h===1.825&&x===-3.30){
      const label=`${x===-3.90?'default':'wall'}-${Math.round(1000*h)}`;
      photo(label+'-front',[-3.18,1.5,5.75],[x-.32,-.28+.40*h,7.88],62);
      if(h)photo(label+'-west-detail',[x+.05,.21,7.06],[x-.705,-.39+.34*h,7.80],70);
      if(h===1.825&&x===-3.90){
        photo('default-1825-rear-joints',[x-.38,1.19,9.17],[x-.705,.18,7.99],67);
        photo('default-1825-bed-eye',[x-.57,.32,8.82],[x-.705,-.50,8.43],52);
        photo('default-1825-link-eye',[x-.40,.91,6.97],[x-.705,.70,7.39],55);
      }
    }
    for(const [i,plate] of plates.entries()){
      const all=L.children.filter(m=>(ctr(m).x<x)===(i===0)),one=n=>all.find(m=>kind(m)===n);
      measure({all,plate,base:one('recess floor'),body:one('actuator body'),rod:one('actuator rod'),
        bpin:one('actuator bed pin'),hpin:one('actuator link pin')},i,h,x);
    }
  }
}
for(const side of lengths)for(const [i,n] of ['casing','rod'].entries()){
  const delta=Math.max(...side.map(q=>q[i]))-Math.min(...side.map(q=>q[i]));
  if(delta>.000002)report.errors.push(`RAV-M01: ${n} length changes by ${delta.toFixed(6)} m`);
}
if(legacy.length){
  const f=legacy.find(r=>r.h===1.825);
  report.errors.push(`RAV-M01: missing through-pins; full-stroke body/rod gaps ${f.bodyToOther.toFixed(6)} / ${f.rodToOther.toFixed(6)} m`);
}else{
  for(const rows of [0,1].map(i=>D.sweep.filter(r=>r.side===i&&r.x===-3.90))){
    for(let j=1;j<rows.length;j++)check(rows[j].engagement<rows[j-1].engagement,'rod does not extend monotonically');
  }
}
