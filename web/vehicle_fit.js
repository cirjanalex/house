// Distances in metres from rendered BufferGeometry, in world coordinates.
// AABB tree only prunes pairs; final gaps are between triangles, not their boxes.
const VFit=(()=>{
  const V=()=>new T.Vector3(), B=()=>new T.Box3(), tmp=V(), cp=V(), dir=V();
  function triangles(objects){
    const list=[];
    for(const o of objects){
      o.updateWorldMatrix(true,false);
      const g=o.geometry, pos=g.attributes.position, ix=g.index, points=[];
      for(let i=0;i<pos.count;i++)points.push(V().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld));
      for(let i=0;i<(ix?.count??pos.count);i+=3){
        const v=[0,1,2].map(k=>points[ix?ix.getX(i+k):i+k]);
        const t=new T.Triangle(...v);
        if(t.getArea()<1e-12)continue;
        list.push({t,v,b:B().setFromPoints(v),object:o});
      }
    }
    return list;
  }
  function tree(list){
    if(!list.length)return null;
    const b=list.reduce((b,p)=>b.union(p.b),B());
    if(list.length<=8)return {b,list};
    const s=b.getSize(V()),k=s.x>s.y&&s.x>s.z?'x':s.y>s.z?'y':'z';
    list.sort((a,b)=>a.b.min[k]+a.b.max[k]-b.b.min[k]-b.b.max[k]);
    const m=list.length>>1;
    return {b,left:tree(list.slice(0,m)),right:tree(list.slice(m))};
  }
  function gap(a,b,k){return Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k]);}
  function lower(a,b){return gap(a,b,'x')**2+gap(a,b,'y')**2+gap(a,b,'z')**2;}
  const d1=V(),d2=V(),r=V(),rtest=new T.Ray();
  const unit=v=>Math.min(1,Math.max(0,v));
  function edge(p,q,a,b){
    d1.subVectors(q,p);d2.subVectors(b,a);r.subVectors(p,a);
    const A=d1.lengthSq(),E=d2.lengthSq(),F=d2.dot(r),C=d1.dot(r),D=d1.dot(d2);
    if(A<1e-18||E<1e-18)return Infinity; // vertices already compared
    const det=A*E-D*D;
    let s=det>1e-16*A*E?unit((D*F-C*E)/det):0,t=(D*s+F)/E;
    if(t<0){t=0;s=unit(-C/A);}else if(t>1){t=1;s=unit((D-C)/A);}
    return r.addScaledVector(d1,s).addScaledVector(d2,-t).lengthSq();
  }
  function triGap(a,b,best){
    const cross=lower(a.b,b.b)<1e-16;
    for(const [p,q] of [[a,b],[b,a]])for(let i=0;i<3;i++){
      const v=p.v[i],next=p.v[(i+1)%3];
      best=Math.min(best,v.distanceToSquared(q.t.closestPointToPoint(v,cp)));
      if(cross){
        dir.subVectors(next,v);
        rtest.set(v,dir); // t in [0,1], not a normalized direction
        if(rtest.intersectTriangle(...q.v,false,tmp)&&tmp.distanceToSquared(v)<=dir.lengthSq()+1e-15)return 0;
      }
    }
    for(let i=0;i<3;i++)for(let j=0;j<3;j++)
      best=Math.min(best,edge(a.v[i],a.v[(i+1)%3],b.v[j],b.v[(j+1)%3]));
    return best;
  }
  function nearest(a,b){
    let best=Infinity,hit=null;
    function visit(p,q){
      if(!p||!q||lower(p.b,q.b)>=best)return;
      if(p.list&&q.list){
        for(const i of p.list)for(const j of q.list){
          if(lower(i.b,j.b)>=best)continue;
          const n=triGap(i,j,best);if(n<best){best=n;hit=j.object;}
        }
      }else{
        const split=!q.left||p.left&&p.b.getSize(tmp).lengthSq()>q.b.getSize(cp).lengthSq();
        let pairs=split?[[p.left,q],[p.right,q]]:[[p,q.left],[p,q.right]];
        if(lower(pairs[0][0].b,pairs[0][1].b)>lower(pairs[1][0].b,pairs[1][1].b))pairs.reverse();
        for(const pair of pairs)visit(...pair);
      }
    }
    visit(a,b);return {m:Math.sqrt(best),hit};
  }
  // Piecewise-linear vertical separation: clip triangle projections. On each
  // intersection polygon the affine height difference is minimal at a vertex.
  function vertical(list, overhead){
    let m=Infinity,hit=null,at=null;
    for(const b of overhead){
      const n=b.t.getNormal(V());if(Math.abs(n.y)<1e-7)continue;
      for(const a of list){
        if(gap(a.b,b.b,'x')>1e-7||gap(a.b,b.b,'z')>1e-7||b.b.min.y-a.b.max.y>=m)continue;
        let poly=a.v;
        for(let i=0;i<3&&poly.length;i++){
          const p=b.v[i],q=b.v[(i+1)%3],sign=-Math.sign(n.y);
          const side=v=>sign*((q.x-p.x)*(v.z-p.z)-(q.z-p.z)*(v.x-p.x));
          const next=[];let prev=poly.at(-1),u=side(prev);
          for(const v of poly){
            const w=side(v);
            if((u<0)!==(w<0))next.push(prev.clone().lerp(v,u/(u-w)));
            if(w>=0)next.push(v);prev=v;u=w;
          }poly=next;
        }
        for(const p of poly){const h=b.v[0].y-(n.x*(p.x-b.v[0].x)+n.z*(p.z-b.v[0].z))/n.y-p.y;
          if(h<m){m=h;hit=b.object;at=p.toArray();}}
      }
    }return {m,hit,at};
  }
  // Rigid query copy: materialize only the transformed BVH branches actually
  // visited. Used by reproducible swept-path measurements, not to move objects.
  function transformed(node,mat){
    const out={b:node.b.clone().applyMatrix4(mat)};
    function lazy(key,fn){Object.defineProperty(out,key,{configurable:true,get(){
      const v=fn();Object.defineProperty(out,key,{value:v});return v;}});}
    if(node.list)lazy('list',()=>node.list.map(p=>{
      const v=p.v.map(x=>x.clone().applyMatrix4(mat));
      return {v,t:new T.Triangle(...v),b:new T.Box3().setFromPoints(v),object:p.object};
    }));
    else for(const k of ['left','right'])lazy(k,()=>transformed(node[k],mat));
    return out;
  }
  return {triangles,tree,nearest,vertical,transformed};
})();
