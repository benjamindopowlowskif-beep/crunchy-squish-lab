import sampleManifest from './samples.js';

function resolveSamplePath(path){
  if(/^(?:https?:|data:|blob:)/i.test(path))return path;
  return (import.meta.env?.BASE_URL || '/') + path.replace(/^\/+/, '');
}

export const SOUND_PROFILES = {
  peach:   {name:'细脆',duration:.21,grains:14,decay:.008,attack:.0008,cutoff:5600,highpass:1000,body:.04,gain:.80,rubDuration:.28,rubCutoff:2300,rubGain:.26},
  bunny:   {name:'轻柔酥裂',duration:.22,grains:7,decay:.015,attack:.004,cutoff:1800,highpass:180,body:.18,gain:.30,rubDuration:.28,rubCutoff:1200,rubGain:.20,crackInterval:.30},
  pudding: {name:'闷软',duration:.36,grains:4,decay:.060,attack:.004,cutoff:800,highpass:45,body:.80,gain:1.1,rubDuration:.48,rubCutoff:520,rubGain:.56},
  orange:  {name:'啵脆',duration:.25,grains:5,decay:.012,attack:.0006,cutoff:4400,highpass:180,body:.38,gain:.90,rubDuration:.30,rubCutoff:1300,rubGain:.36},
  bear:    {name:'咔嚓',duration:.28,grains:9,decay:.018,attack:.001,cutoff:3400,highpass:450,body:.18,gain:.75,rubDuration:.33,rubCutoff:1700,rubGain:.29},
};

// Noise-only tactile textures. No pitched oscillator or musical "beep" layer.
// Kept separate from Web Audio so spectra, level and envelopes can be checked.
export function renderTexture(toy, kind, strength, sampleRate, random=Math.random) {
  const p=SOUND_PROFILES[toy]||SOUND_PROFILES.bear;
  strength=Math.max(0,Math.min(1,strength));
  const rubbing=kind!=='crack',release=kind==='release';
  const duration=rubbing?p.rubDuration*(release?1.15:1):p.duration*(.8+strength*.4);
  const data=new Float32Array(Math.ceil(duration*sampleRate));
  const count=rubbing?5:Math.max(2,Math.round(p.grains*(.65+strength*.5)));
  const grains=Array.from({length:count},(_,i)=>({
    t:i===0?.004:random()*duration*.65,
    amp:.4+random()*.6,
    decay:(rubbing?.055:p.decay)*(.7+random()*.6),
  }));
  const cutoff=(rubbing?p.rubCutoff:p.cutoff)*(.85+strength*.15);
  const alpha=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
  const hpAlpha=1-Math.exp(-2*Math.PI*(rubbing?70:p.highpass)/sampleRate);
  const bodyAlpha=1-Math.exp(-2*Math.PI*(toy==='pudding'?210:450)/sampleRate);
  let low=0,highBase=0,body=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,noise=random()*2-1;
    low+=alpha*(noise-low);highBase+=hpAlpha*(low-highBase);body+=bodyAlpha*(noise-body);
    let envelope=0;
    for(const g of grains){
      const age=t-g.t;
      if(age>=0)envelope+=g.amp*(1-Math.exp(-age/(rubbing?.009:p.attack)))*Math.exp(-age/g.decay);
    }
    if(rubbing)envelope=envelope*.35+Math.pow(Math.sin(Math.PI*t/duration),2)*.45;
    const fade=Math.min(1,t/(rubbing?.015:.002))*Math.min(1,(duration-t)/.018);
    const noiseMix=(low-highBase)*(1-p.body)+body*p.body*3;
    const gain=rubbing?p.rubGain*(release?.55:1):p.gain;
    data[i]=Math.tanh(noiseMix*envelope*2)*gain*(.55+strength*.25)*fade*.65;
  }
  return data;
}

export class SquishAudio {
  enabled=true;
  ctx=null;
  toy='peach';
  samples=new Map();
  voices=new Set();
  last={crack:-Infinity,knead:-Infinity,release:-Infinity};
  counts={crack:0,knead:0,release:0};
  lastEvent=null;

  async unlock(){
    try{
      if(!this.ctx){
        this.ctx=new (window.AudioContext||window.webkitAudioContext)();
        this.master=this.ctx.createGain();this.master.gain.value=this.enabled?.65:0;
        this.compressor=this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value=-18;this.compressor.ratio.value=5;
        this.master.connect(this.compressor).connect(this.ctx.destination);
        // Resume directly in the gesture; recordings load independently.
        const resume=this.ctx.resume();
        this.loadSamples();
        await resume;
      }else if(this.ctx.state==='suspended')await this.ctx.resume();
    }catch(error){console.warn('音频暂不可用，揉捏仍可继续。',error);}
  }

  async loadSamples(){
    const jobs=[];
    const add=(key,paths)=>jobs.push(Promise.all(paths.map(async path=>{
      try{
        const response=await fetch(resolveSamplePath(path));if(!response.ok)throw new Error(String(response.status));
        return await this.ctx.decodeAudioData(await response.arrayBuffer());
      }catch{return null;}
    })).then(buffers=>this.samples.set(key,buffers.filter(Boolean))));
    for(const [key,value] of Object.entries(sampleManifest)){
      if(Array.isArray(value))add(key,value); // Backward-compatible common samples.
      else for(const [kind,paths] of Object.entries(value))add(key+':'+kind,paths);
    }
    await Promise.all(jobs);
  }

  setToy(id){
    this.stop();
    this.toy=SOUND_PROFILES[id]?id:'bear';
    this.last={crack:-Infinity,knead:-Infinity,release:-Infinity};
  }

  stop(){
    if(!this.ctx)return;
    const now=this.ctx.currentTime;
    for(const voice of this.voices){
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0,now,.006);
      try{voice.source.stop(now+.03);}catch{}
    }
  }

  toggle(){
    this.enabled=!this.enabled;
    if(this.ctx)this.master.gain.setTargetAtTime(this.enabled?.65:0,this.ctx.currentTime,.015);
    if(!this.enabled)this.stop();
    return this.enabled;
  }

  play(strength=.4,release=false){return this.emit(release?'release':'crack',strength);}
  knead(strength=.3,movement=.01){if(movement>.004)return this.emit('knead',strength);}

  emit(kind,strength){
    if(!this.ctx||!this.enabled||this.ctx.state!=='running')return false;
    const now=this.ctx.currentTime;
    const interval=kind==='crack'?(SOUND_PROFILES[this.toy].crackInterval||.15):kind==='knead'?.26:.10;
    if(now-this.last[kind]<interval)return false;
    // Let fresh fracture transients remain audible above rubbing.
    if(kind==='knead'&&now-this.last.crack<.11)return false;
    this.last[kind]=now;
    const sampleKind=kind==='crack'?(strength<.35?'light':strength<.7?'medium':'heavy'):kind;
    const recordings=this.samples.get(this.toy+':'+sampleKind)||this.samples.get(sampleKind);
    const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();
    if(recordings?.length){
      source.buffer=recordings[Math.floor(Math.random()*recordings.length)];
      gain.gain.value=kind==='crack'?.55:.35;
    }else{
      const data=renderTexture(this.toy,kind,strength,this.ctx.sampleRate);
      source.buffer=this.ctx.createBuffer(1,data.length,this.ctx.sampleRate);
      source.buffer.copyToChannel(data,0);
      gain.gain.value=1;
    }
    source.playbackRate.value=.96+Math.random()*.08;
    source.connect(gain).connect(this.master);
    const voice={source,gain};this.voices.add(voice);
    if(this.voices.size>4){
      const oldest=this.voices.values().next().value;
      oldest.gain.gain.setTargetAtTime(0,now,.006);
      try{oldest.source.stop(now+.03);}catch{}
    }
    source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};
    source.start();
    this.counts[kind]++;this.lastEvent={toy:this.toy,kind};
    return true;
  }

  get state(){return {toy:this.toy,texture:SOUND_PROFILES[this.toy].name,enabled:this.enabled,context:this.ctx?.state||'locked',counts:{...this.counts},lastEvent:this.lastEvent};}
}
