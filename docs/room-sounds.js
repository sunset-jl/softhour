let audio;
let noise;
let lastRustle = -Infinity;
// CC0 Freesound clips via ESC-50: tuberatanka (110011), edhutschek (214362).
const meow = new Audio(new URL('./assets/room-cat-meow.wav?v=softer-1', import.meta.url));
const pour = new Audio(new URL('./assets/room-glass-pour.wav', import.meta.url));
// "Water Sip" by SeanPorio, Freesound 519268 (CC0), trimmed and softened.
const sip = new Audio(new URL('./assets/room-water-sip.wav', import.meta.url));

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
  playClip(sip);
}

export function mistSound() { texture(.38, 1700, .047, .07, 890); }

export function placementSound() {
  roomSound('place');
}

// Each note specifies MIDI pitch, duration, gain, delay, and an optional pitch glide.
const effects = {
  tap: [[74,.095,.028,0,-4]],
  page: [[76,.11,.026,0,3],[81,.16,.019,.06]],
  panelOpen: [[69,.15,.031],[76,.22,.023,.07]],
  panelClose: [[76,.12,.024],[69,.17,.025,.065]],
  zoomIn: [[71,.13,.024,0,5]],
  zoomOut: [[76,.13,.024,0,-5]],
  turn: [[69,.11,.021,0,2]],
  reset: [[76,.12,.024],[73,.14,.025,.065],[69,.19,.024,.13]],
  focus: [[69,.13,.026],[73,.17,.021,.065]],
  drawer: [[64,.14,.04,0,4],[69,.18,.032,.10]],
  door: [[69,.14,.036],[73,.14,.03,.085]],
  box: [[73,.14,.034,0,-2],[81,.18,.024,.075]],
  lamp: [[81,.17,.034],[85,.22,.02,.045]],
  fabric: [[66,.15,.034,0,-4],[69,.12,.024,.095,3]],
  pillow: [[57,.16,.048,0,-5]],
  paws: [[64,.085,.036,0,-3],[67,.085,.027,.075,-3]],
  cup: [[81,.14,.032],[76,.12,.018,.05]],
  place: [[67,.13,.04,0,-4]],
  spill: [[81,.17,.032,0,5],[77,.16,.033,.09,-5],[69,.22,.032,.18,-5]],
  record: [[69,.16,.039],[73,.14,.026,.065],[76,.17,.019,.12]],
  sparkle: [[76,.19,.035],[81,.22,.026,.055],[85,.27,.019,.115]],
  camera: [[81,.085,.036,0,-3],[85,.13,.024,.065]],
};
const lastEffect = new Map();

function pluck(pitch, duration, volume, delay = 0, glide = 0) {
  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const frequency = 440 * 2 ** ((pitch - 69) / 12);
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  if (glide) oscillator.frequency.exponentialRampToValueAtTime(
    frequency * 2 ** (glide / 12), start + duration * .58
  );
  envelope(oscillator, start, duration, volume, .018);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export function roomSound(name) {
  const layers = effects[name];
  if (!layers || audio?.state !== 'running') return;
  const now = audio.currentTime;
  const interval = name === 'zoomIn' || name === 'zoomOut' ? .22 : .10;
  if (now - (lastEffect.get(name) ?? -Infinity) < interval) return;
  lastEffect.set(name, now);
  for (const layer of layers) pluck(...layer);
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
