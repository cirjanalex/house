function houseAlignedRoomRoute(io){
  // Open the inward leaf from the bath, outside its swept arc. A walker
  // already against the timber jamb should not be moved by a powered shortcut.
  const {via,visit}=io;
  const visits={via,visit(name,x,z,y,h){
    visit(name,x,z,y,h);
    if(name==='En-suite bathroom'){
      via([1.54,2.25]);update();
      const leaf=model.children.flatMap(g=>g.children).find(m=>m.userData.part.saunaLeaf);
      if(!leaf.userData.open){
        const v=leaf.position.clone().sub(camera.position);
        heading=Math.atan2(v.x,v.z);tilt=Math.atan2(v.y,Math.hypot(v.x,v.z));update();
        host.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyE'}));
        if(!leaf.userData.open)throw Error('Could not open sauna leaf from the wet room');
      }
    }
  }};
  houseRoute(visits,{
    kitchen({via,visit}){
      via([4.75,11.42]);visit('Kitchen and dining',4.56,11.71,0,252);
      via([4.75,11.42],[4.66,9.85]);
    },
    living({via,visit}){
      via([5.58,11.42],[6.12,11.66]);
      visit('Living room',7.19,11.62,0,65);via([6.12,11.66],[5.60,11.45]);
    },
    workshop({via,visit}){
      via([-1.17,5.85],[-3.15,5.85]);visit('Garage workshop',-4.1,8.5,-.3,160);
      via([-3.12,9.91],[-1.0,9.91],[-1.0,11.5]);
    },
    hobby({via,visit}){
      via([-1,11.10],[-3.1,11.10]);visit('Hobby room',-3.1,11.64,-.3,10);
      via([-3.1,11.10],[-1,11.10]);
    },
    sauna({visit}){visit('Sauna',1.54,1.13,3.15,225);},
    laundry({visit}){visit('Laundry',2.24,6.20,3.15,250);},
    bedroom({visit}){visit('Bedroom 1',7.04,10.44,3.15,52);}
  });
}
