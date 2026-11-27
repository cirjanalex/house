    $('status').textContent='House · sheet-aligned concept';
    $('reference').textContent='Walk at 1.80 m above your feet. Explore the furnished rooms, then use Terrace canopy to compare shade positions. Drawing notes include the nine-sheet audit.';
    $('starts').querySelector('p').textContent+=' Walking eye: 1.80 m above the supported floor or moving feet, including jumps. Orbit, plan and site views are independent.';
    const awning=document.createElement('button');
    awning.id='canopy';$('inventory-button').before(awning);
    const sails=model.children.filter(g=>g.userData.canopyState);
    function showCanopy(state){
      for(const g of sails)for(const m of g.children){
        m.visible=g.userData.canopyState===state;
        m.raycast=m.visible?T.Mesh.prototype.raycast:()=>{};
      }
      awning.setAttribute('aria-pressed',String(state==='extended'));
      awning.textContent=state==='extended'?'Terrace canopy: extended':'Terrace canopy: retracted';
      renderer.shadowMap.needsUpdate=true;draw();
    }
    awning.onclick=()=>showCanopy(awning.getAttribute('aria-pressed')==='true'?'stowed':'extended');
    function audit(heading,rows){
      const section=document.createElement('section'),title=document.createElement('h3');
      title.textContent=heading;section.append(title);
      for(const [name,text] of rows){
        const row=document.createElement('details'),label=document.createElement('summary'),p=document.createElement('p');
        label.textContent=name;p.textContent=text;row.append(label,p);section.append(row);
      }
      $('noteList').before(section);
    }
    audit('Sheet-by-sheet alignment',data.aligned.sheets.map(([p,title,text])=>[`p. ${p} — ${title}`,text]));
    audit('Room-by-room furnishing decisions',data.aligned.roomAudit);
    function attached(parent,slot,box,at){
      const part=new T.Mesh(new T.BoxGeometry(...box),material(slot,true));
      part.position.fromArray(at);part.castShadow=true;part.receiveShadow=true;parent.add(part);
    }
    for(const g of model.children)for(const m of g.children){
      const p=m.userData.part;
      if(p.leafStyle==='greyPanel'){
        const [w,h,d]=p.size,step=w/16;
        for(let i=0;i<16;i++)attached(m,'a_panelface',[step-.004,h-.009,.010],
          [(i+.5)*step-w/2,0,-d/2-.004]);
        attached(m,'frame',[.025,.66,.033],[w/2-.115,.012,-d/2-.041]);
        for(const y of [-.26,.27])attached(m,'frame',[.026,.028,.046],[w/2-.115,y,-d/2-.021]);
      }
      if(p.leafStyle==='terraceGlass'){
        const [w,h,d]=p.size,rail=.064;
        for(const s of [-1,1]){
          attached(m,'frame',[rail,h,d+.013],[s*(w-rail)/2,0,0]);
          attached(m,'frame',[w-2*rail,rail,d+.013],[0,s*(h-rail)/2,0]);
        }
        m.castShadow=false;
      }
      if(p.saunaLeaf){
        const [w,h,d]=p.size;
        for(const s of [-1,1]){
          attached(m,'a_trim',[.039,h,d+.009],[s*(w-.039)/2,0,0]);
          attached(m,'a_trim',[w-.076,.046,d+.009],[0,s*(h-.046)/2,0]);
          attached(m,'a_wood',[.049,.239,.04],[w/2-.117,.052,s*(d/2+.033)]);
        }
        m.castShadow=false;
        const inverse=m.matrixWorld.clone().invert(),operate=m.userData.toggle;
        const volumes=[new T.Box3().setFromCenterAndSize(new T.Vector3(),new T.Vector3(...p.size))];
        for(const child of m.children){
          child.geometry.computeBoundingBox();child.updateMatrix();
          volumes.push(child.geometry.boundingBox.clone().applyMatrix4(child.matrix));
        }
        for(const b of volumes)b.translate(new T.Vector3(w/2,0,0));
        m.userData.toggle=pos=>{
          if(pos){
            const q=pos.clone().applyMatrix4(inverse);q.x+=w/2;
            if(volumes.some(b=>q.y<=b.max.y&&q.y+WALK_BODY.head>b.min.y&&arcHitsBox(q.x,q.z,1,b)))return false;
          }
          return operate(pos);
        };
      }
      if(p.door?.kind==='garage'){
        const [w,h,d]=p.size;
        for(let i=1;i<6;i++)attached(m,'a_frame',[w-.022,.009,.006],[0,h*(i/6-.5),-d/2-.001]);
        for(let i=1;i<25;i++)attached(m,'a_frame',[.006,h-.012,.006],[w*(i/25-.5),0,-d/2-.001]);
      }
    }
    // Narrow, vertical grain; the actual joints in the walls and the seat gaps are geometry.
    const grain=document.createElement('canvas');grain.width=128;grain.height=256;
    const ctx=grain.getContext('2d'),img=ctx.createImageData(128,256);
    for(let v=0;v<256;v++)for(let u=0;u<128;u++){
      const i=4*(v*128+u),t=243+5*Math.sin(u*.87+Math.sin(v*Math.PI/128))+
        3*Math.sin(u*1.72+2*Math.cos(v*Math.PI/128)) + 2*Math.sin(u*2.7+v*.12);
      img.data[i]=img.data[i+1]=img.data[i+2]=t;img.data[i+3]=255;
    }
    ctx.putImageData(img,0,0);
    const timberMap=new T.CanvasTexture(grain);timberMap.wrapS=timberMap.wrapT=T.RepeatWrapping;
    timberMap.repeat.set(3.0,.95);timberMap.colorSpace=T.SRGBColorSpace;
    for(const slot of ['a_wood','a_bench','a_ash','a_teak','a_trim']){
      const m=material(slot,true);m.map=timberMap;m.roughness=.69;m.needsUpdate=true;
    }
    Object.assign(material('a_bronze',true),{roughness:.48,metalness:.4});
    Object.assign(material('a_screen',true),{roughness:.26,metalness:.22});
    const weave=document.createElement('canvas');weave.width=weave.height=128;
    const wc=weave.getContext('2d');wc.fillStyle='#fffaf2';wc.fillRect(0,0,128,128);
    for(let i=0;i<128;i+=4){
      wc.fillStyle='#e7e1d7';wc.fillRect(i,0,1,128);wc.fillStyle='#f0ebe4';wc.fillRect(0,i,128,1);
    }
    const cloth=new T.CanvasTexture(weave);cloth.wrapS=cloth.wrapT=T.RepeatWrapping;
    cloth.repeat.set(3.2,3.2);cloth.colorSpace=T.SRGBColorSpace;
    Object.assign(material('a_canvas',true),{map:cloth,roughness:.96,needsUpdate:true});
    // The bath practical and the cabin's illustrative shaded wall lamp do not
    // shine through the separating wall. Linear diffuse term before tone mapping.
    const saunaAccent={value:1};
    for(const slot of ['a_wood','a_bench','a_trim','a_frame','a_stone','a_coal','b_tile','b_silver']){
      const m=material(slot,true),previous=m.onBeforeCompile;
      m.onBeforeCompile=function(shader,...rest){
        previous.call(this,shader,...rest);
        shader.uniforms.rvCabin=saunaAccent;shader.uniforms.rvCabinWarm=warm;
        const anchor='#include <lights_fragment_end>';
        shader.fragmentShader='uniform float rvCabin,rvCabinWarm;\n'+shader.fragmentShader.replace(anchor,anchor+`
          if(rvP.x>=.40&&rvP.x<=2.212&&rvP.z>=.40&&rvP.z<=1.621&&rvP.y>=3.15&&rvP.y<6.0){
            vec3 beam=vec3(2.055,4.475,.657)-rvP;
            float amount=(.22+.78*max(dot(normalize(beam),inverseTransformDirection(normal,viewMatrix)),0.0))
              /(.48+dot(beam,beam));
            reflectedLight.indirectDiffuse+=rvCabin*rvCabinWarm*amount*vec3(1.,.61,.30)*diffuseColor.rgb;
          }`);
      };
      m.needsUpdate=true;
    }
    showCanopy('extended');
