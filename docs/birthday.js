import { roomSound } from './room-sounds.js?v=room-finds-2';
import { getIdentity } from './cloud.js';

const dialog = document.getElementById('birthday');
const envelope = document.getElementById('birthdayEnvelope');
const wish = document.getElementById('birthdayWish');
const greeting = document.getElementById('birthdayGreeting');
const modal = document.getElementById('modalShell');
const danmaku = document.getElementById('birthdayDanmaku');
const celebrationDay = '2026-11-06';
const beijingDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
});

let shown = false;
let checkVersion = 0;

function isCelebrationDay(now = new Date()) {
  const parts = Object.fromEntries(beijingDate.formatToParts(now).map(({type,value}) => [type,value]));
  return [parts.year, parts.month, parts.day].join('-') === celebrationDay;
}

function launchDanmaku() {
  const messages = ['✦ 生日快乐！', '今天的小屋为你亮灯 ✧', '🎂 生日快乐呀！', '✿ 愿你每天都有小惊喜'];
  danmaku.replaceChildren(...messages.map((message,index) => {
    const line = document.createElement('span');
    line.textContent = message;
    line.style.setProperty('--lane', ['12%', '24%', '74%', '86%'][index]);
    line.style.setProperty('--delay', `${index * .45}s`);
    return line;
  }));
}

async function checkBirthdayAccess() {
  const version = ++checkVersion;
  if (typeof dialog.showModal !== 'function') return;
  if (!isCelebrationDay()) {
    if (dialog.open) dialog.close();
    return;
  }
  if (!modal.hidden) return;
  const member = await getIdentity(true).catch(() => null);
  if (version !== checkVersion || !modal.hidden || !isCelebrationDay()) return;
  if (!['J','K'].includes(member?.slot)) {
    if (dialog.open) dialog.close();
    return;
  }
  if (shown || dialog.open) return;
  envelope.hidden = false;
  wish.hidden = true;
  dialog.setAttribute('aria-labelledby', 'birthdayTitle');
  launchDanmaku();
  dialog.showModal();
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
  danmaku.replaceChildren();
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
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    shown = dialog.open;
    checkBirthdayAccess();
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkBirthdayAccess();
});
checkBirthdayAccess();
