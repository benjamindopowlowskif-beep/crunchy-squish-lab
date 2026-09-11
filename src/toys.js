import * as THREE from 'three';

export const TOYS = [
  {id:'peach',name:'蜜桃团团',subtitle:'蜜桃凝胶 · 细碎薄壳',image:'/concepts/peach.webp',shell:0xeea4b0,gel:0xc26583,depth:.46,rebound:1.8,drag:.60,radius:.51,density:1.25,speed:1.3,thickness:.014,lift:.07,split:1.0,beadSize:.024,beadColors:[0xffedd8,0xf7c4d2,0xe8a1bd]},
  {id:'bunny',name:'奶冻垂耳兔',subtitle:'紫色奶冻 · 绵软折叠',image:'/concepts/bunny.webp',shell:0xf5e1b9,gel:0x9474b6,depth:.50,rebound:1.5,drag:.78,radius:.57,density:1.05,speed:1.05,thickness:.017,lift:.10,split:1.4,beadSize:.029,beadColors:[0xc3a5e7,0xe5d6f5,0x9872be]},
  {id:'pudding',name:'焦糖布丁猫',subtitle:'金黄奶馅 · 浓稠慢揉',image:'/concepts/pudding.webp',shell:0xf3c665,gel:0xc99440,depth:.54,rebound:1.25,drag:.95,radius:.60,density:.8,speed:.85,thickness:.033,lift:.055,split:1.8,beadSize:.034,beadColors:[0xe4a327,0xf2cc6e,0xffdfa1]},
  {id:'orange',name:'橘子小啾',subtitle:'橙色果冻 · 弹润大珠',image:'/concepts/orange.webp',shell:0xea9537,gel:0xd88728,depth:.34,rebound:2.9,drag:.25,radius:.44,density:.9,speed:1.15,thickness:.027,lift:.08,split:1.15,beadSize:.053,beadColors:[0xf0a52c,0xffd063,0xecb447]},
  {id:'bear',name:'草莓奶油小熊',subtitle:'树莓软心 · 奶油蜡壳',image:'/concepts/bear.webp',shell:0xf2c8af,gel:0x9d4861,depth:.41,rebound:2.05,drag:.32,radius:.49,density:1,speed:1,thickness:.023,lift:.065,split:1.35,beadSize:.023,beadColors:[0xffe2aa,0xf59aae,0xaa2854]},
];

// Sculpted parametric surfaces remain shared with the breakable wax layer.
export function buildToy(id,{part,stroke,shell,cream,dark,innerEar,blush,material}) {
  let body;
  const ray=new THREE.Raycaster();
  const front=(mesh,x,y,offset=.008)=>{
    mesh.updateWorldMatrix(true,false);
    ray.set(new THREE.Vector3(x,y,4),new THREE.Vector3(0,0,-1));
    const hit=ray.intersectObject(mesh,false)[0];
    return hit?hit.point.z+offset:.9;
  };
  const onFace=(x,y,offset=.008)=>front(body,x,y,offset);
  const eye=(x,y)=>part(.061,.072,.036,x,y,onFace(x,y,.013),dark,32);
  const eyes=(x,y)=>{eye(-x,y);eye(x,y);};
  const faceLine=(xy,mat=dark,r=.012)=>stroke(xy.map(([x,y])=>[x,y,onFace(x,y,.012)]),mat,r);
  const smile=(y,w=.10)=>faceLine([[-w,y],[-w*.74,y-.034],[-w*.33,y-.033],[0,y-.005],[w*.33,y-.033],[w*.74,y-.034],[w,y]]);
  const tintWithCheeks=(base,cx,cy,pink=0xee91a3)=>{
    const c=new THREE.Color(typeof base==='function'?0xffffff:base),rose=new THREE.Color(pink);
    return p=>{
      const tint=typeof base==='function'?base(p):c.clone();
      const d=Math.min((p.x-cx)**2,(p.x+cx)**2)/.034+(p.y-cy)**2/.017;
      return tint.lerp(rose,Math.exp(-d)*.68*THREE.MathUtils.smoothstep(p.z,.35,.7));
    };
  };
  const leafMaterial=material(0x91b572,.65);
  const veinMaterial=material(0x709450,.7);
  const leaf=(x,y,z,rx,ry,angle)=>{
    const axis=new THREE.Vector3(0,0,1);
    const warp=p=>{p.x*=.55+.45*(1-Math.abs(p.y/ry));p.z+=.035*Math.sin(p.y/ry*Math.PI);return p.applyAxisAngle(axis,angle);};
    const mesh=part(rx,ry,.034,x,y,z,leafMaterial,48,{warp});
    const points=[-.73,-.35,0,.35,.76].map(t=>{
      const p=new THREE.Vector3(0,t*ry,0).applyAxisAngle(axis,angle);
      return [p.x+x,p.y+y,front(mesh,p.x+x,p.y+y,.005)];
    });
    stroke(points,veinMaterial,.006);
  };
  const paw=(x,y,rx=.19,ry=.16)=>{
    part(rx,ry,.095,x,y,onFace(x,y,-.043),shell,40);
  };
  if(id==='peach'){
    const warp=p=>{
      const t=p.y/1.01;
      p.x*=1-.12*t;
      p.y=Math.sign(t)*Math.pow(Math.abs(t),.82)*1.01;
      const seam=Math.exp(-p.x*p.x/.018);
      p.z-=Math.max(0,p.z)*.105*seam;
      p.y-=.085*seam*Math.max(0,t);
      p.y+=.085*seam*Math.max(0,-t);
      return p;
    };
    const pink=p=>new THREE.Color(0xffe3b9).lerp(new THREE.Color(0xed91aa),THREE.MathUtils.smoothstep(p.y,.20,1.9));
    body=part(1.20,1.01,.97,0,1.015,0,shell,112,{warp,tint:tintWithCheeks(pink,.51,.64)});
    eyes(.32,.87);smile(.73,.102);
    leaf(.62,1.83,.48,.16,.29,-.77);
    leaf(.90,1.77,.38,.14,.235,-1.36);
  }else if(id==='bunny'){
    const warp=p=>{
      const t=p.y/.95;p.x*=1-.09*t;p.y=Math.sign(t)*Math.pow(Math.abs(t),.80)*.95;
      const paws=Math.exp(-((p.x-.4)**2)/.022)+Math.exp(-((p.x+.4)**2)/.022);
      p.z+=.10*paws*Math.exp(-((p.y+.51)**2)/.018)*THREE.MathUtils.smoothstep(p.z,.30,.62);
      return p;
    };
    body=part(1.20,.95,.92,0,1.025,0,shell,112,{warp,tint:tintWithCheeks(0xf7e7c5,.49,1.03,0xf0a3b1)});
    // Root sits inside the crown; the heavy rounded end drapes along the cheek.
    for(const side of [-1,1]){
      const warpEar=p=>{
        const t=p.y/.48;
        p.x*=.83-.12*t;
        p.x+=side*(-.22*t+.06*(1-t*t));
        p.z+=.12*(1-t*t);
        return p;
      };
      const tint=p=>new THREE.Color(0xc7afd9).lerp(new THREE.Color(0xf7e7c5),THREE.MathUtils.smoothstep(p.y,1.06,1.68));
      part(.28,.48,.15,side*.91,1.51,.46,shell,64,{warp:warpEar,tint});
    }
    eyes(.31,1.20);
    part(.048,.032,.023,0,1.075,onFace(0,1.075,.012),blush,32);
    faceLine([[0,1.055],[0,1.012],[-.029,.989]],blush,.009);
    faceLine([[0,1.012],[.029,.989]],blush,.009);
    part(.22,.115,.245,-.47,.125,.25);part(.22,.115,.245,.47,.125,.25);
  }else if(id==='pudding'){
    const warp=p=>{
      const tx=p.x/1.13,ty=p.y/.86,tz=p.z/.88;
      p.x=1.13*Math.sign(tx)*Math.pow(Math.abs(tx),.72)*(1-.11*ty);
      p.z=.88*Math.sign(tz)*Math.pow(Math.abs(tz),.72)*(1-.08*ty);
      p.y=.86*Math.sign(ty)*Math.pow(Math.abs(ty),.46);
      // Ear peaks are sculpted into the crown, with no separate cones or seams.
      const ears=Math.exp(-((p.x-.78)**2)/.033)+Math.exp(-((p.x+.78)**2)/.033);
      p.y+=.205*ears*Math.exp(-p.z*p.z/.21)*THREE.MathUtils.smoothstep(ty,.25,.80);
      const paws=Math.exp(-((p.x-.43)**2)/.026)+Math.exp(-((p.x+.43)**2)/.026);
      p.z+=.125*paws*Math.exp(-((p.y+.66)**2)/.025)*THREE.MathUtils.smoothstep(p.z,.3,.6);
      return p;
    };
    const tint=p=>new THREE.Color(p.y>1.44+.07*Math.cos(p.x*10)+.035*Math.sin(p.z*9)?0xa0602d:0xf3c66b);
    body=part(1.13,.86,.88,0,.925,0,shell,144,{warp,tint,caramel:true});
    faceLine([[-.43,.97],[-.40,1.005],[-.35,1.02],[-.30,1.008],[-.27,.975]],dark,.016);
    faceLine([[.27,.975],[.30,1.008],[.35,1.02],[.40,1.005],[.43,.97]],dark,.016);
    smile(.83,.11);
  }else if(id==='orange'){
    const warp=p=>{const t=p.y/.98;p.x*=1-.065*t;p.y=.98*Math.sign(t)*Math.pow(Math.abs(t),.82);return p;};
    body=part(1.16,.98,.96,0,1.025,0,shell,112,{warp,tint:tintWithCheeks(0xf1a039,.51,.98,0xf59a7c)});
    // Wings are low relief bumps, tucked into the sides rather than separate arms.
    part(.145,.25,.16,-1.035,.76,.26);part(.145,.25,.16,1.035,.76,.26);
    eyes(.31,1.14);
    part(.113,.061,.07,0,1.01,onFace(0,1.01,.045),cream,40);
    part(.082,.026,.05,0,.951,onFace(0,.951,.04),cream,32);
    part(.20,.09,.22,-.40,.10,.24);part(.20,.09,.22,.40,.10,.24);
    leaf(.20,2.045,.28,.20,.34,-.94);
  }else{
    const warp=p=>{
      const t=p.y/.98;p.x*=1-.08*t;p.y=.98*Math.sign(t)*Math.pow(Math.abs(t),.78);
      const paws=Math.exp(-((p.x-.41)**2)/.025)+Math.exp(-((p.x+.41)**2)/.025);
      p.z+=.105*paws*Math.exp(-((p.y+.53)**2)/.022)*THREE.MathUtils.smoothstep(p.z,.3,.65);
      return p;
    };
    body=part(1.19,.98,.93,0,1.06,0,shell,112,{warp,tint:tintWithCheeks(0xf2c8af,.50,1.06,0xef9ca9)});
    part(.235,.225,.21,-.79,1.98,-.005);part(.235,.225,.21,.79,1.98,-.005);
    part(.22,.12,.245,-.47,.125,.26);part(.22,.12,.245,.47,.125,.26);
    eyes(.31,1.23);
    const muzzle=part(.205,.139,.066,0,1.079,onFace(0,1.079,-.02),cream,48);
    part(.047,.032,.025,0,1.13,front(muzzle,0,1.13,.009),dark,32);
    for(const side of [-1,1]){
      const path=[[0,1.115],[0,1.07],[side*.025,1.045],[side*.057,1.045],[side*.077,1.063]];
      stroke(path.map(([x,y])=>[x,y,front(muzzle,x,y,.011)]),dark,.010);
    }
  }
}
