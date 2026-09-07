import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Persistent polygon fractures: each cell is replaced by a solid wax flake,
// then by smaller pieces that are pressed into the gel on further kneading.
export class WaxShell {
  constructor(group, deform, profile) {
    this.deform = deform;
    this.profile = profile;
    this.surfaces = [];
    this.cells = [];
    this.broken = [];
    this.beads = [];
    this.cubes = [];
    this.dirty = true;
    this.capacity = 150000;
    this.geometry = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'color']) {
      this.geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(this.capacity * 3), 3).setUsage(THREE.DynamicDrawUsage));
    }
    this.geometry.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(this.geometry, new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: .57, clearcoat: .06, metalness: 0,
      envMapIntensity: .45, side: THREE.DoubleSide,
    }));
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    group.add(this.mesh);
    this.group = group;
    this.topColor = new THREE.Color(profile.shell);
    this.bottomColor = this.topColor.clone().multiplyScalar(.72);
    this.anchor = new THREE.Vector3();
    this.rotation = new THREE.Quaternion();
    this.a = new THREE.Vector3(); this.b = new THREE.Vector3(); this.c = new THREE.Vector3();
    this.ab = new THREE.Vector3(); this.ac = new THREE.Vector3(); this.faceNormal = new THREE.Vector3();
    this.transform = new THREE.Object3D();
  }

  addSurface({ rx, ry, rz, mask, pointAt, tint }) {
    const normalAt = uv => {
      const du=pointAt(new THREE.Vector2(uv.x+.0001,uv.y)).sub(pointAt(new THREE.Vector2(uv.x-.0001,uv.y)));
      const dv=pointAt(new THREE.Vector2(uv.x,Math.min(.99999,uv.y+.0001))).sub(pointAt(new THREE.Vector2(uv.x,Math.max(.00001,uv.y-.0001))));
      return du.cross(dv).normalize();
    };
    const large=Math.max(rx,ry,rz)>.7;
    const rows = large ? Math.round(13*this.profile.density) : 5, columns = large ? Math.round(22*this.profile.density) : 9;
    const sites = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      sites.push(new THREE.Vector2((col + .5 + (Math.random()-.5)*.72)/columns, (row + .5 + (Math.random()-.5)*.72)/rows));
    }
    const surface = { mask, cells: [] };
    for (const site of sites) {
      // Periodic Voronoi cells in UV space; a cell crossing u=0 is painted twice.
      let polygon = [new THREE.Vector2(site.x-.5,0),new THREE.Vector2(site.x+.5,0),new THREE.Vector2(site.x+.5,1),new THREE.Vector2(site.x-.5,1)];
      const neighbors = sites.filter(p=>p!==site).map(p=>{
        const u=p.x + Math.round(site.x-p.x);
        return {x:u,y:p.y,d:4*(u-site.x)**2+(p.y-site.y)**2};
      }).sort((a,b)=>a.d-b.d).slice(0,24);
      for (const other of neighbors) {
        const nx=4*(other.x-site.x), ny=other.y-site.y;
        const limit=(4*(other.x**2-site.x**2)+other.y**2-site.y**2)/2;
        const result=[];
        for(let i=0;i<polygon.length;i++) {
          const a=polygon[i], b=polygon[(i+1)%polygon.length];
          const da=nx*a.x+ny*a.y-limit, db=nx*b.x+ny*b.y-limit;
          if(da<=1e-9)result.push(a);
          if((da<0)!==(db<0))result.push(a.clone().lerp(b,da/(da-db)));
        }
        polygon=result;
        if(polygon.length<3)break;
      }
      if(polygon.length<3)continue;
      const p=pointAt(site), n=normalAt(site);
      const vertices=polygon.map(pointAt);
      const topColor=tint?tint(p):this.topColor;
      const cell={p,n,vertices,polygon,surface,damage:0,chunks:null,seed:Math.random(),stage:0,topColor,bottomColor:topColor.clone().multiplyScalar(.72)};
      surface.cells.push(cell);this.cells.push(cell);
      // Small rounded pearls are hidden below intact wax and exposed by openings.
      const beadCount=large ? 2 : 1;
      for(let j=0;j<beadCount;j++) {
        const beadUV=site.clone().lerp(polygon[Math.floor(Math.random()*polygon.length)], .15+Math.random()*.36);
        const bp=pointAt(beadUV), bn=normalAt(beadUV);
        const radius=(large?this.profile.beadSize:this.profile.beadSize*.55)+Math.random()*.009;
        this.beads.push({p:bp.addScaledVector(bn,-radius-.009),radius,color:Math.random(),cell});
      }
      if(this.profile.id==='bunny'&&large){
        const size=.092+Math.random()*.035;
        this.cubes.push({p:p.clone().addScaledVector(n,-.035),size,cell,
          rotation:new THREE.Euler((Math.random()-.5)*.5,(Math.random()-.5)*.6,(Math.random()-.5)*1.2),color:Math.random()});
      }
    }
    this.surfaces.push(surface);
  }

  finish() {
    this.pearls=new THREE.InstancedMesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshPhysicalMaterial({
      roughness:.17,clearcoat:1,clearcoatRoughness:.15,envMapIntensity:.8,metalness:0,
    }),this.beads.length);
    this.pearls.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pearls.frustumCulled=false;
    const colors=this.profile.beadColors.map(c=>new THREE.Color(c));
    for(let i=0;i<this.beads.length;i++)this.pearls.setColorAt(i,colors[Math.floor(this.beads[i].color*colors.length)]);
    this.group.add(this.pearls);
    if(this.cubes.length){
      this.jellyCubes=new THREE.InstancedMesh(new RoundedBoxGeometry(1,1,1,3,.13),new THREE.MeshPhysicalMaterial({
        roughness:.28,clearcoat:.65,clearcoatRoughness:.22,envMapIntensity:.65,
      }),this.cubes.length);
      this.jellyCubes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.jellyCubes.frustumCulled=false;
      const palette=[0xf5eada,0xd7bde9,0xb495d0].map(c=>new THREE.Color(c));
      this.cubes.forEach((cube,i)=>this.jellyCubes.setColorAt(i,palette[Math.floor(cube.color*palette.length)]));
      this.group.add(this.jellyCubes);
    }
  }

  open(cell) {
    const {ctx,texture}=cell.surface.mask;
    ctx.fillStyle='black';ctx.strokeStyle='black';ctx.lineWidth=1.1;
    for(const shift of [-1,0,1]) {
      ctx.beginPath();
      cell.polygon.forEach((p,i)=>{const x=(p.x+shift)*1024,y=(1-p.y)*1024;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
      ctx.closePath();ctx.fill();ctx.stroke();
    }
    texture.needsUpdate=true;
    cell.stage=1;
    cell.chunks=[this.chunk(cell,cell.vertices,cell.p,0)];
    this.broken.push(cell);
  }

  chunk(cell, vertices, center, index) {
    const axis=new THREE.Vector3().subVectors(vertices[0],center).cross(cell.n).normalize();
    if(axis.lengthSq()<.01)axis.set(1,0,0);
    const local=vertices.map(p=>p.clone().sub(center));
    return {center:center.clone(),local,axis,normal:cell.n,seed:(cell.seed+index*.273)%1};
  }

  crush(cell) {
    // Split the larger wax polygon into irregular triangular prisms.
    cell.chunks=cell.vertices.map((p,i)=>{
      const next=cell.vertices[(i+1)%cell.vertices.length];
      const center=cell.p.clone().add(p).add(next).multiplyScalar(1/3);
      return this.chunk(cell,[cell.p,p,next],center,i+1);
    });
    cell.stage=2;
  }

  stress(field, strength, dt) {
    let events=0;
    for(const cell of this.cells) {
      if(cell.damage>=3.5||cell.n.dot(field.n)<.15)continue;
      const r=cell.p.distanceTo(field.p)/(.36+strength*.22);
      if(r>1.24)continue;
      const influence=Math.exp(-r*r*2.3);
      cell.damage=Math.min(3.5,cell.damage+dt*(.55+strength*.8)*influence*this.profile.speed);
      if(cell.stage===0&&cell.damage>.16){this.open(cell);events++;}
      else if(cell.stage===1&&cell.damage>this.profile.split){this.crush(cell);events++;}
      else if(cell.stage===2&&cell.damage>2.8){cell.stage=3;events++;}
      this.dirty=true;
    }
    return events;
  }

  triangle(a,b,c,color) {
    if(this.count+3>this.capacity)return;
    const pos=this.geometry.attributes.position.array,nor=this.geometry.attributes.normal.array,col=this.geometry.attributes.color.array;
    this.ab.subVectors(b,a);this.ac.subVectors(c,a);this.faceNormal.crossVectors(this.ab,this.ac).normalize();
    for(const p of [a,b,c]) {
      const i=this.count++*3;
      pos[i]=p.x;pos[i+1]=p.y;pos[i+2]=p.z;
      nor[i]=this.faceNormal.x;nor[i+1]=this.faceNormal.y;nor[i+2]=this.faceNormal.z;
      col[i]=color.r;col[i+1]=color.g;col[i+2]=color.b;
    }
  }

  update(moving) {
    if(!this.dirty&&!moving)return;
    this.count=0;
    for(const cell of this.broken)for(const chunk of cell.chunks) {
      const crushed=cell.stage>=2;
      const peel=THREE.MathUtils.smoothstep(cell.damage,.16,.85);
      const embed=crushed?THREE.MathUtils.smoothstep(cell.damage,this.profile.split,3.4):0;
      this.deform(chunk.center.x,chunk.center.y,chunk.center.z,this.anchor);
      // Solid flakes hinge outward. Continued pressure folds fragments into gel.
      const lift=crushed?.035*(1-embed)-.044*embed:.018+peel*this.profile.lift;
      this.anchor.addScaledVector(cell.n,lift);
      const angle=crushed?(.65+chunk.seed*1.5)*(1-embed*.45):(.20+chunk.seed*.75)*peel;
      this.rotation.setFromAxisAngle(chunk.axis,angle*(chunk.seed>.5?1:-1));
      const scale=crushed?(.85-embed*.34):.94;
      const thickness=this.profile.thickness*(crushed?.6:1);
      const vertices=chunk.local.map(p=>p.clone().multiplyScalar(scale).applyQuaternion(this.rotation).add(this.anchor));
      const normal=cell.n.clone().applyQuaternion(this.rotation);
      const bottom=vertices.map(p=>p.clone().addScaledVector(normal,-thickness));
      const center=this.anchor.clone(), bottomCenter=center.clone().addScaledVector(normal,-thickness);
      for(let i=0;i<vertices.length;i++) {
        const j=(i+1)%vertices.length;
        this.triangle(center,vertices[i],vertices[j],cell.topColor);
        this.triangle(bottomCenter,bottom[j],bottom[i],cell.bottomColor);
        this.triangle(vertices[i],bottom[i],bottom[j],cell.bottomColor);
        this.triangle(vertices[i],bottom[j],vertices[j],cell.bottomColor);
      }
    }
    this.geometry.setDrawRange(0,this.count);
    for(const name of ['position','normal','color']) {
      const attribute=this.geometry.attributes[name];attribute.clearUpdateRanges();attribute.addUpdateRange(0,this.count*3);attribute.needsUpdate=true;
    }
    for(let i=0;i<this.beads.length;i++) {
      const bead=this.beads[i];
      this.deform(bead.p.x,bead.p.y,bead.p.z,this.transform.position);
      this.transform.rotation.set(0,0,0);this.transform.scale.setScalar(bead.cell.stage>0?bead.radius:0);this.transform.updateMatrix();this.pearls.setMatrixAt(i,this.transform.matrix);
    }
    this.pearls.instanceMatrix.needsUpdate=true;
    if(this.jellyCubes){
      this.cubes.forEach((cube,i)=>{
        this.deform(cube.p.x,cube.p.y,cube.p.z,this.transform.position);
        const displacement=this.transform.position.distanceTo(cube.p);
        const squash=Math.min(.25,displacement*.5);
        const size=cube.cell.stage>0?cube.size:0;
        this.transform.rotation.copy(cube.rotation);
        this.transform.rotation.z+=squash*.4;
        this.transform.scale.set(size*(1+squash*.45),size*(1-squash),size*(1+squash*.45));
        this.transform.updateMatrix();this.jellyCubes.setMatrixAt(i,this.transform.matrix);
      });
      this.jellyCubes.instanceMatrix.needsUpdate=true;
    }
    this.dirty=false;
  }

  reset() {
    for(const cell of this.cells){cell.damage=0;cell.stage=0;cell.chunks=null;}
    for(const {mask} of this.surfaces){mask.ctx.fillStyle='white';mask.ctx.fillRect(0,0,1024,1024);mask.texture.needsUpdate=true;}
    this.broken.length=0;this.dirty=true;
  }

  get state() {
    return {cracks:this.broken.length,flakes:this.broken.filter(c=>c.stage===1).length,crumbled:this.broken.filter(c=>c.stage>=2).length,embedded:this.broken.filter(c=>c.stage===3).length,shardVertices:this.count||0,jellyCubes:this.cubes.filter(c=>c.cell.stage>0).length};
  }
}
