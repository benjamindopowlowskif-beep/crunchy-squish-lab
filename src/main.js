import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import { SquishAudio } from './audio.js';

const canvas = document.querySelector('#scene');
const hint = document.querySelector('#hint-text');
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true}); }
catch { document.querySelector('#error').hidden = false; document.querySelector('#error').textContent = '需要支持 WebGL 的浏览器。请开启浏览器硬件加速后刷新。'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .95;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, .05);
scene.environment = environment.texture;
room.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xfff8ef, 0xc7a59c, .85));
const key = new THREE.DirectionalLight(0xfff5e8, 2.8);
key.position.set(-3, 6, 5); key.castShadow = true;
key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera, {left:-4,right:4,top:5,bottom:-3,near:.1,far:20});
key.shadow.normalBias = .025; key.shadow.bias = -.0002; key.shadow.radius = 5;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffe2db, 1.6); rim.position.set(4,3,-2); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x846a61,opacity:.055}));
floor.rotation.x = -Math.PI/2; floor.position.y = -.015; floor.receiveShadow = true; scene.add(floor);
const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
const sc = shadowCanvas.getContext('2d'), gradient = sc.createRadialGradient(64,64,4,64,64,64);
gradient.addColorStop(0,'rgba(89,58,49,0.25)'); gradient.addColorStop(.45,'rgba(89,58,49,0.12)');gradient.addColorStop(1,'rgba(89,58,49,0)');
sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;shadow.position.y=.002;scene.add(shadow);

const toy = new THREE.Group(); scene.add(toy);
const shell = new THREE.MeshPhysicalMaterial({color:0xeaa6ad,roughness:.32,metalness:0,clearcoat:.3,clearcoatRoughness:.36,envMapIntensity:.65});
const soft = new THREE.MeshStandardMaterial({color:0xffc8c2,roughness:.97,envMapIntensity:.35});
const dark = new THREE.MeshStandardMaterial({color:0x654238,roughness:.4});
const innerEar = new THREE.MeshStandardMaterial({color:0xc67f89,roughness:.64});
const blush = new THREE.MeshStandardMaterial({color:0xe08c98,roughness:.8});
const parts = [], targets = [], originals = [], shellMasks = [];
function part(rx,ry,rz,x,y,z,material=shell,segments=64) {
  const geo = new THREE.SphereGeometry(1,segments,Math.floor(segments*.75));
  geo.scale(rx,ry,rz);geo.translate(x,y,z);
  const mesh = new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;toy.add(mesh);
  const base = new Float32Array(geo.attributes.position.array);
  const normals = new Float32Array(geo.attributes.normal.array);
  parts.push({mesh,base,normals});
  if(material===shell){
    // A real inset foam mesh sits under an opaque shell with persistent cutouts.
    const maskCanvas=document.createElement('canvas');maskCanvas.width=maskCanvas.height=1024;
    const ctx=maskCanvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1024,1024);
    const texture=new THREE.CanvasTexture(maskCanvas);texture.anisotropy=4;
    mesh.material=shell.clone();mesh.material.alphaMap=texture;mesh.material.alphaTest=.5;
    const mask={ctx,texture};shellMasks.push(mask);
    const coreGeo=geo.clone(), corePosition=coreGeo.attributes.position;
    for(let i=0;i<base.length;i+=3)corePosition.setXYZ(i/3,base[i]-normals[i]*.012,base[i+1]-normals[i+1]*.012,base[i+2]-normals[i+2]*.012);
    const coreMesh=new THREE.Mesh(coreGeo,soft);coreMesh.castShadow=true;toy.add(coreMesh);
    parts.push({mesh:coreMesh,base:new Float32Array(corePosition.array),normals});
    targets.push(mesh);const original=new THREE.Mesh(geo.clone(),material);original.userData.mask=mask;original.updateMatrixWorld(); originals.push(original);
  }
  return mesh;
}
// A broad, continuous body is the primary deformable surface.
part(1.03,1.35,.75,0,1.48,0);
part(.265,.285,.21,-.61,2.69,-.015);part(.265,.285,.21,.61,2.69,-.015);
part(.153,.175,.048,-.61,2.70,.183,innerEar,32);part(.153,.175,.048,.61,2.70,.183,innerEar,32);
part(.30,.48,.38,-.87,1.15,.03);part(.30,.48,.38,.87,1.15,.03);
part(.40,.265,.46,-.51,.27,.22);part(.40,.265,.46,.51,.27,.22);
part(.32,.20,.085,0,1.98,.637,soft,48);
part(.055,.063,.039,-.265,2.18,.627,dark,24);part(.055,.063,.039,.265,2.18,.627,dark,24);
part(.067,.043,.026,0,2.022,.727,dark,24);
part(.10,.044,.015,-.43,2.035,.588,blush,24);part(.10,.044,.015,.43,2.035,.588,blush,24);
const mouthCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-.067,1.96,.721),new THREE.Vector3(0,1.935,.727),new THREE.Vector3(.067,1.96,.721)]);
const mouthGeometry = new THREE.TubeGeometry(mouthCurve,16,.009,5,false);
const mouth = new THREE.Mesh(mouthGeometry,dark);toy.add(mouth);parts.push({mesh:mouth,base:new Float32Array(mouthGeometry.attributes.position.array),normals:new Float32Array(mouthGeometry.attributes.normal.array)});

const raycaster = new THREE.Raycaster(), surfaceRay = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const audio = new SquishAudio();
const fields = [], cracks = [];
let active = null, down = false, pointerId = null, pressStart = 0, lastCrack = 0, resetTime = -100;
let crackCount = 0, maxIndent = 0;
let geometryDirty = true;
const clock = new THREE.Clock();
const v = new THREE.Vector3(), delta = new THREE.Vector3();
function deform(x,y,z,out) {
  out.set(x,y,z);
  for(const f of fields){
    const dx=x-f.p.x,dy=y-f.p.y,dz=z-f.p.z;
    const r2=(dx*dx+dy*dy+dz*dz)/(f.radius*f.radius);
    if(r2>7)continue;
    const fall=Math.exp(-r2*2.5), ring=Math.exp(-Math.pow(Math.sqrt(r2)-.95,2)*12)*.17;
    const depth=f.depth;
    out.addScaledVector(f.n,depth*(-fall+ring));
    out.addScaledVector(f.drag,fall*.32);
  }
  return out;
}
function pick(event) {
  const rect=canvas.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(targets,false)[0];
  if(!hit)return null;
  // Use barycentric coordinates to recover the material point before deformation.
  const item=parts.find(p=>p.mesh===hit.object), position=hit.object.geometry.attributes.position;
  const a=new THREE.Vector3().fromBufferAttribute(position,hit.face.a), b=new THREE.Vector3().fromBufferAttribute(position,hit.face.b), c=new THREE.Vector3().fromBufferAttribute(position,hit.face.c);
  const local=toy.worldToLocal(hit.point.clone());
  const bary=new THREE.Vector3();THREE.Triangle.getBarycoord(local,a,b,c,bary);
  const p=new THREE.Vector3(), n=new THREE.Vector3();
  [hit.face.a,hit.face.b,hit.face.c].forEach((index,i)=>{const weight=bary.getComponent(i);p.addScaledVector(new THREE.Vector3().fromArray(item.base,index*3),weight);n.addScaledVector(new THREE.Vector3().fromArray(item.normals,index*3),weight);});
  return {p,n:n.normalize()};
}
function newField(hit,depth=0){const f={p:hit.p.clone(),n:hit.n.clone(),drag:new THREE.Vector3(),depth,target:.1,radius:.49};fields.push(f);return f;}
function surfacePoint(point, normal){surfaceRay.set(point.clone().addScaledVector(normal,.7),normal.clone().negate());return surfaceRay.intersectObjects(originals,false)[0];}
const crackMat = new THREE.LineBasicMaterial({color:0x945761,transparent:true,opacity:.61,depthWrite:false});
const coreMat = new THREE.LineBasicMaterial({color:0xffd9c7,transparent:true,opacity:.9,depthWrite:false});
function addCrack(field,strength){
  if(cracks.length>=100)return;
  const normal=field.n.clone(), tangent=new THREE.Vector3().crossVectors(normal,Math.abs(normal.y)>.9?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize();
  const bitangent=new THREE.Vector3().crossVectors(normal,tangent).normalize();
  const points=[];
  const offset=tangent.clone().multiplyScalar((Math.random()-.5)*.15).addScaledVector(bitangent,(Math.random()-.5)*.15);
  const origin=field.p.clone().add(offset);
  const branches=3+Math.floor(strength*3);
  for(let branch=0;branch<branches;branch++){
    let angle=branch/branches*Math.PI*2+Math.random()*.7;
    let current=origin.clone(), previous=surfacePoint(current,normal);
    const steps=3+Math.floor(Math.random()*3+strength*2);
    for(let j=0;j<steps;j++){
      angle+=(Math.random()-.5)*.9;
      current.addScaledVector(tangent,Math.cos(angle)*.038).addScaledVector(bitangent,Math.sin(angle)*.038);
      const next=surfacePoint(current,normal);
      if(next&&previous){
        points.push(previous.point.clone().addScaledVector(normal,.006),next.point.clone().addScaledVector(normal,.006));
        if(next.object===previous.object&&Math.abs(next.uv.x-previous.uv.x)<.5){
          const {ctx,texture}=next.object.userData.mask;
          ctx.strokeStyle='black';ctx.lineWidth=1.8+strength*3.2;ctx.lineCap='round';
          ctx.beginPath();ctx.moveTo(previous.uv.x*1024,(1-previous.uv.y)*1024);ctx.lineTo(next.uv.x*1024,(1-next.uv.y)*1024);ctx.stroke();texture.needsUpdate=true;
        }
      }
      previous=next;
    }
  }
  if(!points.length)return;
  const geometry=new THREE.BufferGeometry().setFromPoints(points);
  const line=new THREE.LineSegments(geometry,crackMat);toy.add(line);
  const base=new Float32Array(geometry.attributes.position.array);
  // Pale edges make the darker fissures read as an opening into soft cream.
  const coreGeometry=geometry.clone(), core=new THREE.LineSegments(coreGeometry,coreMat);toy.add(core);
  cracks.push({line,core,base,normal});crackCount++;
}
function release(){
  if(!down)return;
  down=false;if(active)active.target=0;
  active=null;canvas.classList.remove('pressing');audio.play(.2,true);
  hint.textContent='慢慢回弹中，裂纹会留下。';
  if(pointerId!==null&&canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);
  pointerId=null;
}
canvas.addEventListener('pointerdown',event=>{
  if(down||event.button!==0)return;
  const hit=pick(event);if(!hit)return;
  event.preventDefault();audio.unlock();
  down=true;pointerId=event.pointerId;canvas.setPointerCapture(pointerId);canvas.classList.add('pressing');
  active=newField(hit);pressStart=clock.elapsedTime;lastCrack=pressStart-.2;hint.textContent='再压一点点，听见脆脆的声音。';
});
canvas.addEventListener('pointermove',event=>{
  if(!down||event.pointerId!==pointerId)return;
  const hit=pick(event);if(!hit)return;
  delta.copy(hit.p).sub(active.p);
  if(delta.length()>.13){
    active.target=0;
    const oldDepth=active.depth;
    active=newField(hit);active.depth=oldDepth*.55;
    active.drag.copy(delta).clampLength(0,.2);
    if(fields.length>16)fields.shift();
  }else{active.drag.lerp(delta,.5);active.p.lerp(hit.p,.32);active.n.lerp(hit.n,.25).normalize();}
});
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);window.addEventListener('blur',release);
document.addEventListener('visibilitychange',()=>{if(document.hidden)release();});
document.querySelector('#sound').addEventListener('click',()=>{const enabled=audio.toggle();audio.unlock();document.querySelector('#sound').setAttribute('aria-pressed',String(enabled));document.querySelector('#sound-text').textContent=enabled?'声音开启':'声音关闭';document.querySelector('#sound-icon').textContent=enabled?'◖))':'◖×';});
document.querySelector('#reset').addEventListener('click',()=>{
  release();fields.length=0;
  geometryDirty=true;
  for(const c of cracks){toy.remove(c.line,c.core);c.line.geometry.dispose();c.core.geometry.dispose();}
  for(const {ctx,texture} of shellMasks){ctx.fillStyle='white';ctx.fillRect(0,0,1024,1024);texture.needsUpdate=true;}
  cracks.length=0;crackCount=0;resetTime=clock.elapsedTime;hint.textContent='新的一只，把今天的压力交给它。';
});
function resize(){
  const width=innerWidth,height=innerHeight;renderer.setSize(width,height);camera.aspect=width/height;
  const narrow=width<=760;
  camera.position.set(0,3.35,narrow?10.5:8.6);camera.lookAt(0,1.45,0);
  camera.setViewOffset(width,height,narrow?0:-width*.105,narrow?-height*.045:0,width,height);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
function tick(){
  const dt=Math.min(clock.getDelta(),.04), time=clock.elapsedTime;
  const updateGeometry=geometryDirty||fields.length>0;
  if(down&&active){
    const strength=Math.min(1,(time-pressStart)/1.35);
    active.target=.12+strength*.29;
    if(time-lastCrack>.30+Math.random()*.18){addCrack(active,strength);audio.play(strength);lastCrack=time;}
  }
  for(let i=fields.length-1;i>=0;i--){const f=fields[i];f.depth+=(f.target-f.depth)*(1-Math.exp(-dt*(f.target>0?9:2.05)));if(f.target===0){f.drag.multiplyScalar(Math.exp(-dt*3));if(f.depth<.001)fields.splice(i,1);}}
  if(updateGeometry){
  maxIndent=0;
  for(const {mesh,base} of parts){
    const position=mesh.geometry.attributes.position;
    for(let i=0;i<base.length;i+=3){deform(base[i],base[i+1],base[i+2],v);position.setXYZ(i/3,v.x,v.y,v.z);if(mesh===targets[0])maxIndent=Math.max(maxIndent,Math.abs(v.z-base[i+2]));}
    position.needsUpdate=true;mesh.geometry.computeVertexNormals();
  }
  for(const c of cracks){const position=c.line.geometry.attributes.position, edge=c.core.geometry.attributes.position;for(let i=0;i<c.base.length;i+=3){deform(c.base[i],c.base[i+1],c.base[i+2],v);position.setXYZ(i/3,v.x,v.y,v.z);edge.setXYZ(i/3,v.x+.0025,v.y+.0025,v.z+.001);}position.needsUpdate=true;edge.needsUpdate=true;}
  geometryDirty=false;
  }
  const resetAge=time-resetTime;
  toy.scale.setScalar(resetAge<.5?1+Math.sin(resetAge/.5*Math.PI)*.035:1);
  if(!down&&fields.length===0&&time-resetTime>3)hint.textContent='按住慢慢压 · 拖动揉一揉';
  renderer.render(scene,camera);requestAnimationFrame(tick);
}
// Read-only diagnostics for browser QA.
window.__squish={get state(){return {down,fields:fields.length,cracks:crackCount,maxIndent,sound:audio.enabled,geometries:renderer.info.memory.geometries};}};
tick();
