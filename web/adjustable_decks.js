  // The garage pose reverses the car's local +Z (nose) into world -Z.
  // Dimension study, not a fabrication detail. Nothing here moves a car,
  // scissor pivot or provisional rubber contact in response to length.
  const minLength=1.55,maxLength=1.95,rearZ=.825,frontLimit=rearZ-maxLength;
  // Retracted head parks IN the socket with a 3 mm projecting lip. The
  // original vehicle/pad/scissor origin is unchanged, not the moving midpoint.
  const noseDepth=.050, fixedFront=rearZ-minLength+.003, trim=.012;
  const half=L.platform_width/2, axis=(L.platform_gap+L.platform_width)/2;
  const decks=[],liftParts=[],moving=[],staticLift=[],walkingSurfaces=[];
  function part(id,slot,w,h,d,fx,{functional=true}={}){
    const p={component:id,slot,box:[0,0,0],size:[w,h,d]},m=make(p);
    G.lift.add(m);liftParts.push(m);(functional?moving:staticLift).push(m);
    m.userData.place=fx;return m;
  }
  function groundSurface(m,movesUp=false){
    walkingSurfaces.push({m,movesUp,b:new T.Box3()});
    return m;
  }
  const fixed=(x,y,z)=>m=>m.position.set(x,y,z);
  const nose=()=>rearZ-st.len;
  for(const s of [-1,1]){
    const x=s*axis;
    function stationary(name,slot,w,h,d,px,y,z){
      return part(name,slot,w,h,d,fixed(px,y,z),{functional:false});
    }
    const mid=(frontLimit+rearZ)/2;
    stationary('recess floor','v_pit',2*half,.012,maxLength,x,-L.embedded-.006,mid);
    // The inherited bottom pivot axis is -0.228, not the bottom of the
    // 0.270 m recess. Show the grounded, fixed bearing paths at that height.
    const baseHeight=L.embedded-.228;
    for(const rail of [-1,1])stationary('fixed scissor bed rail','v_graphite',.076,baseHeight,1.42,
      x+rail*.18,-L.embedded+baseHeight/2,0);
    for(const end of [-1,1]){
      groundSurface(stationary('fixed side rim','v_wheel',trim,L.embedded,maxLength,
        x+end*(half+trim/2),-L.embedded/2,mid));
      groundSurface(stationary('fixed end rim','v_wheel',L.platform_width+2*trim,L.embedded,trim,
        x,-L.embedded/2,end===1?rearZ+trim/2:frontLimit-trim/2));
    }
    // A shallow-backed pocket in front of the scissor well. Both exposed
    // floor infills stay at slab level, NEVER on the lifting assembly.
    const travel=fixedFront-frontLimit;
    stationary('travel pocket bed','v_pit',2*half,L.embedded-.060,travel,
      x,-(.060+L.embedded)/2,(frontLimit+fixedFront)/2);
    function floorInfill(name,width,ends){
      groundSurface(part(name,'v_seam',width,.060,1,m=>{
        const [a,b]=ends();m.visible=b-a>1e-8;
        // Only the exposed span. No coplanar hidden cover under the deck.
        m.scale.z=m.visible?b-a:1;m.position.set(x,-.030,(a+b)/2);
        m.raycast=m.visible?T.Mesh.prototype.raycast:()=>{};
      },{functional:false}));
    }
    const rail=.035;
    floorInfill('unused travel cover',2*half,()=>[frontLimit,nose()]);
    floorInfill('floor insert between runners',2*(half-rail),()=>[nose()+noseDepth,fixedFront]);

    const coreDepth=rearZ-fixedFront, socket=.54;
    const level=(y,z,px=x)=>m=>m.position.set(px,st.h+y,z);
    const core=groundSurface(part('platform','v_platform',2*half,.003,coreDepth,
      level(-.0015,(fixedFront+rearZ)/2)),true);
    part('platform casting','v_platform',2*half,.057,coreDepth-socket,
      level(-.0315,(fixedFront+socket+rearZ)/2));
    part('runner socket underside','v_platform',2*half,.012,socket,
      level(-.054,fixedFront+socket/2));
    const tip=groundSurface(part('sliding crosshead','v_safety',2*half,.045,noseDepth,
      m=>m.position.set(x,st.h-.0255,nose()+noseDepth/2)),true);
    // Two rigid runners telescope INSIDE the front socket. At maximum reach
    // over .10 m remains inside. Open plan between the runners, as in the sketch.
    const runners=[];
    for(const side of [-1,1]){
      runners.push(groundSurface(part('telescopic runner','v_silver',rail,.040,.460,m=>
        m.position.set(x+side*(half-rail/2),st.h-.023,nose()+noseDepth+.230)),true));
    }
    const pads=[];
    for(const end of [-1,1]){
      pads.push(part('rubber pad','v_dark',.145,L.pad,.169,m=>{
        m.visible=st.loc==='lift';m.position.set(x-s*.12,st.h+L.pad/2,end*.61);
        m.raycast=m.visible?T.Mesh.prototype.raycast:()=>{};
      }));
    }
    decks.push({core,tip,pads,runners});
/* INHERITED SCISSORS */
  }
  const slab=annex.children.find(o=>o.userData.part.slab),slabPart=slab.userData.part;
  const slabOutline=slabPart.slab.slice();
  let cutX,cutZ;
  function cutWells(){
    if(st.x===cutX&&st.z===cutZ)return;
    const holes=[-axis,axis].map(dx=>{
      const x=st.x+dx,a=x-half-trim,b=x+half+trim,c=st.z+frontLimit-trim,d=st.z+rearZ+trim;
      return [[a,c],[a,d],[b,d],[b,c]];
    });
    // WalkSpace's slab test closes over this same part. A real geometry hole
    // also removes depth/shadow/ray hits, unlike a color-material mask.
    slabPart.slab=[...slabOutline,...holes];
    const old=slab.geometry;slab.geometry=make(slabPart).geometry;old.dispose();
    cutX=st.x;cutZ=st.z;
  }
  function place(){
    carPose();cutWells();G.lift.position.set(st.x,L.floor,st.z);
    for(const m of liftParts)m.userData.place(m);
    G.lift.updateWorldMatrix(true,true);
    for(const f of walkingSurfaces)f.b.setFromObject(f.m,true);
  }
  for(const f of walkingSurfaces)space.floors.push({
    walkable:true,get top(){return f.b.max.y;},get bottom(){return f.b.min.y;},
    contains(x,z){return f.m.visible&&(!f.movesUp||st.h===0)&&x>=f.b.min.x&&x<=f.b.max.x&&z>=f.b.min.z&&z<=f.b.max.z;}
  });
  function pitGuard(deck){
    // Conservative avoidance of the active plan (including the open frame);
    // the unused travel cover OUTSIDE that plan is ordinary supported floor.
    const core=box(deck.core),tip=box(deck.tip);
    return {group:G.lift,low:L.floor-L.embedded,top:L.floor+.27,
      distance(x,z){return Math.hypot(Math.max(0,core.min.x-x,x-core.max.x),
        Math.max(0,tip.min.z-z,z-core.max.z));}};
  }
  function longitudinal(car,z){
    const ends=decks.map(({core,tip,pads})=>{
      // Pads have a pose even when not displayed; the virtual garage
      // comparison doesn't depend on which model is currently in the bay.
      const back=box(core),front=box(tip),p=pads.map(box);
      const padFront=Math.min(...p.map(b=>b.min.z)),padRear=Math.max(...p.map(b=>b.max.z));
      return {front:padFront-front.min.z,rear:back.max.z-padRear,fixed:padFront-back.min.z,
        frontAxle:front.min.z-(z-car.axles[1]),rearAxle:(z-car.axles[0])-back.max.z};
    });
    const min=k=>Math.min(...ends.map(e=>e[k]));
    return {padFront:min('front'),padRear:min('rear'),fixedFrontReserve:min('fixed'),
      axleOutside:[min('frontAxle'),min('rearAxle')],longOk:Math.min(min('front'),min('rear'),min('fixed'))>=margin};
  }
  function tyreAtRest(garageCar){
    // True triangles at this very X/Z. Remove just the deck translation;
    // until pickup, the deck alone rises. After pickup, the gap is constant.
    const wheels=garageCar.filter(t=>['tyre','rounded sidewall'].includes(t.object.userData.part.component));
    const steel=tr(decks.flatMap(d=>[d.core,d.tip,...d.runners]));
    return VFit.vertical(steel,wheels).m+st.h;
  }
