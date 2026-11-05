const button = document.getElementById('roomMusic');
const ambience = new Audio(new URL('./assets/soft-hours-quiet.mp3?v=long-1', import.meta.url));
ambience.preload = 'none';
ambience.loop = true;

let enabled = false;
let recordActive = false;
let playbackRequest = 0;

function updateMusic() {
  const request = ++playbackRequest;
  button.setAttribute('aria-pressed', String(enabled));
  button.textContent = enabled ? '音乐开' : '音乐关';
  if (!enabled || recordActive) {
    ambience.pause();
    return;
  }
  ambience.play().catch(() => {
    if (request !== playbackRequest) return;
    enabled = false;
    updateMusic();
  });
}

button.addEventListener('click', () => {
  enabled = !enabled;
  updateMusic();
});

window.addEventListener('soft-hours:record-activity', ({ detail }) => {
  if (recordActive === detail) return;
  recordActive = detail;
  updateMusic();
});
