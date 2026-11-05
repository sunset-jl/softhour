let audio;
let noise;
let lastRustle = -Infinity;
let lastMeow = -Infinity;

function enableSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  audio ??= new AudioContext();
  if (audio.state !== 'running') audio.resume().catch(() => {});
}

window.addEventListener('pointerdown', enableSound, { capture: true, passive: true });
window.addEventListener('pointerup', enableSound, { capture: true, passive: true });
window.addEventListener('keydown', enableSound, { capture: true, passive: true });

function envelope(source, start, duration, volume, attack) {
  const gain = audio.createGain();
  source.connect(gain).connect(audio.destination);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + attack);
  gain.gain.exponentialRampToValueAtTime(volume * 0.35, start + duration * 0.82);
  gain.gain.linearRampToValueAtTime(0, start + duration);
}

function texture(duration, frequency, volume, attack, endFrequency = frequency) {
  if (audio?.state !== 'running') return;
  if (!noise) {
    noise = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const start = audio.currentTime;
  const source = audio.createBufferSource();
  source.buffer = noise;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 0.8;
  filter.frequency.setValueAtTime(frequency, start);
  filter.frequency.linearRampToValueAtTime(endFrequency, start + duration);
  source.connect(filter);
  envelope(filter, start, duration, volume, attack);
  source.start(start, Math.random() * (3 - duration), duration);
}

export function curtainSound() {
  if (audio?.state !== 'running' || audio.currentTime - lastRustle < 0.14) return;
  lastRustle = audio.currentTime;
  texture(0.24, 1100, 0.055, 0.035, 680);
}

export function pourSound() {
  texture(2.1, 600, 0.13, 0.15, 1550);
}

export function meowSound() {
  if (audio?.state !== 'running' || audio.currentTime - lastMeow < 0.65) return;
  const start = audio.currentTime;
  lastMeow = start;
  const voice = audio.createOscillator();
  voice.type = 'triangle';
  voice.frequency.setValueAtTime(520, start);
  voice.frequency.exponentialRampToValueAtTime(790, start + 0.13);
  voice.frequency.exponentialRampToValueAtTime(395, start + 0.42);
  const resonance = audio.createBiquadFilter();
  resonance.type = 'lowpass';
  resonance.frequency.setValueAtTime(2100, start);
  resonance.frequency.exponentialRampToValueAtTime(950, start + 0.42);
  voice.connect(resonance);
  envelope(resonance, start, 0.45, 0.085, 0.045);
  voice.start(start);
  voice.stop(start + 0.45);
}
