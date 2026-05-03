export const playSound = (type: "correct" | "wrong" | "validated" | "mission_complete") => {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContextCtor();

  const sounds = {
    correct: {
      freq: [523, 659, 784],
      duration: 0.15,
      type: "sine" as OscillatorType,
    },
    wrong: {
      freq: [200, 150],
      duration: 0.3,
      type: "sawtooth" as OscillatorType,
    },
    validated: {
      freq: [523, 659, 784, 1047],
      duration: 0.12,
      type: "sine" as OscillatorType,
    },
    mission_complete: {
      freq: [523, 659, 784, 1047, 1319],
      duration: 0.15,
      type: "sine" as OscillatorType,
    },
  };

  const sound = sounds[type];
  sound.freq.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = sound.type;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sound.duration);
    osc.start(ctx.currentTime + i * sound.duration);
    osc.stop(ctx.currentTime + (i + 1) * sound.duration);
  });
};
