import {showPrivateGate} from './cloud.js';
import {boardApi} from './board-cloud.js?v=memory-box-fix-1';
let host=null, data=null, filter='active', timer=null, busy=false, loading=false, signature='', editor=null, page=0, textPage=0;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=n=>new Date(n).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
const uid=()=>crypto.randomUUID();
function message(text){const el=host?.querySelector('#boardStatus');if(el)el.textContent=text;}
async function api(payload){return boardApi(payload);}
function draftKey(){return `soft-hours-board-${data?.me||''}-${editor?.action||'create'}-${editor?.action==='create'?'new':editor?.id||'new'}`;}
function saveDraft(){try{localStorage.setItem(draftKey(),host.querySelector('#boardText').value);}catch{}}
function draw(){
  if(!host||!data)return;
  host.querySelector('#boardIdentity').textContent=`你是 ${data.me} · ${data.partnerReady?'两个人的留言板':'等另一位来小屋做客'}`;
  const all=data.notes.filter(n=>!n.deleted&&(filter==='archive'?n.archived:!n.archived));
  page=Math.min(page,Math.max(0,all.length-1));
  const list=all.slice(page,page+1);
  host.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
  host.querySelector('#boardList').innerHTML=list.length?list.map(n=>{
    const unread=n.seen_version<n.version;
    const replies=data.replies.filter(r=>r.note===n.id);
    const story=[n.body,...replies.map(r=>`\n\n${r.author_slot} · ${date(r.created)}\n${r.body}`)].join('');
    const segmentSize=window.innerWidth<520?100:180;
    const segments=story.match(new RegExp(`[\\s\\S]{1,${segmentSize}}`,'g'))||[''];
    textPage=Math.min(textPage,segments.length-1);
    return `<article class="shared-note shared-note--${n.author_slot.toLowerCase()}" data-note="${n.id}"><header><strong>${n.author_slot} 的便签 ${n.pinned?'· 置顶':''}</strong><span>${date(n.created)}</span></header>${unread?'<span class="note-new">新留言</span>':''}<p class="note-message">${esc(segments[textPage])}</p>${segments.length>1?`<nav class="note-pages" aria-label="便签内容分页"><button data-op="text-prev" ${textPage===0?'disabled':''} aria-label="上一段">←</button><span>${textPage+1} / ${segments.length}</span><button data-op="text-next" ${textPage===segments.length-1?'disabled':''} aria-label="下一段">→</button></nav>`:''}<small>${n.mine?(n.other_seen>=n.version?'对方看过了':'等对方拆开'):'写给我们的小日常'}</small><footer>${!n.archived?'<button data-op="reply">回复</button>':''}${n.mine?'<button data-op="edit">编辑</button>':''}<button data-op="pin">${n.pinned?'取消置顶':'置顶'}</button><button data-op="archive">${n.archived?'移回公告板':'收进回忆盒'}</button>${n.mine?'<button data-op="delete">删除</button>':''}</footer></article>`;
  }).join(''):`<div class="board-empty"><span aria-hidden="true">✳</span><p>${filter==='archive'?'收藏下来的便签，会住在这里。':'这里还很安静，贴上第一张便签吧。'}</p></div>`;
  const pager=host.querySelector('#boardPager');pager.hidden=all.length<=1||!host.querySelector('#boardForm').hidden;
  pager.querySelector('span').textContent=all.length?`${page+1} / ${all.length}`:'0 / 0';
  pager.querySelector('[data-board-page="prev"]').disabled=page===0;
  pager.querySelector('[data-board-page="next"]').disabled=page>=all.length-1;
  {
    const items=list.filter(n=>n.seen_version<n.version).map(n=>({id:n.id,version:n.version}));
    if(items.length)api({action:'read',items}).catch(()=>{});
  }
}
async function sync(){
  if(!host||loading||document.hidden)return;loading=true;
  try{const next=await api();if(!host)return;const nextSig=JSON.stringify(next);data=next;if(signature!==nextSig){signature=nextSig;draw();}message('已连接 · 留言会自动同步');host.querySelector('#newNote').disabled=false;}
  catch(e){message(e.message);if(e.status===401&&host)mountBoard(host);}
  finally{loading=false;}
}
function openEditor(action,note){
  if(busy)return;
  editor={action,id:note?.id||uid(),version:note?.version,replyId:action==='reply'?uid():undefined};
  const form=host.querySelector('#boardForm');form.hidden=false;
  host.querySelector('#boardFormTitle').textContent=action==='reply'?`回复 ${note.author_slot}`:action==='edit'?'修改这张便签':'今天想告诉你';
  const input=host.querySelector('#boardText');input.maxLength=action==='reply'?500:2000;input.value=action==='edit'?note.body:'';
  // New-note drafts have a stable key; edit/reply drafts belong to their note.
  try{const draft=localStorage.getItem(draftKey());if(draft)input.value=draft;}catch{}
  host.querySelector('#boardList').hidden=true;host.querySelector('#boardPager').hidden=true;
  input.focus();
}
export async function mountBoard(element){
  unmountBoard();host=element;signature='';filter='active';page=0;textPage=0;
  host.innerHTML='<p class="small-note">正在确认公告板的访问权限…</p>';
  if(!await showPrivateGate(host,()=>mountBoard(element)))return;
  document.querySelector('[data-action="board"]')?.classList.remove('has-unread');
  host.innerHTML=`<div class="board-toolbar"><p id="boardIdentity">正在打开你们的公告板…</p><button id="newNote" disabled>＋ 贴张便签</button></div><p id="boardStatus" role="status">连接中…</p><div class="board-tabs" aria-label="便签分类"><button data-filter="active" aria-pressed="true">公告板</button><button data-filter="archive" aria-pressed="false">回忆盒</button><button id="boardRetry" aria-label="刷新公告板">↻</button></div><form id="boardForm" class="board-compose" hidden><label id="boardFormTitle" for="boardText">今天想告诉你</label><textarea id="boardText" required maxlength="2000" rows="4" placeholder="留一句话给对方…"></textarea><p id="boardFormStatus" role="status"></p><div><button type="submit" id="saveNote">贴上去</button><button type="button" id="cancelNote">暂时收起</button></div><small>未发送的草稿会留在这台设备上。</small></form><div id="boardList"></div><nav id="boardPager" class="board-pager" aria-label="公告分页" hidden><button data-board-page="prev" aria-label="上一张公告">←</button><span></span><button data-board-page="next" aria-label="下一张公告">→</button></nav>`;
  host.querySelector('#newNote').onclick=()=>openEditor('create');
  host.querySelector('#boardRetry').onclick=()=>sync();
  host.querySelector('#cancelNote').onclick=()=>{saveDraft();host.querySelector('#boardForm').hidden=true;host.querySelector('#boardList').hidden=false;editor=null;draw();};
  host.querySelector('#boardText').oninput=saveDraft;
  host.querySelector('#boardForm').onsubmit=async e=>{
    e.preventDefault();if(busy||!editor)return;busy=true;
    const view=host,submitted=editor;
    const save=host.querySelector('#saveNote'),status=host.querySelector('#boardFormStatus');save.disabled=true;status.textContent='正在保存…';saveDraft();
    const body=host.querySelector('#boardText').value.trim();const key=draftKey();
    try{await api({...submitted,body});try{localStorage.removeItem(key);}catch{}if(host===view&&editor===submitted){host.querySelector('#boardText').value='';host.querySelector('#boardForm').hidden=true;host.querySelector('#boardList').hidden=false;status.textContent='';editor=null;}await sync();}
    catch(err){status.textContent=err.message;if(err.status===409){await sync();const current=data?.notes.find(n=>n.id===submitted.id);if(current&&editor===submitted)editor.version=current.version;}}
    finally{busy=false;save.disabled=false;}
  };
  host.onclick=async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.filter){filter=b.dataset.filter;page=0;textPage=0;draw();return;}
    if(b.dataset.boardPage){page+=b.dataset.boardPage==='next'?1:-1;textPage=0;draw();return;}
    const op=b.dataset.op;if(!op||busy)return;
    if(op==='text-prev'||op==='text-next'){textPage+=op==='text-next'?1:-1;draw();return;}
    const n=data.notes.find(n=>n.id===b.closest('[data-note]').dataset.note);if(!n)return;
    if(op==='reply'||op==='edit'){openEditor(op,n);return;}
    busy=true;b.disabled=true;
    try{await api({action:op,id:n.id,version:n.version});if(op==='delete'){data.notes=data.notes.filter(note=>note.id!==n.id);data.replies=data.replies.filter(reply=>reply.note!==n.id);draw();}await sync();}
    catch(err){message(err.message);if(err.status===409)await sync();}
    finally{busy=false;b.disabled=false;}
  };
  sync();timer=setInterval(sync,4000);
}
export function unmountBoard(){if(host&&editor&&!busy)saveDraft();clearInterval(timer);host=null;editor=null;}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
window.addEventListener('online',sync);
async function checkUnread(){
  if(host||document.hidden)return;
  try{const snapshot=await api();const count=snapshot.notes.filter(n=>!n.deleted&&!n.archived&&n.seen_version<n.version).length;const button=document.querySelector('[data-action="board"]');if(button){button.classList.toggle('has-unread',count>0);button.setAttribute('aria-label',count?`公告板 · ${count} 张便签有更新`:'公告板');}}catch{}
}
setInterval(checkUnread,15000);checkUnread();
window.addEventListener('soft-hours:auth-change',()=>{if(host)mountBoard(host);});
