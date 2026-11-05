let audio;
let noise;
let lastRustle = -Infinity;
// CC0 Freesound clips via ESC-50: tuberatanka (110011), edhutschek (214362).
const meow = new Audio(new URL('./assets/room-cat-meow.wav', import.meta.url));
const pour = new Audio(new URL('./assets/room-glass-pour.wav', import.meta.url));

function playClip(clip) {
  if (!clip.paused && !clip.ended) return;
  clip.currentTime = 0;
  clip.play().catch(() => {});
}

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
  playClip(pour);
}

export function meowSound() {
  playClip(meow);
}

export function sipSound() {
  texture(0.24, 850, 0.075, 0.055, 1300);
  setTimeout(() => texture(0.2, 460, 0.06, 0.035, 240), 170);
}

export function placementSound() {
  texture(0.13, 430, 0.09, 0.012, 215);
}
