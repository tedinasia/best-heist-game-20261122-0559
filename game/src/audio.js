// Suara disintesis WebAudio — tanpa file eksternal, tanpa network.
// Semua bunyi dibuat dari osilator dan noise buffer saat pertama dipakai.
export function createAudio() {
  let context = null;
  let muted = false;
  let ambientNodes = null;

  function ensure() {
    if (context) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    return context;
  }

  function tone(freq, seconds, type, gainValue, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + seconds);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  function noiseBurst(seconds, gainValue, lowpass) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = gainValue;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  function startAmbient() {
    const ctx = ensure();
    if (!ctx || ambientNodes) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 12;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    lfo.start();
    ambientNodes = { osc, lfo, gain };
  }

  return {
    unlock() {
      ensure();
      startAmbient();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get isMuted() {
      return muted;
    },
    click() {
      tone(660, 0.07, 'triangle', 0.12);
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.16, 1320);
    },
    bigPearl() {
      tone(523, 0.35, 'sine', 0.2, 1046);
      setTimeout(() => tone(784, 0.4, 'sine', 0.18, 1174), 120);
    },
    inkBurst() {
      noiseBurst(0.5, 0.25, 900);
      tone(220, 0.3, 'sine', 0.1, 90);
    },
    spotted() {
      tone(440, 0.16, 'square', 0.08, 620);
    },
    alarmTick() {
      tone(980, 0.1, 'square', 0.06);
    },
    caught() {
      tone(320, 0.7, 'sawtooth', 0.16, 70);
    },
    win() {
      const notes = [523, 659, 784, 1046];
      notes.forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.35, 'triangle', 0.16), i * 130);
      });
    },
  };
}
