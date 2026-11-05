import {mountThings,unmountThings} from './little-things.js?v=letters-local-1';
import {mountRecords, unmountRecords} from './records.js?v=room-finds-2';
import {roomSound} from './room-sounds.js?v=room-finds-2';
import { mountPhotos, unmountPhotos } from './photos.js?v=room-finds-2';
import { mountBoard, unmountBoard } from './board.js?v=room-finds-2';
import {cloud,getIdentity,showPrivateGate} from './cloud.js';
import {mountDrinkStudio} from './drink-studio.js';
import {mountLedger} from './room-ledger.js?v=room-finds-2';
import {mountRoomCamera} from './room-camera.js?v=room-finds-2';
const roomSection = document.getElementById('roomSection');
const heroCopy = document.getElementById('heroCopy');
const modalShell = document.getElementById('modalShell');
const panelTitle = document.getElementById('panelTitle');
const panelIntro = document.getElementById('panelIntro');
const panelNumber = document.getElementById('panelNumber');
const panelBody = document.getElementById('panelBody');
let currentPanel = null;
let lastTrigger = null;
let localAudioUrl = null;
let photoUrls = [];

// The title stays fixed. Wheel input belongs to the three-dimensional room.

let isNight = false;
try { isNight = localStorage.getItem('soft-hours-night') === 'true'; } catch (_) {}
function applyNight() {
  document.body.classList.toggle('is-night', isNight);
  document.getElementById('timeLabel').textContent = isNight ? 'AFTER DARK' : 'GOLDEN HOUR';
  window.dispatchEvent(new CustomEvent('soft-hours:night', { detail: isNight }));
}
applyNight();
window.addEventListener('soft-hours:lamp', () => {
  roomSound('lamp');
  isNight = !isNight;
  applyNight();
  try { localStorage.setItem('soft-hours-night', String(isNight)); } catch (_) {}
});
document.getElementById('resetView').addEventListener('click', () => {
  window.dispatchEvent(new Event('soft-hours:reset-view'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

const panels = {
  ledger:{number:'J & K',title:'我们的小账本',intro:'各记各的一笔，生活的开销都留在这里。'},
  camera:{number:'SOFT HOURS CAMERA',title:'把小屋拍下来',intro:'把喜欢的角落留成一张照片。'},
  bedPrank:{number:'',title:'烤鱼女士禁止睡觉！',intro:''},
  spilledTea:{number:'',title:'你为什么要这样对我的奶茶！',intro:''},
  letters:{number:'04 / LETTERS TO TOMORROW',title:'未来来信',intro:'把今天想说的话，留给未来某一天的你。'},
  presence:{number:'05 / TWO CUPS OF TEA',title:'你也在这里吗',intro:'两只杯子，给你们各留一个位置。'},
  pillow:{number:'06 / A LITTLE SECRET',title:'抱枕里的小纸条',intro:'轻轻碰三下，就会掉出一句悄悄话。'},
  wardrobe: { number: '01 / THE WARDROBE', title: '照片衣柜', intro: '拉开柜门，那些舍不得删掉的瞬间都在这里。' },
  record: { number: '02 / THE RECORD PLAYER', title: '挑一张，听听那一天', intro: '从唱片架抽出一段声音，放进我们的小小时光。' },
  coffeeMachine: {number:'07 / THE LITTLE CAFÉ',title:'今天喝什么？',intro:'给小屋添一杯热乎乎的饮品。'},
  privateLogin: {number:'J & K',title:'我们的小屋',intro:'公开的房间，私藏的回忆。'},
  board: { number: '03 / THE MEMORY BOARD', title: '回忆公告板', intro: '有些日子值得被钉在墙上，偶尔抬头再看一眼。' }
};
function renderWardrobe() { mountPhotos(panelBody); }
function renderRecord() { mountRecords(panelBody); }
function renderBoard() { mountBoard(panelBody); }
async function renderPrivateLogin(){
  const member=await getIdentity(true);
  if(!member){await showPrivateGate(panelBody,renderPrivateLogin);return;}
  let passwordReady=false;
  try{passwordReady=localStorage.getItem(`soft-hours-password-ready:${member.user.id}`)==='1';}catch{}
  panelBody.innerHTML=`<div class="private-gate"><p class="modal-section-title">WELCOME HOME</p><h3>${member.slot} · 私人模式</h3><p>照片、唱片和公告板现在只对你们两人开放。</p>${passwordReady?'':`<form id="privatePasswordForm"><label>设置密码<input name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="至少 8 位"></label><button type="submit">保存密码</button></form><p class="private-gate-status" role="status"></p>`}<button type="button" id="privateSignout">退出私人模式</button></div>`;
  const form=panelBody.querySelector('#privatePasswordForm');
  if(form)form.onsubmit=async e=>{
    e.preventDefault();
    const password=form.elements.password.value,button=form.querySelector('button'),status=panelBody.querySelector('.private-gate-status');
    button.disabled=true;status.textContent='正在保存…';
    const {error}=await cloud.auth.updateUser({password});
    if(error){status.textContent=`保存失败：${error.message}`;button.disabled=false;return;}
    try{localStorage.setItem(`soft-hours-password-ready:${member.user.id}`,'1');}catch{}
    closePanel();
  };
  panelBody.querySelector('#privateSignout').onclick=async()=>{await cloud.auth.signOut();renderPrivateLogin();};
}
async function updatePrivateLabel(){const member=await getIdentity(true);document.getElementById('privateLogin').textContent=member?`${member.slot} · 私人模式`:'J/K 登录';if(currentPanel==='privateLogin')renderPrivateLogin();}
window.addEventListener('soft-hours:auth-change',updatePrivateLabel);updatePrivateLabel();
function renderCoffeeMachine(){
  const cupIndex=window.softHoursDockedCup;
  if(cupIndex!==0&&cupIndex!==1){panelBody.innerHTML='<p class="quick-drinks__hint">先把空杯拖到出水口，再选饮料。</p>';return;}
  mountDrinkStudio(panelBody,recipe=>window.dispatchEvent(new CustomEvent('soft-hours:brew',{detail:{...recipe,cupIndex}})),cupIndex);
}
function openPanel(name) {
  const data = panels[name]; if (!data) return;
  roomSound(name === 'letters' ? 'page' : 'panelOpen');
  unmountBoard(); unmountPhotos(); unmountRecords(); unmountThings();
  panelBody.classList.remove("is-uploading");
  currentPanel = name;
  modalShell.classList.toggle('is-bed-prank',name==='bedPrank'||name==='spilledTea');
  modalShell.classList.toggle('is-board', name === 'board');
  modalShell.classList.toggle('is-records', name === 'record');
  lastTrigger = document.activeElement;
  panelNumber.textContent = data.number; panelTitle.textContent = data.title; panelIntro.textContent = data.intro;
  if(name==='bedPrank'){panelBody.replaceChildren();const ok=document.createElement('button');ok.type='button';ok.className='bed-prank-ok';ok.textContent='好啦，醒着呢！';ok.addEventListener('click',closePanel);panelBody.append(ok);}
  if(name==='spilledTea'){panelBody.replaceChildren();const ok=document.createElement('button');ok.type='button';ok.className='bed-prank-ok';ok.textContent='我错啦';ok.addEventListener('click',closePanel);panelBody.append(ok);}
  if (name === 'wardrobe') renderWardrobe();
  if (name === 'record') renderRecord();
  if (name === 'board') renderBoard();
  if (name === 'privateLogin') renderPrivateLogin();
  if (name === 'coffeeMachine') renderCoffeeMachine();
  if (name === 'camera') mountRoomCamera(panelBody);
  if (name === 'ledger') {
    const sheet=document.createElement('div');panelBody.replaceChildren(sheet);
    mountLedger(sheet);
  }
  if (['letters','presence','pillow'].includes(name)) mountThings(panelBody,name);
  modalShell.hidden = false; document.body.style.overflow = 'hidden';
  modalShell.querySelector('.memory-panel__scroll').scrollTop = 0;
  document.querySelector('main').inert = true;
  document.querySelector('.record-player-bar').inert = true;
  document.getElementById('closePanel').focus();
}
function closePanel() {
  if (!currentPanel) return;
  if (currentPanel==='camera') window.dispatchEvent(new Event('soft-hours:camera-closed'));
  roomSound('panelClose');
  unmountBoard(); unmountPhotos(); unmountRecords(); unmountThings();
  document.getElementById('audioPlayer')?.pause();
  if (localAudioUrl) { URL.revokeObjectURL(localAudioUrl); localAudioUrl = null; }
  photoUrls.forEach(URL.revokeObjectURL); photoUrls = [];
  modalShell.hidden = true; panelBody.replaceChildren(); document.body.style.overflow = '';
  document.querySelector('main').inert = false;
  document.querySelector('.record-player-bar').inert = false;
  currentPanel = null; if (lastTrigger?.focus) lastTrigger.focus();
}
window.addEventListener('soft-hours:close', closePanel);
window.addEventListener('soft-hours:open', event => openPanel(event.detail));
document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.action === 'lamp') window.dispatchEvent(new Event('soft-hours:lamp'));
  else if(button.dataset.action==='pillow') window.dispatchEvent(new Event('soft-hours:pillow'));
  else if(['wardrobe','record'].includes(button.dataset.action)) window.dispatchEvent(new CustomEvent('soft-hours:approach',{detail:button.dataset.action}));
  else openPanel(button.dataset.action);
}));
document.getElementById('closePanel').addEventListener('click', closePanel);
document.getElementById('privateLogin').addEventListener('click',()=>openPanel('privateLogin'));
modalShell.addEventListener('click', event => { if (event.target.matches('[data-close]')) closePanel(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closePanel();
  if (event.key !== 'Tab' || !currentPanel) return;
  const items = [...modalShell.querySelectorAll('button, input, textarea, a[href], audio[controls], [tabindex="0"]')].filter(el => !el.hidden && !el.disabled && el.getClientRects().length);
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});
