import { useSettingsStore } from '../../stores/useSettingsStore';

export interface ActiveSoundHandle {
  stop(): void;
}

class AudioService {
  private ctx: AudioContext | null = null;
  private musicInterval: any = null;

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

  private getVolumes() {
    const state = useSettingsStore.getState();
    if (state.isMuted) {
      return { master: 0, sfx: 0, music: 0 };
    }
    return {
      master: state.masterVolume,
      sfx: state.sfxVolume,
      music: state.musicVolume,
    };
  }

  playClick() {
    this.initCtx();
    if (!this.ctx) return;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx;
    if (volume <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(volume * 0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  playPop(groupSize: number) {
    this.initCtx();
    if (!this.ctx) return;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx;
    if (volume <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Lower pitch for larger groups (feels heavier and punchier)
    const baseFreq = Math.max(150, 450 - groupSize * 25);
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(volume * 0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);

    // If it's a large group, add a small noise burst for extra juicy punch
    if (groupSize >= 6) {
      this.playExplosionNoise(volume * 0.25);
    }
  }

  private playExplosionNoise(vol: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.15; // 150ms noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.16);
  }

  playCombo(combo: number) {
    this.initCtx();
    if (!this.ctx) return;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx;
    if (volume <= 0) return;

    // Play an ascending sequence of notes based on combo count
    const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C major scale
    const noteIndex = Math.min(notes.length - 1, combo - 1);
    const freq = notes[noteIndex];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(volume * 0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.26);
  }

  playBonus() {
    this.initCtx();
    if (!this.ctx) return;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx;
    if (volume <= 0) return;

    // Arpeggio sound
    const playArpNote = (freq: number, delay: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume * 0.2, this.ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + 0.25);
    };

    const root = 523.25; // C5
    playArpNote(root, 0);
    playArpNote(root * 1.25, 0.05); // E5
    playArpNote(root * 1.5, 0.1);    // G5
  }

  playFanfare() {
    this.initCtx();
    if (!this.ctx) return;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx;
    if (volume <= 0) return;

    const now = this.ctx.currentTime;
    
    // Ascent arpeggio (C5 -> E5 -> G5 -> C6 -> E6 -> G6 -> C7)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    
    notes.forEach((freq, index) => {
      const time = now + index * 0.06; // 60ms between notes
      const duration = 0.12;
      
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume * 0.22, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(time);
      osc.stop(time + duration);
    });

    // Chord Progression Fanfare (I - IV - V - I)
    const progressions = [
      {
        timeOffset: 0.42,
        notes: [523.25, 659.25, 783.99, 1046.50], // I: C5 + E5 + G5 + C6
        duration: 0.35
      },
      {
        timeOffset: 0.77,
        notes: [587.33, 698.46, 880.00, 1174.66], // IV: D5 + F5 + A5 + D6
        duration: 0.35
      },
      {
        timeOffset: 1.12,
        notes: [659.25, 783.99, 987.77, 1318.51], // V: E5 + G5 + B5 + E6
        duration: 0.35
      },
      {
        timeOffset: 1.47,
        notes: [523.25, 659.25, 783.99, 1046.50, 2093.00], // I: C5 + E5 + G5 + C6 + C7 (Grand Finale)
        duration: 1.2
      }
    ];

    progressions.forEach((prog) => {
      const chordTime = now + prog.timeOffset;
      const chordDuration = prog.duration;
      
      prog.notes.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const filter = this.ctx!.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, chordTime);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, chordTime);
        
        // Add LFO vibrato only to the sustaining grand finale chord
        if (prog.duration > 0.5) {
          const lfo = this.ctx!.createOscillator();
          const lfoGain = this.ctx!.createGain();
          lfo.frequency.setValueAtTime(6.0, chordTime);
          lfoGain.gain.setValueAtTime(5.0, chordTime);
          
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          
          lfo.start(chordTime);
          lfo.stop(chordTime + chordDuration);
        }
        
        gain.gain.setValueAtTime(0, chordTime);
        gain.gain.linearRampToValueAtTime(volume * 0.16, chordTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + chordDuration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx!.destination);
        
        osc.start(chordTime);
        osc.stop(chordTime + chordDuration);
      });
    });
  }

  playDrumroll(options?: {
    duration?: number;
    startRate?: number;
    endRate?: number;
    volume?: number;
    finalHit?: boolean;
    looping?: boolean;
  }): ActiveSoundHandle {
    this.initCtx();
    const handle: ActiveSoundHandle = {
      stop: () => {
        isStopped = true;
        activeTimeouts.forEach(t => clearTimeout(t));
        activeTimeouts.length = 0;
        activeNodes.forEach(n => {
          try { n.stop(); } catch (e) {}
        });
        activeNodes.length = 0;
      }
    };

    if (!this.ctx) return handle;
    const { master, sfx } = this.getVolumes();
    const baseVolume = master * sfx * (options?.volume ?? 1.0);
    if (baseVolume <= 0) return handle;

    const duration = options?.duration ?? 2.0;
    const startRate = options?.startRate ?? 11;
    const endRate = options?.endRate ?? 28;
    const finalHit = options?.finalHit ?? true;

    const looping = options?.looping ?? false;

    let isStopped = false;
    const activeNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
    const activeTimeouts: any[] = [];

    let loopStartTime = this.ctx.currentTime;

    // Create a shared noise buffer for snare rattle
    const sampleRate = this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, sampleRate * 0.1, sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.random() * 2 - 1;
    }

    const scheduleNextHit = () => {
      if (isStopped || !this.ctx) return;

      const now = this.ctx.currentTime;
      const elapsed = now - loopStartTime;
      const progress = Math.min(1.0, elapsed / duration);

      if (elapsed >= duration) {
        if (looping) {
          // Restart the loop from the beginning
          loopStartTime = now;
          const timeoutId = setTimeout(scheduleNextHit, 10);
          activeTimeouts.push(timeoutId);
          return;
        } else {
          if (finalHit) {
            this.playFinalDrumHit(baseVolume, activeNodes);
          }
          return;
        }
      }

      const currentRate = startRate + (endRate - startRate) * progress;
      const jitter = (Math.random() * 0.2 - 0.1) * (1.0 / currentRate);
      const nextInterval = (1.0 / currentRate) + jitter;

      // Crescendo curve
      const volMultiplier = 0.2 + 0.8 * progress;
      const hitVol = baseVolume * volMultiplier * (0.9 + Math.random() * 0.2);

      this.triggerSingleDrumHit(now, hitVol, noiseBuffer, activeNodes);

      const timeoutId = setTimeout(scheduleNextHit, nextInterval * 1000);
      activeTimeouts.push(timeoutId);
    };

    scheduleNextHit();
    return handle;
  }

  playWrongBuzzer() {
    this.initCtx();
    if (!this.ctx) return;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx;
    if (volume <= 0) return;

    const now = this.ctx.currentTime;

    // Two descending dissonant tones (classic "wrong answer" TV buzzer)
    const tones = [
      { freq: 311.13, type: 'sawtooth' as OscillatorType },  // Eb4
      { freq: 277.18, type: 'sawtooth' as OscillatorType },  // Db4
    ];

    tones.forEach((tone) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.freq, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.25, now + 0.02);
      gain.gain.setValueAtTime(volume * 0.25, now + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    });
  }

  // Alias for backward compatibility
  playDrumRoll(options?: any): ActiveSoundHandle {
    return this.playDrumroll(options);
  }

  private triggerSingleDrumHit(
    hitTime: number, 
    volume: number, 
    noiseBuffer: AudioBuffer, 
    activeNodes: (OscillatorNode | AudioBufferSourceNode)[]
  ) {
    if (!this.ctx) return;

    // 1. Noise Layer
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    const bandpassFreq = 2000 + Math.random() * 1000;
    bandpass.frequency.setValueAtTime(bandpassFreq, hitTime);
    bandpass.Q.setValueAtTime(1.5, hitTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7, hitTime);
    const noiseDecay = 0.02 + Math.random() * 0.03;
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, hitTime + noiseDecay);

    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(hitTime);
    noise.stop(hitTime + noiseDecay + 0.01);
    activeNodes.push(noise);

    // 2. Drum Body Layer
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'triangle';
    const startPitch = 190 + Math.random() * 40;
    osc.frequency.setValueAtTime(startPitch, hitTime);
    const endPitch = 110 + Math.random() * 20;
    const pitchDecay = 0.03 + Math.random() * 0.03;
    osc.frequency.exponentialRampToValueAtTime(endPitch, hitTime + pitchDecay);

    oscGain.gain.setValueAtTime(volume * 0.35, hitTime);
    const bodyDecay = 0.04 + Math.random() * 0.04;
    oscGain.gain.exponentialRampToValueAtTime(0.0001, hitTime + bodyDecay);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(hitTime);
    osc.stop(hitTime + bodyDecay + 0.01);
    activeNodes.push(osc);
  }

  private playFinalDrumHit(
    volume: number, 
    activeNodes: (OscillatorNode | AudioBufferSourceNode)[]
  ) {
    if (!this.ctx) return;
    const hitTime = this.ctx.currentTime;

    // Noise splash
    const noise = this.ctx.createBufferSource();
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;

    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(1000, hitTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 1.1, hitTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, hitTime + 0.28);

    noise.connect(hpFilter);
    hpFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    
    noise.start(hitTime);
    noise.stop(hitTime + 0.29);
    activeNodes.push(noise);

    // Boom body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(155, hitTime);
    osc.frequency.exponentialRampToValueAtTime(60, hitTime + 0.15);

    oscGain.gain.setValueAtTime(volume * 0.9, hitTime);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, hitTime + 0.3);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(hitTime);
    osc.stop(hitTime + 0.31);
    activeNodes.push(osc);
  }

  playTwoToneAlarm(options?: {
    duration?: number;
    lowFrequency?: number;
    highFrequency?: number;
    interval?: number;
    volume?: number;
  }): ActiveSoundHandle {
    this.initCtx();
    const handle: ActiveSoundHandle = {
      stop: () => {
        isStopped = true;
        if (osc) {
          try { osc.stop(); } catch (e) {}
        }
        activeTimeouts.forEach(t => clearTimeout(t));
        activeTimeouts.length = 0;
      }
    };

    if (!this.ctx) return handle;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx * (options?.volume ?? 1.0);
    if (volume <= 0) return handle;

    const duration = options?.duration ?? 3.0;
    const lowFreq = options?.lowFrequency ?? 800;
    const highFreq = options?.highFrequency ?? 1150;
    const interval = options?.interval ?? 0.16;

    let isStopped = false;
    const activeTimeouts: any[] = [];

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(lowFreq, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.15, this.ctx.currentTime + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    osc.start(now);

    let isHigh = false;
    const endTime = now + duration;

    const toggleTone = () => {
      if (isStopped || !this.ctx) return;
      const current = this.ctx.currentTime;
      if (current >= endTime) {
        gain.gain.setValueAtTime(gain.gain.value, current);
        gain.gain.exponentialRampToValueAtTime(0.0001, current + 0.1);
        setTimeout(() => {
          try { osc.stop(); } catch (e) {}
        }, 120);
        return;
      }

      const nextFreq = isHigh ? lowFreq : highFreq;
      isHigh = !isHigh;
      
      osc.frequency.setValueAtTime(osc.frequency.value, current);
      osc.frequency.linearRampToValueAtTime(nextFreq, current + 0.02);

      const timeoutId = setTimeout(toggleTone, interval * 1000);
      activeTimeouts.push(timeoutId);
    };

    const firstTimeout = setTimeout(toggleTone, interval * 1000);
    activeTimeouts.push(firstTimeout);

    setTimeout(() => {
      handle.stop();
    }, duration * 1000 + 150);

    return handle;
  }

  playSirenAlarm(options?: {
    duration?: number;
    minFrequency?: number;
    maxFrequency?: number;
    cycleDuration?: number;
    volume?: number;
  }): ActiveSoundHandle {
    this.initCtx();
    const handle: ActiveSoundHandle = {
      stop: () => {
        isStopped = true;
        if (osc) {
          try { osc.stop(); } catch (e) {}
        }
        if (lfo) {
          try { lfo.stop(); } catch (e) {}
        }
      }
    };

    if (!this.ctx) return handle;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx * (options?.volume ?? 1.0);
    if (volume <= 0) return handle;

    const duration = options?.duration ?? 3.0;
    const minFreq = options?.minFrequency ?? 600;
    const maxFreq = options?.maxFrequency ?? 1200;
    const cycleDuration = options?.cycleDuration ?? 0.8;

    let isStopped = false;

    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const centerFreq = (minFreq + maxFreq) / 2;
    osc.frequency.setValueAtTime(centerFreq, this.ctx.currentTime);

    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(1.0 / cycleDuration, this.ctx.currentTime);

    const depth = (maxFreq - minFreq) / 2;
    lfoGain.gain.setValueAtTime(depth, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.12, this.ctx.currentTime + 0.1);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    osc.start(now);
    lfo.start(now);

    const fadeOutTime = now + duration;
    gain.gain.setValueAtTime(volume * 0.12, fadeOutTime - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, fadeOutTime);

    setTimeout(() => {
      if (!isStopped) {
        handle.stop();
      }
    }, duration * 1000);

    return handle;
  }

  playStart() {
    this.initCtx();
    if (!this.ctx) return;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx;
    if (volume <= 0) return;

    // Retro coin start chirp
    const now = this.ctx.currentTime;
    const playTone = (freq: number, start: number, duration: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(volume * 0.15, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    };

    playTone(523.25, 0, 0.08); // C5
    playTone(659.25, 0.08, 0.08); // E5
    playTone(783.99, 0.16, 0.18); // G5
  }

  playGameOver() {
    this.initCtx();
    if (!this.ctx) return;
    const { master, sfx } = this.getVolumes();
    const volume = master * sfx;
    if (volume <= 0) return;

    // Sad descending sequence of tones
    const now = this.ctx.currentTime;
    const playTone = (freq: number, start: number, duration: number) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      osc.frequency.linearRampToValueAtTime(freq * 0.8, now + start + duration);

      gain.gain.setValueAtTime(volume * 0.25, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    };

    playTone(392.00, 0, 0.2);     // G4
    playTone(349.23, 0.22, 0.2);   // F4
    playTone(311.13, 0.44, 0.2);   // Eb4
    playTone(246.94, 0.66, 0.45);  // B3
  }

  startMusic() {
    this.initCtx();
    if (!this.ctx) return;
    this.stopMusic();

    const { master, music } = this.getVolumes();
    let vol = master * music * 0.08; // Keep music soft

    // We program a very soft, minimal procedural arpeggiator to run in the background
    // That sounds ambient and doesn't load a huge file!
    const chords = [
      [196.00, 246.94, 293.66, 392.00], // G major
      [220.00, 261.63, 329.63, 440.00], // A minor
      [174.61, 220.00, 261.63, 349.23], // F major
      [196.00, 246.94, 293.66, 392.00]  // G major
    ];

    let chordIdx = 0;
    let step = 0;

    const playStep = () => {
      const { master: currentMaster, music: currentMusic } = this.getVolumes();
      vol = currentMaster * currentMusic * 0.06;
      if (vol <= 0 || !this.ctx) return;

      const chord = chords[chordIdx];
      // Pick note in chord
      const freq = chord[step % chord.length];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.65);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.7);

      step++;
      if (step % 8 === 0) {
        chordIdx = (chordIdx + 1) % chords.length;
      }
    };

    // Trigger every 800ms
    this.musicInterval = setInterval(playStep, 800);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const audioService = new AudioService();
export default audioService;
