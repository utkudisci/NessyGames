class MadLabAudioService {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Quick high-frequency pop for tube selection
  playTubeSelect() {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  // Satisfying pitch-sliding chemical pour effect with bubble-like modulation
  playLiquidPour() {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.35);

    // Apply quick gain oscillation to simulate liquid bubble pops
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.15, now);
    
    // Bubble effect modulation
    for (let i = 0; i < 6; i++) {
      const time = now + i * 0.06;
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.linearRampToValueAtTime(0.05, time + 0.03);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.4);
  }

  // Low buzz error for illegal/blocked moves
  playInvalidMove() {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
  }

  // Shiny arpeggio chime for Hints
  playHintUse() {
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C major chords
    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.05);

      gain.gain.setValueAtTime(0, now + index * 0.05);
      gain.gain.linearRampToValueAtTime(0.1, now + index * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + index * 0.05);
      osc.stop(now + index * 0.05 + 0.22);
    });
  }

  // Celebratory lab success tune
  playLevelSuccess() {
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // Ascending C major scale arpeggio
    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.45);
    });
  }

  startPourSound(options?: { volume?: number }) {
    this.initCtx();
    if (!this.ctx) {
      return { setIntensity: (_val: number) => {}, stop: () => {} };
    }

    const baseVol = options?.volume ?? 0.28;
    const now = this.ctx.currentTime;

    // Create White Noise buffer for sloshing
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;

    // Filter white noise to sound like liquid slosh
    const filterNode = this.ctx.createBiquadFilter();
    filterNode.type = 'bandpass';
    filterNode.frequency.setValueAtTime(600, now);
    filterNode.Q.setValueAtTime(2.0, now);

    // Warm base liquid oscillator
    const oscNode = this.ctx.createOscillator();
    oscNode.type = 'triangle';
    oscNode.frequency.setValueAtTime(180, now);

    // Low-frequency slosh modulator (LFO at 12Hz)
    const bubbleLFO = this.ctx.createOscillator();
    bubbleLFO.type = 'sine';
    bubbleLFO.frequency.setValueAtTime(12, now);

    const bubbleGain = this.ctx.createGain();
    bubbleGain.gain.setValueAtTime(50, now);

    bubbleLFO.connect(bubbleGain);
    bubbleGain.connect(filterNode.frequency);

    // Individual gains
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.linearRampToValueAtTime(baseVol * 0.4, now + 0.05);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.linearRampToValueAtTime(baseVol * 0.6, now + 0.05);

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(1.0, now);

    // Connect audio routing graph
    noiseNode.connect(filterNode);
    filterNode.connect(noiseGain);
    noiseGain.connect(masterGain);

    oscNode.connect(oscGain);
    oscGain.connect(masterGain);

    masterGain.connect(this.ctx.destination);

    // Start audio sources
    noiseNode.start(now);
    oscNode.start(now);
    bubbleLFO.start(now);

    let isStopped = false;

    return {
      setIntensity: (val: number) => {
        if (isStopped || !this.ctx) return;
        const time = this.ctx.currentTime;
        masterGain.gain.setValueAtTime(masterGain.gain.value, time);
        masterGain.gain.linearRampToValueAtTime(val, time + 0.05);
        oscNode.frequency.setValueAtTime(180 + val * 60, time);
      },
      stop: () => {
        if (isStopped || !this.ctx) return;
        isStopped = true;
        const stopTime = this.ctx.currentTime;
        masterGain.gain.setValueAtTime(masterGain.gain.value, stopTime);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + 0.08);

        setTimeout(() => {
          try {
            noiseNode.stop();
            oscNode.stop();
            bubbleLFO.stop();
            noiseNode.disconnect();
            oscNode.disconnect();
            bubbleLFO.disconnect();
            filterNode.disconnect();
            noiseGain.disconnect();
            oscGain.disconnect();
            masterGain.disconnect();
          } catch (e) {
            // Safe ignore
          }
        }, 100);
      }
    };
  }

  // Procedural drip pop sound
  playDrip() {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.07);
  }

  // Soft high-frequency glass click when tube is replaced
  playGlassTap() {
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }
}

export const madlabAudio = new MadLabAudioService();
export default madlabAudio;
