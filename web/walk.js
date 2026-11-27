// Navigation is derived from the same solids as the rendered building, not a second floor plan.
class WalkSpace {
  constructor(groups, grade, bounds) {
    this.grade=grade; this.bounds=bounds; this.floors=[]; this.solids=[]; this.ceilings=[];this.flight=null;
    for(const group of groups) for(const mesh of group.children) {
      const p=mesh.userData.part;
      if(p.overhead){
        const [a,b,c]=p.face,u=b.map((v,i)=>v-a[i]),v=c.map((k,i)=>k-a[i]);
        const det=u[0]*v[2]-u[2]*v[0];
        if(Math.abs(det)>1e-8)this.ceilings.push((x,z)=>{
          const dx=x-a[0],dz=z-a[2],s=(dx*v[2]-dz*v[0])/det,t=(u[0]*dz-u[2]*dx)/det;
          return s>=0&&t>=0&&s+t<=1?a[1]+s*u[1]+t*v[1]:Infinity;
        });
      } else if(p.slab) {
        const test=(x,z)=>this.inRing(x,z,p.slab[0]) && !p.slab.slice(1).some(r=>this.inRing(x,z,r));
        this.floors.push({top:p.base+p.depth,bottom:p.base,contains:test,walkable:!group.userData.roof});
      } else if(p.box||p.mesh) {
        const center=mesh.position;
        let width,height,depth,low;
        if(p.box){[width,height,depth]=p.size;low=center.y-height/2;}
        else{mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;
          width=b.max.x-b.min.x;height=b.max.y-b.min.y;depth=b.max.z-b.min.z;low=center.y;}
        const distance=(x,z)=>{
          const dx=x-center.x,dz=z-center.z,c=Math.cos(mesh.rotation.y),s=Math.sin(mesh.rotation.y);
          const d=p.door?.kind==='garage'&&mesh.userData.open?height:depth;
          return Math.hypot(Math.max(0,Math.abs(c*dx-s*dz)-width/2),Math.max(0,Math.abs(s*dx+c*dz)-d/2));
        };
        if(p.door){
          const closed=center.clone(), yaw=mesh.rotation.y, sign=p.door.hand.startsWith('start')?1:-1;
          const hinge=closed.clone().add(new THREE.Vector3(-sign*width/2*Math.cos(yaw),0,sign*width/2*Math.sin(yaw)));
          const pose=open=>{
            center.copy(closed);mesh.rotation.set(0,yaw,0,'YXZ');
            if(open && p.door.kind==='garage'){
              mesh.rotation.x=-Math.PI/2;center.y+=height/2;
              center.x+=Math.sin(yaw)*height/2;center.z+=Math.cos(yaw)*height/2;
            }else if(open){
              mesh.rotation.y+=p.door.hand.endsWith('+')?Math.PI/2:-Math.PI/2;
              center.x=hinge.x+sign*width/2*Math.cos(mesh.rotation.y);
              center.z=hinge.z-sign*width/2*Math.sin(mesh.rotation.y);
            }
            mesh.userData.open=open;mesh.updateMatrixWorld(true);
          };
          const bottom=()=>p.door.kind==='garage'&&mesh.userData.open?center.y-depth/2:low;
          this.solids.push({distance,get low(){return bottom();},top:low+height+.03,group});
          mesh.userData.toggle=pos=>{
            const was=!!mesh.userData.open;pose(!was);
            if(pos && pos.y+@head@>bottom() && pos.y<low+height && distance(pos.x,pos.z)<.18){pose(was);return false;}
            return true;
          };
          continue;
        }
        if(p.walkable)this.floors.push({top:low+height,bottom:low,contains:(x,z)=>distance(x,z)<.00001,walkable:true});
        else this.solids.push({distance,low,top:low+height,group});
      }
    }
  }
  inRing(x,z,ring) {
    let inside=false;
    for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
      const [ax,az]=ring[i],[bx,bz]=ring[j];
      if((az>z)!==(bz>z) && x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
    }
    return inside;
  }
  support(x,z,feet,step=.245) {
    let h=this.grade;
    for(const f of this.floors)if(f.walkable && @surface@<=feet+step && @surface@>h && f.contains(x,z))h=@surface@;
    return h;
  }
  jump(pos) {
    if(this.flight || Math.abs(this.support(pos.x,pos.z,pos.y,.002)-pos.y)>.005)return false;
    this.flight={v:2.65,from:pos.y};return true;
  }
  advanceJump(pos,dt) {
    if(!this.flight)return false;
    const f=this.flight,prev=pos.y;
    let next=prev+f.v*dt-4.9*dt*dt;f.v-=9.8*dt;
    if(next>prev){
      let head=Infinity;
      const limit=y=>{if(y>prev+.01)head=Math.min(head,y);};
      for(const roof of this.ceilings)limit(@roofAt@);
      for(const slab of this.floors)if(slab.contains(pos.x,pos.z))limit(slab.bottom);
      for(const s of this.solids)if(s.group.visible && s.distance(pos.x,pos.z)<.17)limit(s.low);
      if(next+@head@>=head){next=Math.max(prev,head-@headStop@);f.v=0;}
    }
    const floor=this.support(pos.x,pos.z,prev,.0001);
    if(f.v<=0 && next<=floor){pos.y=floor;this.flight=null;}else pos.y=next;
    return true;
  }
  tryMove(pos,x,z) {
    const b=this.bounds;
    if(x<b.min.x-5||x>b.max.x+5||z<b.min.z-5||z>b.max.z+5)return false;
    const ground=this.support(x,z,pos.y,this.flight ? .0001 : .245);
    if((this.flight?this.flight.from:pos.y)-ground>.33)return false; // No storey drops, even mid-jump.
    const h=this.flight?Math.max(ground,pos.y):ground;
    const head=h+@head@;
    if(this.ceilings.some(at=>{const y=@moveAt@;return y>h && y<head;}))return false;
    if(this.floors.some(f=>f.bottom<head && @surface@>h+(this.flight ? .0001 : .245) && f.contains(x,z)))return false;
    if(this.solids.some(s=>s.group.visible && s.low<head && s.top>h+.018 && s.distance(x,z)<.17))return false;
    pos.set(x,h,z);return true;
  }
  move(pos,dx,dz) {
    const n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.065));
    for(let i=0;i<n;i++){
      if(!this.tryMove(pos,pos.x+dx/n,pos.z+dz/n)){
        this.tryMove(pos,pos.x+dx/n,pos.z);this.tryMove(pos,pos.x,pos.z+dz/n);
      }
    }
  }
}
