/** Original, quiet procedural ambience. No film soundtrack or external audio requests. */
export class AudioController {
  constructor() {
    this.context = null; this.playing = false; this.muted = false; this.volume = .35;
    this.scene = 'intro'; this.timer = null; this.note = 0;
    this.toggle = document.querySelector('#audio-play');
    this.muteButton = document.querySelector('#audio-mute');
    this.toggle.addEventListener('click', () => this.playing ? this.pause() : this.play());
    this.muteButton.addEventListener('click', () => { this.muted = !this.muted; this.updateGain(); this.syncUI(); });
    document.querySelector('#audio-volume').addEventListener('input', e => {
      this.volume = Number(e.target.value)/100; this.updateGain(); this.syncUI();
    });
    document.addEventListener('visibilitychange', () => {
      if(!this.context) return;
      if(document.hidden) this.context.suspend().catch(()=>{});
      else if(this.playing) this.context.resume().catch(()=>{});
    });
  }
  async init() {
    if(this.context) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if(!Context) throw new Error('Audio is unavailable in this browser.');
    this.context = new Context();
    this.master = this.context.createGain(); this.master.gain.value = 0;
    this.master.connect(this.context.destination);
    this.pad = this.context.createGain(); this.pad.gain.value = .13; this.pad.connect(this.master);
    [130.81,196,261.63].forEach((hz,i) => {
      const oscillator=this.context.createOscillator(); const gain=this.context.createGain();
      oscillator.type='sine'; oscillator.frequency.value=hz; oscillator.detune.value=(i-1)*4;
      gain.gain.value=.17/(i+1); oscillator.connect(gain); gain.connect(this.pad); oscillator.start();
    });
  }
  async play() {
    try {
      await this.init(); await this.context.resume(); this.playing=true;
      this.updateGain(); this.syncUI(); this.melody();
      clearInterval(this.timer); this.timer=setInterval(()=>this.melody(),3400);
      document.querySelector('#announcement').textContent='Original ambient sound is playing.';
    } catch(error) {
      this.playing=false; this.syncUI();
      document.querySelector('#announcement').textContent='Audio could not start. The story is available without sound.';
    }
  }
  pause() {
    this.playing=false; clearInterval(this.timer); this.timer=null;
    this.updateGain(); this.syncUI();
  }
  updateGain() {
    if(!this.context) return;
    this.master.gain.setTargetAtTime(this.playing&&!this.muted?this.volume*.6:0,this.context.currentTime,.5);
  }
  syncUI() {
    this.toggle.textContent=this.playing?'Pause ambience':'Play ambience';
    this.muteButton.disabled=!this.context;
    this.muteButton.textContent=this.muted?'Unmute':'Mute';
    this.muteButton.setAttribute('aria-pressed',String(this.muted));
    const active=this.playing&&!this.muted&&this.volume>0;
    document.querySelector('#sound-label').textContent=active?'Sound on':this.playing&&this.muted?'Muted':'Sound off';
    document.querySelector('#sound-toggle').classList.toggle('playing',active);
  }
  melody() {
    if(!this.playing||this.muted||document.hidden) return;
    const notes=this.scene==='intro'?[261.63,293.66,392,329.63,293.66,220]:[523.25,392,440,659.25,587.33,392,329.63,440];
    const frequency=notes[this.note++%notes.length];
    this.tone(frequency,2.8,.07);
    if(this.note%3===0) this.tone(frequency*.5,3.2,.025,.35);
  }
  tone(frequency,duration=.8,volume=.08,delay=0) {
    if(!this.context||!this.playing||this.muted) return;
    const now=this.context.currentTime+delay;
    const oscillator=this.context.createOscillator(); const envelope=this.context.createGain();
    oscillator.type='sine'; oscillator.frequency.value=frequency;
    envelope.gain.setValueAtTime(.0001,now);
    envelope.gain.exponentialRampToValueAtTime(volume,now+.025);
    envelope.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(envelope); envelope.connect(this.master); oscillator.start(now);oscillator.stop(now+duration+.05);
    oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};
  }
  effect(kind='chime') {
    if(!this.playing||this.muted||!this.context) return;
    if(kind==='page') {
      const size=Math.ceil(this.context.sampleRate*.2); const buffer=this.context.createBuffer(1,size,this.context.sampleRate);
      const data=buffer.getChannelData(0);for(let i=0;i<size;i++) data[i]=(Math.random()*2-1)*(1-i/size)*.025;
      const source=this.context.createBufferSource();const filter=this.context.createBiquadFilter();
      filter.type='lowpass';filter.frequency.value=1500;source.buffer=buffer;source.connect(filter);filter.connect(this.master);source.start();
      source.onended=()=>{source.disconnect();filter.disconnect();};
    } else {this.tone(659.25,.9,.07);this.tone(987.77,1.4,.035,.1);}
  }
  setScene(scene){this.scene=scene;}
}
