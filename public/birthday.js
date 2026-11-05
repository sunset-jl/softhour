import { roomSound } from './room-sounds.js?v=room-sfx-cute-1';
import { getIdentity } from './cloud.js';

const dialog = document.getElementById('birthday');
const envelope = document.getElementById('birthdayEnvelope');
const wish = document.getElementById('birthdayWish');
const greeting = document.getElementById('birthdayGreeting');
const modal = document.getElementById('modalShell');
const replay = new URLSearchParams(location.search).get('birthday') === '1';

let shown = false;
let seenKey;
let checkVersion = 0;

async function checkBirthdayAccess() {
  const version = ++checkVersion;
  if (typeof dialog.showModal !== 'function' || !modal.hidden) return;
  const member = await getIdentity(true).catch(() => null);
  if (version !== checkVersion || !modal.hidden) return;
  if (member?.slot !== 'K') {
    if (dialog.open) dialog.close();
    return;
  }
  if (shown || dialog.open) return;
  const key = `soft-hours-birthday-k-seen-v2:${member.user.id}`;
  try {
    if (!replay && sessionStorage.getItem(key) === 'yes') return;
  } catch {}
  dialog.showModal();
  seenKey = key;
  shown = true;
}

document.getElementById('birthdayOpen').addEventListener('click', () => {
  envelope.hidden = true;
  wish.hidden = false;
  dialog.setAttribute('aria-labelledby', greeting.id);
  greeting.focus({ preventScroll: true });
  roomSound('sparkle');
});

document.getElementById('birthdayEnter').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (seenKey) {
    try { sessionStorage.setItem(seenKey, 'yes'); } catch {}
  }
  document.getElementById('roomCanvas')?.focus({ preventScroll: true });
});

// Wait until the login panel closes before putting another dialog on screen.
new MutationObserver(() => {
  if (modal.hidden && !shown) checkBirthdayAccess();
}).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
window.addEventListener('soft-hours:auth-change', () => {
  ++checkVersion;
  setTimeout(checkBirthdayAccess, 0);
});
checkBirthdayAccess();
