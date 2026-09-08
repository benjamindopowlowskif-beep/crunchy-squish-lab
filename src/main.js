import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import './style.css';
import './picker.css';
import './music.js';
import { SquishAudio } from './audio.js';
import { WaxShell } from './wax-shell.js';
import { TOYS, buildToy } from './toys.js';

const canvas = document.querySelector('#scene');
const hint = document.querySelector('#hint-text');
let renderer;
try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true}); }
catch { document.querySelector('#error').hidden = false; document.querySelector('#error').textContent = '需要支持 WebGL 的浏览器。请开启浏览器硬件加速后刷新。'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .72;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = pmrem.fromScene(room, .05);
scene.environment = environment.texture;
room.dispose(); pmrem.dispose();
scene.add(new THREE.HemisphereLight(0xfff8ef, 0xc7a59c, .60));
const key = new THREE.DirectionalLight(0xfff5e8, 2.15);
key.position.set(-3, 6, 5); key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
Object.assign(key.shadow.camera, {left:-4,right:4,top:5,bottom:-3,near:.1,far:20});
key.shadow.normalBias = .018; key.shadow.bias = -.0002; key.shadow.radius = 5;key.shadow.blurSamples=8;
scene.add(key);
const rim = new THREE.DirectionalLight(0xffe2db, .75); rim.position.set(4,3,-2); scene.add(rim);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x846a61,opacity:.15}));
floor.rotation.x = -Math.PI/2; floor.position.y = -.015; floor.receiveShadow = true; scene.add(floor);
const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
const sc = shadowCanvas.getContext('2d'), gradient = sc.createRadialGradient(64,64,4,64,64,64);
gradient.addColorStop(0,'rgba(89,58,49,0.25)'); gradient.addColorStop(.45,'rgba(89,58,49,0.12)');gradient.addColorStop(1,'rgba(89,58,49,0)');
sc.fillStyle=gradient;sc.fillRect(0,0,128,128);
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.3),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));
shadow.rotation.x=-Math.PI/2;shadow.position.y=.002;scene.add(shadow);

const toy = new THREE.Group(); scene.add(toy);
// Fine surface relief catches the key light like a wax dip, without plastic gloss.
const grainData=new Uint8Array(256*256*4);
for(let i=0;i<grainData.length;i+=4){const value=180+Math.floor(Math.random()*65);grainData[i]=grainData[i+1]=grainData[i+2]=value;grainData[i+3]=255;}
const waxGrain=new THREE.DataTexture(grainData,256,256);waxGrain.wrapS= waxGrain.wrapT=THREE.RepeatWrapping;waxGrain.repeat.set(2,2);waxGrain.magFilter=THREE.LinearFilter;waxGrain.minFilter=THREE.LinearMipmapLinearFilter;waxGrain.generateMipmaps=true;waxGrain.needsUpdate=true;
let shell,soft,cream,dark,innerEar,blush,wax;
let selected=TOYS[0];
const parts = [], targets = [];
function material(color,roughness=.6){return new THREE.MeshStandardMaterial({color,roughness});}
function part(rx,ry,rz,x,y,z,mat=shell,segments=64,options={}) {
  const geo = new THREE.SphereGeometry(1,segments,Math.floor(segments*.75));
  const pointAt=uv=>{
    const phi=uv.x*Math.PI*2,theta=(1-uv.y)*Math.PI;
    let p=new THREE.Vector3(-rx*Math.cos(phi)*Math.sin(theta),ry*Math.cos(theta),rz*Math.sin(phi)*Math.sin(theta));
    if(options.warp)p=options.warp(p);
    return p.add(new THREE.Vector3(x,y,z));
  };
  const positions=geo.attributes.position,uvs=geo.attributes.uv;
  for(let i=0;i<positions.count;i++){const p=pointAt(new THREE.Vector2(uvs.getX(i),uvs.getY(i)));positions.setXYZ(i,p.x,p.y,p.z);}
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;toy.add(mesh);
  const base = new Float32Array(geo.attributes.position.array);
  const normals = new Float32Array(geo.attributes.normal.array);
  parts.push({mesh,base,normals,isShell:mat===shell});
  if(mat===shell){
    // The wax skin stays relatively rigid; the inset gel takes the full dent.
    const maskCanvas=document.createElement('canvas');maskCanvas.width=maskCanvas.height=1024;
    const ctx=maskCanvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1024,1024);
    const texture=new THREE.CanvasTexture(maskCanvas);texture.anisotropy=4;
    mesh.material=shell.clone();mesh.material.alphaMap=texture;mesh.material.alphaTest=.5;
    if(options.tint){
      const colors=new Float32Array(positions.count*3);
      for(let i=0;i<positions.count;i++)options.tint(new THREE.Vector3().fromBufferAttribute(positions,i)).toArray(colors,i*3);
      geo.setAttribute('color',new THREE.BufferAttribute(colors,3));mesh.material.vertexColors=true;mesh.material.color.set(0xffffff);
    }
    if(options.caramel){
      mesh.material.vertexColors=false;
      mesh.material.onBeforeCompile=shader=>{
        shader.uniforms.custardColor={value:new THREE.Color(0xf3c66b)};
        shader.uniforms.caramelColor={value:new THREE.Color(0xa0602d)};
        shader.vertexShader='varying vec3 vWaxPosition;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaxPosition = position;');
        shader.fragmentShader='varying vec3 vWaxPosition;\nuniform vec3 custardColor;\nuniform vec3 caramelColor;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float border = 1.44 + 0.07 * cos(vWaxPosition.x * 10.0) + 0.035 * sin(vWaxPosition.z * 9.0);
          float cap = smoothstep(border - 0.005, border + 0.005, vWaxPosition.y);
          diffuseColor.rgb *= mix(custardColor, caramelColor, cap);`);
      };
      mesh.material.customProgramCacheKey=()=> 'caramel-wax-v1';
    }
    const mask={ctx,texture};
    const coreGeo=geo.clone(), corePosition=coreGeo.attributes.position;coreGeo.deleteAttribute('color');
    for(let i=0;i<base.length;i+=3)corePosition.setXYZ(i/3,base[i]-normals[i]*.043,base[i+1]-normals[i+1]*.043,base[i+2]-normals[i+2]*.043);
    const coreMesh=new THREE.Mesh(coreGeo,soft);coreMesh.castShadow=false;toy.add(coreMesh);
    parts.push({mesh:coreMesh,base:new Float32Array(corePosition.array),normals,isCore:true});
    // Invisible hit surface follows the gel, so holes remain draggable.
    targets.push(coreMesh);
    wax.addSurface({rx,ry,rz,mask,pointAt,tint:options.tint});
  }
  return mesh;
}
function stroke(points,mat,radius){
  const geo=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),20,radius,6,false);
  const mesh=new THREE.Mesh(geo,mat);toy.add(mesh);parts.push({mesh,base:new Float32Array(geo.attributes.position.array),normals:new Float32Array(geo.attributes.normal.array)});
}
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const audio = new SquishAudio();
const fields = [];
let active = null, down = false, pointerId = null, pressStart = 0, resetTime = -100;
let maxIndent = 0;
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
    out.addScaledVector(f.drag,fall*selected.drag);
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
function newField(hit,depth=0){const f={p:hit.p.clone(),n:hit.n.clone(),drag:new THREE.Vector3(),depth,target:.1,radius:selected.radius};fields.push(f);return f;}
function release(){
  if(!down)return;
  down=false;if(active)active.target=0;
  active=null;canvas.classList.remove('pressing');audio.play(.2,true);
  hint.textContent='内芯慢慢鼓起，碎掉的蜡壳不会复原。';
  if(pointerId!==null&&canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);
  pointerId=null;
}
canvas.addEventListener('pointerdown',event=>{
  if(down||event.button!==0)return;
  const hit=pick(event);if(!hit)return;
  event.preventDefault();audio.unlock();
  down=true;pointerId=event.pointerId;canvas.setPointerCapture(pointerId);canvas.classList.add('pressing');
  active=newField(hit);pressStart=clock.elapsedTime;hint.textContent='压开薄蜡壳，再揉一揉里面的软心。';
});
canvas.addEventListener('pointermove',event=>{
  if(!down||event.pointerId!==pointerId)return;
  const hit=pick(event);if(!hit)return;
  delta.copy(hit.p).sub(active.p);
  audio.knead(Math.min(1,active.depth/selected.depth),delta.length());
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
document.querySelector('#sound').addEventListener('click',()=>{const enabled=audio.toggle();audio.unlock();document.querySelector('#sound').setAttribute('aria-pressed',String(enabled));document.querySelector('#sound-text').textContent=enabled?'音效开启':'音效关闭';document.querySelector('#sound-icon').textContent=enabled?'◖))':'◖×';});
document.querySelector('#reset').addEventListener('click',()=>{
  release();fields.length=0;
  geometryDirty=true;
  wax.reset();resetTime=clock.elapsedTime;hint.textContent='新的一只，把今天的压力交给它。';
});
function selectToy(id){
  release();fields.length=0;maxIndent=0;
  // Release all GPU assets belonging to the previous specimen, including masks.
  const geometries=new Set(),materials=new Set(),textures=new Set();
  toy.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});
  for(const mat of [shell,soft,cream,dark,innerEar,blush])if(mat)materials.add(mat);
  for(const mat of materials){for(const key of ['map','alphaMap'])if(mat[key])textures.add(mat[key]);mat.dispose();}
  for(const texture of textures)texture.dispose();for(const geo of geometries)geo.dispose();
  toy.clear();toy.scale.setScalar(1);parts.length=0;targets.length=0;
  selected=TOYS.find(t=>t.id===id)||TOYS[0];
  audio.setToy(selected.id);
  shell=new THREE.MeshPhysicalMaterial({color:selected.shell,roughness:.51,clearcoat:.06,envMapIntensity:.25,bumpMap:waxGrain,bumpScale:selected.id==='orange'?.018:.011});
  soft=new THREE.MeshPhysicalMaterial({color:selected.gel,roughness:selected.id==='pudding'?.30:.19,clearcoat:1,clearcoatRoughness:.16,envMapIntensity:.7});
  cream=material(selected.id==='orange'?0xffcd61:0xffdac4);dark=material(0x241710,.18);innerEar=material(0xc67f89);blush=material(0xe79ca8);
  wax=new WaxShell(toy,deform,selected);
  buildToy(selected.id,{part,stroke,shell,soft,cream,dark,innerEar,blush,material});wax.finish();
  geometryDirty=true;resetTime=clock.elapsedTime;
  document.querySelector('#specimen-name').textContent=selected.name;
  document.querySelector('#specimen-detail').textContent=selected.subtitle;
  canvas.setAttribute('aria-label',`可按压的${selected.name}：按住加深，拖动揉捏`);
  document.querySelectorAll('[data-toy]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.toy===selected.id)));
  hint.textContent=`${selected.name}，轻轻捏一下。`;
}
const picker=document.querySelector('#toy-options');
for(const item of TOYS){
  const button=document.createElement('button');button.className='toy-option';button.dataset.toy=item.id;button.setAttribute('aria-pressed','false');
  const thumb=document.createElement('span');thumb.className='toy-thumb';
  if(item.image){const image=document.createElement('img');image.src=item.image;image.alt='';thumb.append(image);}else thumb.textContent='ʕ•ᴥ•ʔ';
  const label=document.createElement('span');label.className='toy-label';
  const name=document.createElement('span');name.textContent=item.name;const detail=document.createElement('small');detail.textContent=item.subtitle;label.append(name,detail);
  button.append(thumb,label);button.addEventListener('click',()=>{if(selected.id!==item.id)selectToy(item.id);});picker.append(button);
}
selectToy(selected.id);
function resize(){
  const width=innerWidth,height=innerHeight;renderer.setSize(width,height);camera.aspect=width/height;
  const narrow=width<=760;
  camera.position.set(narrow?1.1:1.25,narrow?2.7:2.6,narrow?10.8:8.0);camera.lookAt(0,1.08,0);
  camera.setViewOffset(width,height,narrow?0:-width*.025,narrow?height*.06:0,width,height);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);resize();
function tick(){
  const dt=Math.min(clock.getDelta(),.12), time=clock.elapsedTime;
  const updateGeometry=geometryDirty||fields.length>0;
  if(down&&active){
    const strength=Math.min(1,(time-pressStart)/1.35);
    active.target=.10+strength*(selected.depth-.10);
    const fractures=wax.stress(active,strength,dt);
    if(fractures>0)audio.play(strength);
  }
  for(let i=fields.length-1;i>=0;i--){const f=fields[i];f.depth+=(f.target-f.depth)*(1-Math.exp(-dt*(f.target>0?9:selected.rebound)));if(f.target===0){f.drag.multiplyScalar(Math.exp(-dt*selected.rebound));if(f.depth<.001)fields.splice(i,1);}}
  if(updateGeometry){
  maxIndent=0;
  for(const {mesh,base,isShell} of parts){
    const position=mesh.geometry.attributes.position;
    for(let i=0;i<base.length;i+=3){
      deform(base[i],base[i+1],base[i+2],v);
      if(isShell){v.x=base[i]+(v.x-base[i])*.18;v.y=base[i+1]+(v.y-base[i+1])*.18;v.z=base[i+2]+(v.z-base[i+2])*.18;}
      position.setXYZ(i/3,v.x,v.y,v.z);if(mesh===targets[0])maxIndent=Math.max(maxIndent,Math.abs(v.z-base[i+2]));
    }
    position.needsUpdate=true;mesh.geometry.computeVertexNormals();
  }
  geometryDirty=false;
  }
  wax.update(updateGeometry);
  const resetAge=time-resetTime;
  toy.scale.setScalar(resetAge<.5?1+Math.sin(resetAge/.5*Math.PI)*.035:1);
  if(!down&&fields.length===0&&time-resetTime>3)hint.textContent='按住慢慢压 · 拖动揉一揉';
  renderer.render(scene,camera);requestAnimationFrame(tick);
}
// Read-only diagnostics for browser QA.
window.__squish={get state(){return {toy:selected.id,down,fields:fields.length,...wax.state,maxIndent,sound:audio.enabled,audio:audio.state,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,profile:{depth:selected.depth,rebound:selected.rebound,drag:selected.drag,thickness:selected.thickness,beadSize:selected.beadSize}};}};
tick();
