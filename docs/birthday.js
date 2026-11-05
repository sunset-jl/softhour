import { roomSound } from './room-sounds.js?v=room-sfx-cute-1';

const dialog = document.getElementById('birthday');
const envelope = document.getElementById('birthdayEnvelope');
const wish = document.getElementById('birthdayWish');
const greeting = document.getElementById('birthdayGreeting');
const sessionKey = 'soft-hours-birthday-seen-v1';
const replay = new URLSearchParams(location.search).get('birthday') === '1';

let seen = false;
try { seen = sessionStorage.getItem(sessionKey) === 'yes'; } catch {}

if ((!seen || replay) && typeof dialog.showModal === 'function') {
  dialog.showModal();

  document.getElementById('birthdayOpen').addEventListener('click', () => {
    envelope.hidden = true;
    wish.hidden = false;
    dialog.setAttribute('aria-labelledby', greeting.id);
    greeting.focus({ preventScroll: true });
    roomSound('sparkle');
  });

  document.getElementById('birthdayEnter').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    try { sessionStorage.setItem(sessionKey, 'yes'); } catch {}
    document.getElementById('roomCanvas')?.focus({ preventScroll: true });
  });
}
