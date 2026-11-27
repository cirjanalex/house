// Signed transverse distance to the actual finished west face. Clip the
// actual vehicle (deployed mirrors included) or moving lift triangles in YZ
// to that face before comparing X. Do not count a bumper past a wall end,
// or a piece below the floor / above the sloping cap, as a side contact.
function wallGap(triangles,dy){
  const wall=sets.masonry.b;
  const tops=VFit.triangles(arrays.masonry).flatMap(t=>t.v).filter(p=>p.y>wall.min.y+.01);
  const at=z=>tops.find(p=>Math.abs(p.z-z)<1e-5).y;
  const y0=at(wall.min.z),slope=(at(wall.max.z)-y0)/(wall.max.z-wall.min.z);
  let right=-Infinity;
  const clip=(poly,side)=>{
    const out=[];let a=poly.at(-1),u=side(a);
    for(const b of poly){
      const v=side(b);
      if((u<0)!==(v<0))out.push(a.clone().lerp(b,u/(u-v)));
      if(v>=0)out.push(b);a=b;u=v;
    }return out;
  };
  for(const t of triangles){
    if(t.b.max.x<=right||t.b.max.z<wall.min.z||t.b.min.z>wall.max.z||t.b.max.y+dy<wall.min.y)continue;
    let poly=t.v;
    for(const fn of [p=>p.z-wall.min.z,p=>wall.max.z-p.z,p=>p.y+dy-wall.min.y,
                     p=>y0+slope*(p.z-wall.min.z)-p.y-dy]){
      poly=clip(poly,fn);if(!poly.length)break;
    }
    for(const p of poly)right=Math.max(right,p.x);
  }
  return wall.min.x-right;
}
