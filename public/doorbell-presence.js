import { cloud } from './cloud.js';

// Reserved private rows. The board excludes them from its list of messages.
export const doorbellPresenceMarker = '[SOFTHOURS-PRESENCE-1]';
const slotIds = {
  J: '80952354-1262-4a91-9b12-259017461355',
  K: 'd3757132-32dc-47b2-877d-b526ed18b0a1',
};
const freshness = 65_000;
const sound = new Audio(new URL('./assets/room-doorbell.wav', import.meta.url));
sound.preload = 'auto';
let member = null;
let currentRequest;
let lastHeartbeat = 0;
let peerOnline = null;
let expiresAt = 0;
let arrivalAt = 0;
let ringUntil = 0;

export function ringDoorbell(){
  ringUntil = performance.now() + 750;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

export function doorbellState(){
  return {together:peerOnline===true&&Date.now()<expiresAt, arrivalAt, ringUntil};
}

function updatePeer(online){
  if(online && peerOnline === false){
    arrivalAt = Date.now();
    ringDoorbell();
  }
  if(!online)arrivalAt = 0;
  peerOnline = online;
}

async function poll(){
  if(!member || document.hidden || currentRequest)return;
  const active = member;
  const request = new AbortController();
  currentRequest = request;
  const signal = request.signal;
  const timeout = setTimeout(() => request.abort(),6500);
  const notes = cloud.from('soft_hours_notes');
  const peerId = slotIds[active.slot==='J'?'K':'J'];
  const now = Date.now();
  try{
    const heartbeat = now-lastHeartbeat >= 18_000
      ? notes.upsert({id:slotIds[active.slot],body:doorbellPresenceMarker,author:active.id,author_slot:active.slot,created:new Date(now).toISOString(),deleted:false},{onConflict:'id'}).abortSignal(signal)
      : null;
    const [write, read] = await Promise.all([
      heartbeat,
      notes.select('created').eq('id',peerId).eq('body',doorbellPresenceMarker).eq('deleted',false).abortSignal(signal).maybeSingle(),
    ]);
    if(member !== active || currentRequest !== request)return;
    if(heartbeat && !write?.error)lastHeartbeat = now;
    if(read.error || write?.error)return;
    const lastSeen = Date.parse(read.data?.created ?? '');
    const age = Date.now()-lastSeen;
    const online = age >= -15_000 && age < freshness;
    expiresAt = online ? lastSeen+freshness : 0;
    updatePeer(online);
  }catch{
    // A failed request does not mean the other person signed out.
  }finally{
    clearTimeout(timeout);
    if(currentRequest === request)currentRequest = null;
  }
}

export function setDoorbellMember(identity){
  const slot = identity?.slot;
  const id = slot==='J'||slot==='K' ? identity.user.id : null;
  if((member?.id ?? null)===id && (!id || member.slot===slot))return;
  currentRequest?.abort();
  currentRequest = null;
  member = id ? {id,slot} : null;
  lastHeartbeat = expiresAt = arrivalAt = 0;
  peerOnline = null;
  poll();
}

setInterval(poll,8000);
document.addEventListener('visibilitychange',poll);
window.addEventListener('pageshow',poll);
