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

function texture(duration, frequency, volume, attack, endFrequency = frequency, delay = 0) {
  if (audio?.state !== 'running') return;
  if (!noise) {
    noise = audio.createBuffer(1, audio.sampleRate * 3, audio.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  }
  const start = audio.currentTime + delay;
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

// Each layer is duration, start frequency, gain, attack, end frequency and delay.
const effects = {
  tap: [[.075, 950, .028, .009, 580]],
  page: [[.21, 1700, .052, .045, 820]],
  panelOpen: [[.20, 810, .041, .045, 1250]],
  panelClose: [[.17, 950, .038, .03, 460]],
  zoomIn: [[.15, 430, .035, .032, 760]],
  zoomOut: [[.15, 740, .034, .032, 380]],
  turn: [[.19, 640, .034, .06, 520]],
  reset: [[.25, 550, .05, .05, 340]],
  focus: [[.22, 490, .04, .045, 870]],
  drawer: [[.25, 490, .095, .045, 680], [.1, 310, .065, .012, 200, .19]],
  door: [[.25, 670, .07, .033, 415], [.1, 350, .065, .014, 250, .18]],
  box: [[.18, 1250, .055, .03, 730], [.08, 470, .055, .01, 330, .13]],
  lamp: [[.08, 2100, .085, .009, 650]],
  fabric: [[.23, 980, .063, .055, 520]],
  pillow: [[.14, 285, .079, .02, 165]],
  paws: [[.075, 380, .051, .01, 230], [.07, 420, .037, .01, 275, .085]],
  cup: [[.12, 1800, .072, .009, 1100], [.09, 820, .047, .014, 500, .055]],
  spill: [[.58, 1470, .14, .038, 490], [.2, 680, .067, .02, 390, .27]],
  record: [[.18, 1040, .075, .022, 540], [.10, 360, .064, .012, 250, .13]],
  sparkle: [[.25, 1850, .062, .028, 1270], [.15, 2200, .04, .021, 1600, .105]],
  camera: [[.065, 1860, .07, .008, 860], [.055, 1300, .055, .008, 600, .065]],
};
const lastEffect = new Map();

export function roomSound(name) {
  const layers = effects[name];
  if (!layers || audio?.state !== 'running') return;
  const now = audio.currentTime;
  const interval = name === 'zoomIn' || name === 'zoomOut' ? .22 : .10;
  if (now - (lastEffect.get(name) ?? -Infinity) < interval) return;
  lastEffect.set(name, now);
  for (const layer of layers) texture(...layer);
}

document.addEventListener('click', event => {
  const control = event.target.closest?.('button, .upload-label, a[download]');
  if (!control || control.disabled) return;
  if (control.matches('#resetView, #zoomIn, #zoomOut, #closePanel, #privateLogin, [data-action], .tea-cup-drink, .record-sleeve, .record-prev, .record-next, .record-return')) return;
  if (control.matches('#globeButton, .globe-shake')) roomSound('sparkle');
  else if (control.matches('.globe-close')) roomSound('panelClose');
  else if (control.matches('.globe-save')) roomSound('camera');
  else if (control.matches('.photo-slot, #photoBack, [data-photo-page], [data-board-page], .letter-card, .record-page-prev, .record-page-next')) roomSound('page');
  else roomSound('tap');
}, true);

document.addEventListener('change', event => {
  if (event.target.matches?.('input[type="file"], input[type="range"], input[type="checkbox"], select')) roomSound('tap');
});
