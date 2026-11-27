    $('status').textContent='House · architect-informed candidate';
    $('reference').textContent='Walk at 1.80 m. See Drawing notes for the garage dimensions, entrance repair and render comparison.';
    audit('Architect reference comparison · current amendments',data.architect.audit);
    for(const slot of ['r_oak','r_section']){
      const m=material(slot,true);m.map=timberMap;m.roughness=slot==='r_section'?.55:.76;m.needsUpdate=true;
    }
    // Keep the sectional joints on the moving panel, not on the masonry when it opens.
    const sectionLeaf=model.children.flatMap(g=>g.children).find(m=>m.userData.part.door?.kind==='garage');
    for(const joint of sectionLeaf.children)joint.material=material('r_section',true);
    // Test the whole moving envelope in its *closed* hinge frame before changing pose.
    const frontLeaf=model.children.flatMap(g=>g.children).find(m=>m.userData.part.leafStyle==='greyPanel');
    const frontPart=frontLeaf.userData.part,halfLeaf=frontPart.size[0]/2;
    frontLeaf.updateWorldMatrix(true,true);
    const closedFrame=frontLeaf.matrixWorld.clone().invert(),frontToggle=frontLeaf.userData.toggle;
    const swept=[frontLeaf,...frontLeaf.children].map(m=>{
      m.geometry.computeBoundingBox();const b=m.geometry.boundingBox.clone();
      if(m!==frontLeaf){
        b.applyMatrix4(m.matrix);
        const hardware=b.clone();
        space.solids.push({group:frontLeaf.parent,low:frontLeaf.position.y+b.min.y,top:frontLeaf.position.y+b.max.y,
          distance(x,z){
            const dx=x-frontLeaf.position.x,dz=z-frontLeaf.position.z,c=Math.cos(frontLeaf.rotation.y),s=Math.sin(frontLeaf.rotation.y);
            const u=c*dx-s*dz,v=s*dx+c*dz;
            return Math.hypot(Math.max(0,hardware.min.x-u,u-hardware.max.x),Math.max(0,hardware.min.z-v,v-hardware.max.z));
          }});
      }
      return b.translate(new T.Vector3(halfLeaf,0,0));
    });
    frontLeaf.userData.toggle=pos=>{
      if(pos){
        const q=pos.clone().applyMatrix4(closedFrame);q.x+=halfLeaf;
        if(swept.some(b=>q.y<=b.max.y&&q.y+WALK_BODY.head>=b.min.y&&arcHitsBox(q.x,q.z,-1,b)))return false;
      }
      return frontToggle(pos);
    };
    renderer.shadowMap.needsUpdate=true;draw();
