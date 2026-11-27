// The vertices are the top strips of the rendered solid, including the ramp striations.
class AlignedWalkSpace extends WalkSpace {
  constructor(groups,grade,bounds){
    super(groups,grade,bounds);
    for(const g of groups)for(const m of g.children){
      const p=m.userData.part;if(!p.groundStrips)continue;
      const first=p.face[0],last=p.face[p.groundStrips*4-1],left=first[0],right=last[0];
      const rows=[first,...Array.from({length:p.groundStrips},(_,i)=>p.face[i*4+1])];
      this.floors.push({bottom:p.walkBase,walkable:true,
        contains:(x,z)=>x>=left-1e-8&&x<=right+1e-8&&z>=rows[0][2]-1e-8&&z<=rows.at(-1)[2]+1e-8,
        heightAt(x,z){
          if(x<left-1e-8||x>right+1e-8||z<rows[0][2]-1e-8||z>rows.at(-1)[2]+1e-8)return -Infinity;
          let i=0,j=rows.length-1;
          while(j-i>1){const k=(i+j)>>1;if(z<rows[k][2])j=k;else i=k;}
          const a=rows[i],b=rows[j];return a[1]+(z-a[2])*(b[1]-a[1])/(b[2]-a[2]);
        }});
    }
  }
}
