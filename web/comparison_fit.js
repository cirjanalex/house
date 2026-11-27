// Vertical translation, not endpoint sampling: first contact with a conservative
// obstacle enlarged by the display reserve. Clip EACH body triangle to the
// obstacle's horizontal footprint; its occupied y interval follows affinely.
const CFit=(()=>{
  function clip(poly,k,b,d){
    const next=[];let p=poly.at(-1);
    for(const q of poly){
      const u=d*(p[k]-b),v=d*(q[k]-b);
      if((u<0)!==(v<0))next.push(p.clone().lerp(q,u/(u-v)));
      if(v>=0)next.push(q);p=q;
    }return next;
  }
  function firstRise(shape,b,margin){
    b=b.clone().expandByScalar(margin);let first=Infinity;
    for(const t of shape){
      if(t.b.max.x<b.min.x||t.b.min.x>b.max.x||t.b.max.z<b.min.z||t.b.min.z>b.max.z||t.b.min.y>b.max.y)continue;
      let p=t.v;
      for(const k of ['x','z']){p=clip(p,k,b.min[k],1);if(p.length)p=clip(p,k,b.max[k],-1);if(!p.length)break;}
      if(!p.length||Math.min(...p.map(v=>v.y))>b.max.y)continue;
      first=Math.min(first,b.min.y-Math.max(...p.map(v=>v.y)));
    }return first;
  }
  function move(ts,x,y,z,garage){
    return ts.map(p=>{
      const v=p.v.map(q=>garage?new T.Vector3(x-q.x,y+q.y,z-q.z):new T.Vector3(x+q.z,y+q.y,z-q.x));
      return {v,t:new T.Triangle(...v),b:new T.Box3().setFromPoints(v),object:p.object};
    });
  }
  // Remove the landscape surface under the parking rectangle; retain the
  // original plane, world UV scale and elevation everywhere outside the hole.
  function cutGround(ground,b){
    const old=ground.geometry;old.computeBoundingBox();const size=old.boundingBox.getSize(new T.Vector3());
    const xs=[-size.x/2,b.min.x-ground.position.x,b.max.x-ground.position.x,size.x/2],
      ys=[-size.y/2,ground.position.z-b.max.z,ground.position.z-b.min.z,size.y/2],v=[],uv=[],ix=[];
    for(const y of ys)for(const x of xs){v.push(x,y,0);uv.push(.5+x/size.x,.5+y/size.y);}
    for(let j=0;j<3;j++)for(let i=0;i<3;i++){
      if(i===1&&j===1)continue;const k=j*4+i;ix.push(k,k+1,k+5,k,k+5,k+4);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();ground.geometry=g;old.dispose();
  }
  return {firstRise,move,cutGround};
})();
