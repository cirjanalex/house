  // Original dimensional proxy. Local X across the platforms, -Z toward
  // the vehicle nose. Drawing 0580/0708/0 controls the finished surfaces.
  const decks=[],moving=[],staticLift=[],liftParts=[];
  const slab=annex.children.find(m=>m.userData.part.slab),slabPart=slab.userData.part;
  const outline=slabPart.slab.slice(),pitAxis=(L.pit_gap+L.pit_width)/2,
    deckAxis=(L.platform_gap+L.platform_width)/2;
  function part(name,slot,w,h,d,place,mobile){
    const m=make({component:name,slot,box:[0,0,0],size:[w,h,d]});
    m.userData.place=place;G.lift.add(m);liftParts.push(m);(mobile?moving:staticLift).push(m);
    return m;
  }
  const fixed=(x,y,z)=>m=>m.position.set(x,y,z);
  // Original schematic solids of revolution. Profiles are closed sections
  // (radius, station); the eye bores and blind casing cavity are real voids.
  function turned(profile,transverse=false){
    const g=new T.LatheGeometry(profile.map(([r,a])=>new T.Vector2(r,a)),16);
    return transverse?g.rotateZ(-Math.PI/2):g.rotateX(Math.PI/2);
  }
  function eye(r){
    return turned([[.014,-.015],[r,-.015],[r,.015],[.014,.015],[.014,-.015]],true);
  }
  function solid(m,...pieces){
    const g=new T.BufferGeometry(),pos=[],norm=[];
    for(const piece of pieces){
      const f=piece.toNonIndexed();
      pos.push(...f.attributes.position.array);norm.push(...f.attributes.normal.array);
      f.dispose();piece.dispose();
    }
    g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    g.setAttribute('normal',new T.Float32BufferAttribute(norm,3));
    m.geometry.dispose();m.geometry=g;return m;
  }
  for(const s of [-1,1]){
    const p=s*pitAxis,x=s*deckAxis,w=L.pit_width,l=L.pit_length,dep=L.embedded,skin=.003;
    const base=part('recess floor','v_pit',w,.012,l,fixed(p,-dep-.006,0),false);
    for(const a of [-1,1]){
      part('fixed side rim','v_wheel',skin,dep,l,fixed(p+a*(w-skin)/2,-dep/2,0),false);
      part('fixed end rim','v_wheel',w-2*skin,dep,skin,fixed(p,-dep/2,a*(l-skin)/2),false);
    }
    const bottom=-.215,thick=.0625,arm=1.265,pinZ=-.62,
      halfRise=()=>(st.h-thick-bottom)/2,run=()=>Math.sqrt(arm*arm-halfRise()**2);
    const beds=[],bearers=[];
    for(const rail of [-1,1]){
      const rx=x+rail*.159;
      beds.push(part('fixed scissor bed rail','v_graphite',.066,dep+bottom,1.43,
        fixed(rx,(-dep+bottom)/2,0),false));
      for(const k of [0,1]){
        for(const sign of [-1,1]){
          const link=part('RAV scissor stage '+(k+1),'v_graphite',.025,.059,arm,m=>{
            m.rotation.x=-sign*Math.asin(halfRise()/arm);
            m.position.set(rx+sign*.014,bottom+halfRise()*(k+.5),pinZ+run()/2);
          },true);
          if(k===1&&sign===1)bearers.push(link);
        }
        const pin=part('cross pivot','v_silver',.079,.067,.067,m=>
          m.position.set(rx,bottom+halfRise()*(k+.5),pinZ+run()/2),true);
        pin.geometry.dispose();pin.geometry=new T.CylinderGeometry(.034,.034,.079,12).rotateZ(Math.PI/2);
      }
    }
    // The transverse shafts span BOTH real bed rails / upper-stage links.
    // Take the shaft stations from the rendered members' local frames, in
    // placement order. The actuator eyes rotate on those two parallel axes.
    function seat(members,z){
      const points=members.map(m=>{
        m.updateMatrix();return new T.Vector3(0,0,z).applyMatrix4(m.matrix);
      });
      const p=points[0].lerp(points[1],.5);p.x=x;return p;
    }
    const foot=()=>seat(beds,.680),head=()=>seat(bearers,-arm/4);
    function pivotPose(atHead){
      return m=>{
        const a=foot(),b=head();
        m.position.copy(atHead?b:a);m.rotation.x=-Math.atan2(b.y-a.y,b.z-a.z);
      };
    }
    function mechanism(name,slot,atHead,mobile,...pieces){
      solid(part(name,slot,1,1,1,pivotPose(atHead),mobile),...pieces);
    }
    mechanism('actuator bed pin','v_silver',false,false,
      turned([[0,-.198],[.014,-.198],[.014,.198],[0,.198]],true));
    mechanism('actuator link pin','v_silver',true,true,turned([
      [0,-.162],[.0075,-.162],[.0075,-.121],[.014,-.121],
      [.014,.121],[.0075,.121],[.0075,.193],[0,.193]],true));
    // Each moving piece has one immutable geometry and a bored eye. The
    // rod tip runs inside a blind bore; neither its mesh nor the casing scales.
    mechanism('actuator body','v_graphite',false,true,eye(.022),turned([
      [0,.018],[.016,.018],[.027,.054],[.027,.872],[.029,.876],[.029,.900],
      [.0136,.900],[.0136,.067],[0,.067]]));
    mechanism('actuator rod','v_silver',true,true,eye(.024),turned([
      [0,-.840],[.0133,-.840],[.0133,-.031],[.016,-.018],[0,-.018]]));
    const core=part('platform','v_platform',L.platform_width,thick,L.platform_length,
      m=>m.position.set(x,st.h-thick/2,0),true);
    const pads=[-1,1].map(end=>part('rubber pad','v_dark',L.pad_width,1,L.pad_length,m=>{
      m.scale.y=padH();m.position.set(s*L.pad_x,st.h+padH()/2,end*L.pad_z);
      m.visible=st.loc==='lift';m.raycast=m.visible?T.Mesh.prototype.raycast:()=>{};
    },true));
    decks.push({base,core,pads});
    const surface={walkable:true,top:L.floor,bottom:L.floor-thick,contains:(xx,zz)=>
      st.h===0&&Math.abs(xx-st.x-p)<=w/2&&Math.abs(zz-st.z)<=l/2};
    // At rest, a pedestrian sole bridges the narrow deck-edge seams. No
    // extra rendered slab or invisible bridge remains over a raised well.
    space.floors.push(surface);
  }
  let cutX,cutZ;
  function place(){
    carPose();
    if(st.x!==cutX||st.z!==cutZ){
      slabPart.slab=[...outline,...[-1,1].map(s=>{
        const x=st.x+s*pitAxis,w=L.pit_width/2,l=L.pit_length/2;
        return [[x-w,st.z-l],[x-w,st.z+l],[x+w,st.z+l],[x+w,st.z-l]];
      })];
      const old=slab.geometry;slab.geometry=make(slabPart).geometry;old.dispose();
      cutX=st.x;cutZ=st.z;
    }
    G.lift.position.set(st.x,L.floor,st.z);
    for(const m of liftParts)m.userData.place(m);
    G.lift.updateWorldMatrix(true,true);
  }
  function pitGuard({base}){
    const b=box(base);
    return {group:G.lift,low:L.floor-L.embedded,top:L.floor+.27,
      distance(x,z){return Math.hypot(Math.max(0,b.min.x-x,x-b.max.x),Math.max(0,b.min.z-z,z-b.max.z));}};
  }
  // Signed separation of finite plan rectangles, including their ends.
  function planGap(a,b){
    const dx=Math.max(a.min.x-b.max.x,b.min.x-a.max.x),dz=Math.max(a.min.z-b.max.z,b.min.z-a.max.z);
    return Math.max(dx,dz)<0?Math.max(dx,dz):Math.hypot(Math.max(dx,0),Math.max(dz,0));
  }
  function supportStudy(ts,z){
    const component=t=>t.object.userData.part.component;
    const rubber=ts.filter(t=>['tyre','rounded sidewall'].includes(component(t)));
    const pan=ts.filter(t=>['floor pan','illustrative floor pressing'].includes(component(t)));
    const panBox=meshTree(pan).b,steelTr=tr(decks.map(d=>d.core)),padTr=tr(decks.flatMap(d=>d.pads));
    const project=(a,b)=>VFit.vertical(a,b).m+st.h;
    const wheel0=project(steelTr,rubber),body0=project(steelTr,ts);
    const pad0=project(padTr,ts),contact=project(padTr,pan);
    const ends=decks.map(({core,pads})=>{
      const plate=box(core),p=pads.map(box),xx=(plate.min.x+plate.max.x)/2;
      // Split the actual wheel meshes by front / rear in world space.
      const axles=[false,true].map(rear=>{
        const bb=new T.Box3();for(const t of rubber)for(const v of t.v)if((v.z>z)===rear)bb.expandByPoint(v);
        return {mid:(bb.min.z+bb.max.z)/2,edge:rear?bb.min.z:bb.max.z};
      });
      const p0=p[0],inner=xx<st.x?plate.max.x-p0.max.x:p0.min.x-plate.min.x,
        outer=xx<st.x?p0.min.x-plate.min.x:plate.max.x-p0.max.x;
      return {padFront:p[0].min.z-plate.min.z,padRear:plate.max.z-p[1].max.z,inner,outer,
        panEdge:Math.min(p0.min.x-panBox.min.x,panBox.max.x-p0.max.x),
        padOverlap:Math.max(0,Math.min(p0.max.x,panBox.max.x)-Math.max(p0.min.x,panBox.min.x)),
        axleOutside:[plate.min.z-axles[0].mid,axles[1].mid-plate.max.z],
        bumperOutside:[plate.min.z-Math.min(...ts.map(t=>t.b.min.z)),Math.max(...ts.map(t=>t.b.max.z))-plate.max.z],
        tyreEnds:[plate.min.z-axles[0].edge,axles[1].edge-plate.max.z]};
    });
    const geom={...ends[0]};
    for(const k of ['padFront','padRear','inner','outer','panEdge','padOverlap'])
      geom[k]=Math.min(...ends.map(d=>d[k]));
    return {...geom,contact,pad0,body0,wheel0,
      longOk:Math.min(geom.padFront,geom.padRear,geom.inner,geom.outer)>=margin&&geom.padOverlap>0};
  }
