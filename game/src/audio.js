// Procedural WebAudio sound effects — no audio assets, everything is
// synthesised. The context is created lazily on the first user gesture so
// headless / autoplay-restricted loads never throw.
export function createAudioEngine() {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.42;
      master.connect(ctx.destination);
      const length = ctx.sampleRate;
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function tone({ type = 'square', from = 440, to = null, seconds = 0.1, gain = 0.2, delay = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + seconds);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  }

  function noise({ seconds = 0.2, gain = 0.25, filterFreq = 1200, type = 'lowpass', delay = 0 }) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + seconds + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.42;
    },
    isMuted() {
      return muted;
    },
    shootRifle() {
      tone({ type: 'square', from: 880, to: 220, seconds: 0.09, gain: 0.16 });
      noise({ seconds: 0.07, gain: 0.12, filterFreq: 3200, type: 'highpass' });
    },
    shootShotgun() {
      noise({ seconds: 0.28, gain: 0.34, filterFreq: 900 });
      tone({ type: 'sawtooth', from: 160, to: 55, seconds: 0.22, gain: 0.22 });
    },
    emptyClick() {
      tone({ type: 'square', from: 1400, to: 900, seconds: 0.04, gain: 0.08 });
    },
    reloadStart() {
      tone({ type: 'square', from: 500, to: 320, seconds: 0.05, gain: 0.1 });
      tone({ type: 'square', from: 700, to: 420, seconds: 0.05, gain: 0.1, delay: 0.12 });
    },
    reloadDone() {
      tone({ type: 'square', from: 320, to: 900, seconds: 0.06, gain: 0.12 });
    },
    hit() {
      tone({ type: 'triangle', from: 1500, to: 1100, seconds: 0.05, gain: 0.14 });
    },
    kill() {
      tone({ type: 'sawtooth', from: 320, to: 90, seconds: 0.28, gain: 0.22 });
      noise({ seconds: 0.22, gain: 0.2, filterFreq: 700 });
    },
    hurt() {
      tone({ type: 'sawtooth', from: 140, to: 60, seconds: 0.25, gain: 0.3 });
      noise({ seconds: 0.18, gain: 0.18, filterFreq: 400 });
    },
    waveHorn() {
      tone({ type: 'sawtooth', from: 196, to: 392, seconds: 0.55, gain: 0.16 });
      tone({ type: 'sawtooth', from: 294, to: 588, seconds: 0.55, gain: 0.12, delay: 0.08 });
    },
    waveClear() {
      tone({ type: 'triangle', from: 523, to: 523, seconds: 0.12, gain: 0.16 });
      tone({ type: 'triangle', from: 659, to: 659, seconds: 0.12, gain: 0.16, delay: 0.1 });
      tone({ type: 'triangle', from: 784, to: 784, seconds: 0.22, gain: 0.18, delay: 0.2 });
    },
    gameOver() {
      tone({ type: 'sawtooth', from: 220, to: 55, seconds: 1.1, gain: 0.2 });
      tone({ type: 'sawtooth', from: 233, to: 58, seconds: 1.1, gain: 0.14, delay: 0.1 });
    },
    click() {
      tone({ type: 'square', from: 900, to: 700, seconds: 0.04, gain: 0.08 });
    },
  };
}
