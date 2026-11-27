// PARK-01: exact five saved camera positions. Record both diagnostic pixels
// and first rendered geometry (a ray ordering alone did not detect this bug).
const parking=model.children.find(g=>g.userData.name==='Site paving and terrace').children[0],aim=[-13.50,-.45,-2.69];
for(const [i,eye] of [[1,[-10.48,1.35,-4.12]],[2,[-9.86,1.35,-3.17]],[3,[-10.48,1.35,-3.11]],
  [4,[-10.48,1.35,-2.99]],[5,[-11.48,1.35,-2.84]]]){
  photo('same-slab-'+i,eye,aim,73);const gl=renderer.getContext(),pixels=new Uint8Array(5*5*4);gl.readPixels(498,298,5,5,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  const d=new T.Vector3(...aim).sub(new T.Vector3(...eye)).normalize().toArray(),hits=ray(eye,d,[pad,parking]);
  const colors=Array.from({length:25},(_,k)=>Array.from(pixels.slice(k*4,k*4+3)));
  report.measurements['point'+i]={eye,aim,rgb:colors[12],greenPixels:colors.filter(([r,g,b])=>g-r>8&&g-b>8).length,
    first:hits[0].object===parking?'paving':'landscape',height:hits[0].point.y,landscapeUnderSlab:hits.some(v=>v.object===pad)};
}
for(const f of Object.values(report.measurements))check(f.first==='paving'&&Math.abs(f.height+.45)<.00001&&!f.greenPixels&&!f.landscapeUnderSlab,
  'PARK-01: landscape under the occupied bay or green replaces paving: '+JSON.stringify(f));
