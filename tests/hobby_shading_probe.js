// One camera and one armed practical. Change one variable at a time.
const capture=name=>photo(name,[-1.16,1.50,11.10],[-3.81,.34,12],73,true);
capture('normal');
const wall=ray([-3.3,1.5,11.12],[0,0,-1])[0].object;
const lampZone=data.refined.zones.find(z=>z.name==='Hobby');
report.measurements.wall=wall.userData.part;report.measurements.zone=lampZone;
wall.receiveShadow=false;capture('no-received-shadow');wall.receiveShadow=true;
$('practicals').click();capture('lamp-off');$('practicals').click();
const m=wall.material,previous=m.onBeforeCompile,priorKey=m.customProgramCacheKey.bind(m);
const originalKey=priorKey();m.customProgramCacheKey=()=>originalKey+'-hobby-boundary-study';
m.onBeforeCompile=function(shader,...args){
  previous.call(this,shader,...args);
  shader.fragmentShader=shader.fragmentShader.replaceAll('p.z>=(10.8200)','p.z>=(10.8190)');
};
m.needsUpdate=true;capture('boundary-shift-only');
