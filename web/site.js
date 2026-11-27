    // This optional overlay is omitted entirely from shell and furnished exports.
    $('status').textContent=furnished?'Furnished · illustrative site':'Illustrative site';
    $('selection').textContent='Arrival garden';
    $('reference').textContent='Illustrative frontage and planting, not a surveyed boundary. In Walk through, choose the street start to try the gate.';
    $('starts').querySelector('p').textContent+=' At the street, aim slightly down at the timber gate or tap its leaf.';
    // In the hinge frame a stationary walker describes a quarter-circle in reverse.
    // Intersect that arc with the box inflated by the walker's disk: four straight
    // sides and four round corners. No angular sampling, even at a grazing tip.
    function arcHitsBox(x,z,turn,box){
      const clearance=.18+1e-10, endX=-turn*z,endZ=turn*x,r=Math.hypot(x,z);
      const {min:a,max:b}=box;
      const inside=(u,v)=>Math.hypot(Math.max(a.x-u,0,u-b.x),Math.max(a.z-v,0,v-b.z))<=clearance;
      if(inside(x,z)||inside(endX,endZ))return true;
      // These two half-planes select the directed 90-degree arc (including both ends).
      const onArc=(u,v)=>u*x+v*z>=0 && u*endX+v*endZ>=0;
      const cutsSide=(fixed,lo,hi,fixedX)=>{
        if(Math.abs(fixed)>r)return false;
        const t=Math.sqrt((r-fixed)*(r+fixed));
        return [-t,t].some(v=>lo<=v && v<=hi && (fixedX?onArc(fixed,v):onArc(v,fixed)));
      };
      if(cutsSide(a.x-clearance,a.z,b.z,true)||cutsSide(b.x+clearance,a.z,b.z,true)||
         cutsSide(a.z-clearance,a.x,b.x,false)||cutsSide(b.z+clearance,a.x,b.x,false))return true;
      for(const u of [a.x,b.x])for(const v of [a.z,b.z])
        if(onArc(u,v) && Math.abs(r-Math.hypot(u,v))<=clearance)return true;
      return false;
    }
    for(const group of model.children.filter(g=>g.userData.site))for(const gate of group.children){
      const p=gate.userData.part;
      if(p.door?.kind!=='gate')continue;
      const closedInverse=gate.matrixWorld.clone().invert();
      const hingeOffset=(p.door.hand.startsWith('start')?1:-1)*p.size[0]/2;
      const turn=p.door.hand.endsWith('+')?1:-1;
      const volumes=[];
      function volume(center,size){
        const c=new T.Vector3().fromArray(center);c.x+=hingeOffset;
        volumes.push(new T.Box3().setFromCenterAndSize(c,new T.Vector3().fromArray(size)));
      }
      volume([0,0,0],p.size); // The same finite leaf envelope as its walking collider.
      for(const {box,size} of p.door.hardware){
        const part=new T.Mesh(new T.BoxGeometry(...size),material('frame',true));
        part.position.fromArray(box);gate.add(part);volume(box,size);
      }
      gate.updateMatrixWorld(true);
      const toggle=gate.userData.toggle;
      gate.userData.toggle=pos=>{
        if(pos){
          const q=pos.clone().applyMatrix4(closedInverse);q.x+=hingeOffset;
          if(volumes.some(b=>q.y<=b.max.y && q.y+@head@>=b.min.y && arcHitsBox(q.x,q.z,turn,b)))return false;
        }
        return toggle(pos);
      };
    }
    pad.material.color.set(0xb7c4a6);
    // The existing paving is flush with grade. Keep it legible in distant orbit views, too.
    Object.assign(pad.material,{polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:4});
    function pavingJoints(key,columns,rows,tile){
      const cv=document.createElement('canvas');cv.width=cv.height=256;
      const ctx=cv.getContext('2d'),w=256/columns,h=256/rows;
      ctx.fillStyle='#cecac3';ctx.fillRect(0,0,256,256);
      for(let j=0;j<rows;j++)for(let i=-1;i<columns;i++){
        const k=244+(7*(i+columns)+5*j)%10;
        ctx.fillStyle=`rgb(${k},${k},${k})`;
        ctx.fillRect((i+(j%2)*.5)*w+.5,j*h+.5,w-1,h-1);
      }
      const tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;
      tex.repeat.setScalar(1/tile);tex.colorSpace=T.SRGBColorSpace;
      tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      const mat=material(key,true);mat.map=tex;mat.needsUpdate=true;
    }
    pavingJoints('s_setts',6,10,1.20);pavingJoints('s_path',2,3,1.50);
    $('site').onclick=()=>{
      $('level').value='all';refresh();
      target.copy(ctr);yaw=2.76;pitch=.53;
      const out=new T.Vector3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
      const right=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),up=new T.Vector3().crossVectors(out,right);
      const ty=Math.tan(camera.fov*Math.PI/360)/1.13,tx=ty*camera.aspect,v=new T.Vector3();
      let l=-Infinity,r=-Infinity,b=-Infinity,t=-Infinity;
      // Fit the occupied site, not a tall empty box above the street apron.
      model.traverse(m=>{
        if(!m.geometry)return;
        if(!m.geometry.boundingBox)m.geometry.computeBoundingBox();
        const box=m.geometry.boundingBox;
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
          v.set(x,y,z).applyMatrix4(m.matrixWorld).sub(ctr);
          const d=v.dot(out),h=v.dot(right)/tx,k=v.dot(up)/ty;
          l=Math.max(l,d-h);r=Math.max(r,d+h);b=Math.max(b,d-k);t=Math.max(t,d+k);
        }
      });
      distance=Math.max(l+r,b+t)/2;
      target.addScaledVector(right,(r-l)*tx/2).addScaledVector(up,(t-b)*ty/2);
      update();
    };
    $('site').click();
