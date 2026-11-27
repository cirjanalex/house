  const paving=box(slabParking);
  // Keep the entire workshop free of terrain (including relocated pits).
  // The garage footprint and the parking cut are rectangles in this bound
  // parent. Preserve the original world UV phase, plane and material.
  {
    const old=pad.geometry;old.computeBoundingBox();
    const {x:w,y:h}=old.boundingBox.getSize(new T.Vector3()),garage=box(slab);
    const holes=[paving,garage].map(b=>[b.min.x-pad.position.x,b.max.x-pad.position.x,
      pad.position.z-b.max.z,pad.position.z-b.min.z]);
    const edges=vs=>[...new Set(vs)].sort((a,b)=>a-b);
    const xs=edges([-w/2,w/2,...holes.flatMap(a=>a.slice(0,2))]),ys=edges([-h/2,h/2,...holes.flatMap(a=>a.slice(2))]);
    const v=[],uv=[],ix=[];
    for(const y of ys)for(const x of xs){v.push(x,y,0);uv.push(.5+x/w,.5+y/h);}
    for(let j=1;j<ys.length;j++)for(let i=1;i<xs.length;i++){
      const x=(xs[i]+xs[i-1])/2,y=(ys[j]+ys[j-1])/2;
      if(holes.some(([a,b,c,d])=>x>a&&x<b&&y>c&&y<d))continue;
      const n=xs.length,k=(j-1)*n+i-1;ix.push(k,k+1,k+n+1,k,k+n+1,k+n);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));
    g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();pad.geometry=g;old.dispose();
  }
