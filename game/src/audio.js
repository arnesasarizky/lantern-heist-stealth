// Lantern Heist — sound.
// One job: every sound the game makes, synthesized with WebAudio.
// No audio files, no network: oscillators and filtered noise only.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, filterFreq, pan = 0) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.value = vol;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(filt).connect(g).connect(panner).connect(master);
    src.start(t0);
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    // Soft shoe tap; pan -1..1 by guard position, vol by distance.
    footstep(pan, vol, sneaking) {
      noiseBurst(0.07, vol * (sneaking ? 0.4 : 1), sneaking ? 500 : 900, pan);
    },
    // Guard footstep: heavier, lower, panned by where the guard is.
    guardStep(pan, vol) {
      noiseBurst(0.09, vol, 420, pan);
    },
    pickup() {
      tone(660, 0.12, 'sine', 0.25);
      tone(990, 0.18, 'sine', 0.22, 0.07);
    },
    // Short warning sting when a guard's suspicion spikes.
    nearMiss() {
      tone(220, 0.16, 'triangle', 0.3, 0, 330);
      tone(330, 0.2, 'triangle', 0.22, 0.1, 440);
    },
    // Full alarm when a guard spots the thief.
    alarm() {
      tone(392, 0.14, 'square', 0.16);
      tone(523, 0.14, 'square', 0.16, 0.13);
      tone(392, 0.22, 'square', 0.18, 0.26);
    },
    levelClear() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.22, i * 0.09));
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'sine', 0.22, i * 0.11));
    },
    caught() {
      tone(220, 0.5, 'sawtooth', 0.2, 0, 55);
      tone(110, 0.6, 'sawtooth', 0.16, 0.15, 40);
    },
    click() {
      tone(880, 0.05, 'sine', 0.15);
    },
  };
}
