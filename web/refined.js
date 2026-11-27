    // The vehicle leaf parks parallel to, not through, the preceding timber run.
    const slider=model.children.find(g=>g.userData.name.startsWith('Vehicle gate')).children[0];
    const shut=slider.position.clone(),slide=slider.userData.part.door.travel;
    for(const {box,size} of slider.userData.part.door.hardware){
      const handle=new T.Mesh(new T.BoxGeometry(...size),material('s_posts',true));
      handle.position.fromArray(box);handle.castShadow=true;slider.add(handle);
    }
    for(const u of [-2.46,2.46]){
      const wheel=new T.Mesh(new T.CylinderGeometry(.062,.062,.032,20),material('s_posts',true));
      wheel.rotation.x=Math.PI/2;wheel.position.set(u,-.638,0);slider.add(wheel);
    }
    slider.updateMatrixWorld(true);
    slider.userData.toggle=pos=>{
      const {size:[w,h,d]}=slider.userData.part;
      if(pos && pos.y<shut.y+h/2 && pos.y+@head@>shut.y-h/2){
        const dx=Math.max(shut.x+slide-w/2-pos.x,0,pos.x-shut.x-w/2);
        const dz=Math.max(0,Math.abs(pos.z-shut.z)-d/2);
        if(Math.hypot(dx,dz)<=.18)return false;
      }
      slider.userData.open=!slider.userData.open;
      slider.position.x=shut.x+(slider.userData.open?slide:0);
      slider.updateMatrixWorld(true);return true;
    };
    const daylight=document.createElement('button');
    daylight.id='practicals';daylight.setAttribute('aria-pressed','true');
    $('inventory-button').before(daylight);
    $('status').textContent='House · refined concept';
    $('reference').textContent='Area-matched 1,703 m² enclosure, not surveyed. The drive leaf slides west. Both gates operate by tap or E within reach.';
    $('starts').querySelector('p').textContent+=' The wide drive leaf slides behind the west frontage; stand clear of its travel.';
    const warm={value:1},itemsOn={value:1};
    daylight.onclick=()=>{
      warm.value=1-warm.value;daylight.setAttribute('aria-pressed',String(!!warm.value));
      daylight.textContent=warm.value?'Lighting: daylight + practicals':'Lighting: daylight only';
      material('b_lamp',true).emissiveIntensity=warm.value*.88;draw();
    };
    daylight.textContent='Lighting: daylight + practicals';
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    renderer.outputColorSpace=T.SRGBColorSpace;
    scene.background.set(0xc5dbe6);hemi.color.set(0xe2edff);hemi.groundColor.set(0xb4a089);hemi.intensity=1.20;
    sun.color.set(0xffedcf);sun.intensity=3.12;
    sun.target.position.set(1,1.8,9.0);sun.position.copy(sun.target.position).add(new T.Vector3(-28,37,-24));
    Object.assign(sun.shadow.camera,{left:-33,right:33,bottom:-29,top:29,near:3,far:90});
    sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.027;sun.shadow.bias=-.00044;
    // Shadow depth only changes for a moving leaf or visibility change, not with the camera.
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    for(const g of model.children)for(const m of g.children){
      if(m.userData.toggle){
        const toggle=m.userData.toggle;
        m.userData.toggle=pos=>{const ok=toggle(pos);if(ok)renderer.shadowMap.needsUpdate=true;return ok;};
      }
      if(m.userData.slot==='b_glass'||m.userData.slot==='b_water')m.castShadow=false;
    }
    for(const id of ['level','finish','items','walk','site']){
      const el=$(id),key=['walk','site'].includes(id)?'onclick':'onchange',original=el[key];
      el[key]=function(...args){renderer.shadowMap.needsUpdate=true;itemsOn.value=+$('items').checked;return original.apply(this,args);};
    }
    // Make small specular shapes readable indoors without shipping a photographic HDRI.
    const cv=document.createElement('canvas');cv.width=256;cv.height=128;
    const ec=cv.getContext('2d'),sky=ec.createLinearGradient(0,0,0,128);
    for(const [t,col] of [[0,'#a2bdd6'],[.46,'#eaede4'],[.53,'#9b9b8e'],[1,'#646356']])sky.addColorStop(t,col);
    ec.fillStyle=sky;ec.fillRect(0,0,256,128);ec.fillStyle='#fffbec';ec.fillRect(100,33,24,19);
    const skyTex=new T.CanvasTexture(cv);skyTex.mapping=T.EquirectangularReflectionMapping;skyTex.colorSpace=T.SRGBColorSpace;
    const pm=new T.PMREMGenerator(renderer), env=pm.fromEquirectangular(skyTex);
    scene.environment=env.texture;pm.dispose();skyTex.dispose();
    const dome=document.createElement('canvas');dome.width=256;dome.height=128;
    const dc=dome.getContext('2d'),gradient=dc.createLinearGradient(0,0,0,128);
    for(const [t,col] of [[0,'#83adc9'],[.38,'#b3cfde'],[.5,'#dae5e6'],[1,'#c1c6b7']])gradient.addColorStop(t,col);
    dc.fillStyle=gradient;dc.fillRect(0,0,256,128);
    const haze=new T.CanvasTexture(dome);haze.mapping=T.EquirectangularReflectionMapping;haze.colorSpace=T.SRGBColorSpace;
    scene.background=haze;scene.backgroundIntensity=.90;
    pad.material.color.set(0x869875);pad.material.envMapIntensity=.16;
    const lawn=document.createElement('canvas');lawn.width=lawn.height=256;
    const lc=lawn.getContext('2d'),grass=lc.createImageData(256,256);let seed=17;
    for(let i=0;i<grass.data.length;i+=4){
      const x=(i/4%256)*Math.PI/128,y=Math.floor(i/1024)*Math.PI/128;
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      const k=221+1.6*Math.cos(x*3+y*2)+1.4*Math.sin(y*5-x)+20*seed/4294967296;
      grass.data[i]=grass.data[i+1]=grass.data[i+2]=k;grass.data[i+3]=255;
    }
    lc.putImageData(grass,0,0);const turf=new T.CanvasTexture(lawn);turf.colorSpace=T.SRGBColorSpace;
    turf.wrapS=turf.wrapT=T.RepeatWrapping;turf.repeat.setScalar(radius*30/2.5);
    pad.material.map=turf;pad.material.needsUpdate=true;

    function finishMap(key,mode){
      const cv=document.createElement('canvas');cv.width=cv.height=512;
      const c=cv.getContext('2d'),im=c.createImageData(512,512);
      let state=104729;const random=()=>((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
      const wood=mode==='wood', floor=mode==='floor', period=wood?1.20:floor?.60:1.20;
      for(let y=0;y<512;y++)for(let x=0;x<512;x++){
        let u=x/512*period,v=y/512*period;
        if(key==='e_board_z')[u,v]=[v,u];
        const row=Math.floor(v/(wood?.12:floor?.30:.10));
        const cell=wood?1.20:floor?.30:.30;
        const vv=v%(wood?.12:floor?.30:.10),uu=(u+(!floor&&row%2?cell/2:0))%cell;
        const joint=wood?.0025:floor?.003:.0028;
        const d=Math.min(vv,uu),grain=random()-.5;
        const variation=Math.sin(87.8*row+44.31*Math.floor((u+(row%2)*cell/2)/cell));
        let tone=wood?235+6*variation+3*Math.sin(v*1100+2.8*Math.sin(u*11))+grain*9:
          (floor?241:246)+variation*3+grain*(floor?13:5);
        if(d<joint)tone=(wood?153:floor?190:198)+grain*6;
        else if(d<joint+.0018)tone+=5;
        const i=4*(512*y+x);im.data[i]=im.data[i+1]=im.data[i+2]=tone;im.data[i+3]=255;
      }
      c.putImageData(im,0,0);
      const tex=new T.CanvasTexture(cv);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.setScalar(1/period);
      tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      const m=material(key,true);m.map=tex;m.bumpMap=tex;m.bumpScale=wood?.0022:.0018;m.needsUpdate=true;
    }
    for(const [key,mode] of [['b_tile','floor'],['b_glaze','wall'],['e_board_x','wood'],['e_board_z','wood']])finishMap(key,mode);
    for(const [key,r,m] of [['b_porcelain',.22,.015],['b_seat',.29,0],['b_water',.09,.13],
      ['b_silver',.22,.78],['b_drain',.38,.54],['b_edges',.18,.18],['b_glass',.10,.06],
      ['b_mirror',.09,.85],['b_tile',.75,.013],['b_glaze',.39,.015],['e_fascia',.46,.40],
      ['e_fold',.39,.43],['roof',.51,.27],['f_metal',.39,.43],['f_silver',.30,.51]]){
      Object.assign(material(key,true),{roughness:r,metalness:m});
    }
    Object.assign(material('b_glass',true),{transparent:true,opacity:.175,depthWrite:false});
    material('glass',true).opacity=.23;material('skylight',true).opacity=.14;
    material('b_lamp',true).emissive.set(0xffd5a5);material('b_lamp',true).emissiveIntensity=.88;
    for(const m of neutral.values())m.envMapIntensity=.13;

    // Room-bounded virtual sources approximate bounce at actual opening positions.
    // Add their irradiance in linear space before the filmic display transform.
    renderer.debug.onShaderError=(ctx,program,vertex,fragment)=>{
      error('A lighting shader failed to compile: '+(ctx.getShaderInfoLog(fragment)||ctx.getShaderInfoLog(vertex)));
    };
    // Two storeys × fixed/movable occluders, one inexpensive sample. Derive a
    // soft footprint from geometry near the floor, not inventory-centre blobs.
    const resolution=384,coverage=[-6.4,-.4,18.1,14.8],channels=[];
    for(let channel=0;channel<4;channel++){
      const bitmap=document.createElement('canvas');bitmap.width=bitmap.height=resolution;
      const c=bitmap.getContext('2d');c.fillStyle='black';c.fillRect(0,0,resolution,resolution);
      for(const group of model.children){
        const g=group.userData;
        if(g.level!==(channel>>1)||Boolean(g.furniture)!==Boolean(channel%2)||
           (!g.furniture&&!/· WC and flush|· bath and mixer|· screened shower/.test(g.name)))continue;
        const floor=g.level===1?3.15:g.room?.startsWith('Garage')||g.room==='Hobby room'?-.30:0;
        for(const mesh of group.children){
          const b=new T.Box3().setFromObject(mesh);const lift=b.min.y-floor;
          if(lift>.38||b.max.y-floor<.025||b.max.x-b.min.x<.025||b.max.z-b.min.z<.025)continue;
          const px=(b.min.x-coverage[0])/coverage[2]*resolution,pz=(b.min.z-coverage[1])/coverage[3]*resolution;
          c.fillStyle=`rgb(${Math.round(235-200*Math.max(0,lift))} 0 0)`;
          c.filter=`blur(${1.8+Math.max(0,lift)*12}px)`;
          c.fillRect(px,pz,(b.max.x-b.min.x)*resolution/coverage[2],(b.max.z-b.min.z)*resolution/coverage[3]);
        }
      }
      channels.push(c.getImageData(0,0,resolution,resolution).data);
    }
    const atlas=new Uint8Array(resolution*resolution*4);
    for(let i=0;i<atlas.length;i++)atlas[i]=channels[i%4][i-(i%4)];
    const occlusion=new T.DataTexture(atlas,resolution,resolution);
    occlusion.minFilter=occlusion.magFilter=T.LinearFilter;occlusion.needsUpdate=true;
    const gl=v=>`(${Number(v).toFixed(4)})`,vec=v=>`vec3(${v.map(gl)})`;
    const zoneCode=data.refined.zones.map(z=>{
      const [x,t,X,Z]=z.bounds,y=z.floor,Y=y+(y===3.15?2.865:y<0?4.45:2.714);
      const box=(a,b,c,d)=>`p.x>=${gl(a)} && p.z>=${gl(b)} && p.x<=${gl(c)} && p.z<=${gl(d)}`;
      const ex=z.exclude?` && !(${box(...z.exclude)})`:'';
      // Interior soft contact cue at a wall/finish junction, not a dark outline on objects.
      return `if(p.y>=${gl(y-.01)} && p.y<=${gl(Y)} && ${box(x,@hobbyBound@,X,Z)}${ex}){
        float side=min(min(p.x-${gl(x)},${gl(X)}-p.x),min(p.z-${gl(t)},${gl(Z)}-p.z));
        float foot=max(0.0,p.y-${gl(y)});
        float ao=1.0-.17*exp(-max(side,0.0)*9.0)*exp(-foot*8.0);
        vec3 dd=${vec(z.day)}-p,dl=${vec(z.lamp)}-p;
        float daylight=(.42+.58*max(dot(normalize(dd),N),0.0))/(1.0+.68*dot(dd,dd));
        float practical=(.26+.74*max(dot(normalize(dl),N),0.0))/(.65+dot(dl,dl));
        vec4 field=texture2D(rvContact,(p.xz+vec2(6.4,.4))/vec2(18.1,14.8));
        float contact=max(${y>1?'field.b,rvItems*field.a':'field.r,rvItems*field.g'});
        return ao*(1.-.44*contact*exp(-foot*7.0))*(base*.57 + diffuse*(vec3(.55,.65,.76)*daylight + rvWarm*${z.wet?'rvItems*':''}vec3(1.,.685,.41)*practical*${z.wet?'1.16':'1.74'}));}`;
    }).join('\n');
    for(const [key,m] of [...styled,...neutral]){
      m.envMapIntensity=['b_silver','b_mirror','b_drain'].some(k=>m===styled.get(k))?.77:.19;
      if(/^(s_|e_|roof$|pv$|glass$|skylight$)/.test(key))continue;
      m.onBeforeCompile=shader=>{
        shader.uniforms.rvWarm=warm;shader.uniforms.rvItems=itemsOn;shader.uniforms.rvContact={value:occlusion};
        shader.vertexShader='varying vec3 rvP;\n'+shader.vertexShader.replace('#include <project_vertex>',
          '#include <project_vertex>\nrvP=(modelMatrix*vec4(transformed,1.)).xyz;');
        shader.fragmentShader=`varying vec3 rvP;uniform float rvWarm;uniform float rvItems;uniform sampler2D rvContact;
          vec3 roomBounce(vec3 p,vec3 N,vec3 base,vec3 diffuse){${zoneCode}\nreturn base;}\n`+shader.fragmentShader.replace(
          '#include <lights_fragment_end>',`#include <lights_fragment_end>
          reflectedLight.indirectDiffuse=roomBounce(rvP,inverseTransformDirection(normal,viewMatrix),reflectedLight.indirectDiffuse,diffuseColor.rgb);`);
      };
      m.needsUpdate=true;
    }

    // One modest planar reflection, only when a mirror is in view inside its bathroom.
    // Reflect the eye, then clip against the silvered plane so the wall behind it
    // cannot appear in the reflection. The normal viewer remains on the walking eye.
    const mirrors=model.children.flatMap(g=>g.children).filter(m=>m.userData.part.mirror);
    const rt=new T.WebGLRenderTarget(384,256,{type:T.HalfFloatType}),mirrorCam=new T.PerspectiveCamera();
    const projector=new T.Matrix4(),flip=new T.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
    const glass=new T.ShaderMaterial({uniforms:{picture:{value:rt.texture},proj:{value:projector}},
      vertexShader:`uniform mat4 proj;varying vec4 vP;void main(){vec4 w=modelMatrix*vec4(position,1.);vP=proj*w;gl_Position=projectionMatrix*viewMatrix*w;}`,
      fragmentShader:`uniform sampler2D picture;varying vec4 vP;void main(){gl_FragColor=vec4(texture2DProj(picture,vP).rgb*vec3(.91,.957,.939),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    const actualRender=renderer.render.bind(renderer);
    renderer.render=(sc,cam)=>{
      for(const m of mirrors)m.material=finishes(m.userData.part,$('finish').checked);
      if(walking && $('items').checked && $('finish').checked){
        const eye=cam.position,dir=cam.getWorldDirection(new T.Vector3());
        const surface=mirrors.find(m=>{
          const zone=data.refined.zones.find(z=>z.name===m.parent.userData.room),[x,z,X,Z]=zone.bounds;
          return eye.x>=x && eye.x<=X && eye.z>=z && eye.z<=Z && eye.y>zone.floor && eye.y<zone.floor+2.85 &&
            dir.dot(m.position.clone().sub(eye).normalize())>.08;
        });
        if(surface){
          const n=new T.Vector3(0,0,1).applyQuaternion(surface.quaternion);
          const origin=surface.position.clone().addScaledVector(n,.0055);
          const reflect=p=>p.clone().addScaledVector(n,-2*n.dot(p.clone().sub(origin)));
          mirrorCam.copy(cam);mirrorCam.position.copy(reflect(eye));mirrorCam.up.copy(cam.up.clone().reflect(n));
          mirrorCam.lookAt(reflect(eye.clone().add(dir)));mirrorCam.updateMatrixWorld(true);
          const M=mirrorCam.projectionMatrix,P=new T.Plane().setFromNormalAndCoplanarPoint(n,origin)
            .applyMatrix4(mirrorCam.matrixWorldInverse);
          const clip=new T.Vector4(P.normal.x,P.normal.y,P.normal.z,P.constant);
          const q=new T.Vector4(Math.sign(clip.x),Math.sign(clip.y),1,1).applyMatrix4(M.clone().invert());
          clip.multiplyScalar(2/clip.dot(q));M.elements[2]=clip.x;M.elements[6]=clip.y;
          M.elements[10]=clip.z+1;M.elements[14]=clip.w;
          projector.copy(flip).multiply(M).multiply(mirrorCam.matrixWorldInverse);
          surface.visible=false;renderer.setRenderTarget(rt);actualRender(sc,mirrorCam);
          renderer.setRenderTarget(null);surface.visible=true;surface.material=glass;
        }
      }
      actualRender(sc,cam);
    };
    update();
