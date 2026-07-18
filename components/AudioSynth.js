/**
 * AudioSynth - Procedural Audio Generator for Chess Sounds
 * Uses the Web Audio API to synthesize sounds dynamically in the browser.
 * This guarantees offline support and instant loading without asset files.
 * Custom wood-impact modeling creates extremely realistic, satisfying chess sounds.
 */
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  // Lazy init context because browsers block audio until user interaction
  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute(state) {
    this.muted = (state !== undefined) ? state : !this.muted;
    return this.muted;
  }

  playMove() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Transient impact tap (high pass noise for click)
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.015, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1000;
    noiseFilter.Q.value = 3;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    // 2. Woody resonant body (sine oscillator)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);

    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    // 3. Cabinet overtone (triangle oscillator)
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(260, now);
    subOsc.frequency.exponentialRampToValueAtTime(160, now + 0.04);

    subGain.gain.setValueAtTime(0.08, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    noiseSource.start(now);
    osc.start(now);
    subOsc.start(now);

    noiseSource.stop(now + 0.02);
    osc.stop(now + 0.07);
    subOsc.stop(now + 0.05);
  }

  playCapture() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Sharp knock transient noise
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1800;
    noiseFilter.Q.value = 4;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    // 2. Primary strike frequency
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);

    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    // 3. Secondary body strike
    const overOsc = this.ctx.createOscillator();
    const overGain = this.ctx.createGain();
    overOsc.type = 'triangle';
    overOsc.frequency.setValueAtTime(380, now);
    overOsc.frequency.exponentialRampToValueAtTime(190, now + 0.06);

    overGain.gain.setValueAtTime(0.12, now);
    overGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    overOsc.connect(overGain);
    overGain.connect(this.ctx.destination);

    noiseSource.start(now);
    osc.start(now);
    overOsc.start(now);

    noiseSource.stop(now + 0.04);
    osc.stop(now + 0.1);
    overOsc.stop(now + 0.07);
  }

  playCheck() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Double woody clack for alerts
    const playTap = (delay, pitchOffset) => {
      const now = this.ctx.currentTime + delay;
      
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240 + pitchOffset, now);
      osc.frequency.exponentialRampToValueAtTime(160 + pitchOffset, now + 0.05);
      
      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.06);
    };

    playTap(0, 40);
    playTap(0.06, 0); // Second tap 60ms later, slightly lower pitch
  }

  playCastle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Slide friction sound
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(400, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.12);
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, now);
    noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.15);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.16);

    // End with a woody tap
    setTimeout(() => {
      this.playMove();
    }, 130);
  }

  playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Harmonious wood bell / chime chord arpeggiated: C-Major 7th (C4, E4, G4, B4)
    const freqs = [261.63, 329.63, 392.00, 493.88];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      
      oscGain.gain.setValueAtTime(0.12, now + idx * 0.04);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 1.2);
      
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 1.3);
    });
  }
}

// Export for browser
window.AudioSynth = AudioSynth;
