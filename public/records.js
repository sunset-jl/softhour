import {cloud,getIdentity,showPrivateGate,signedFile,uploadPrivate} from './cloud.js';
const audio=new Audio();audio.preload='metadata';audio.volume=.7;
let records=[],current=null,host=null,page=0,loading=false,flight=null,selecting=false;
// These recordings are bundled from the videos placed in the room's media folder.
// They are shown through the same private record-library view as uploaded records.
const roomRecords=[
 {id:'room-record-01',title:'午后的低语',day:'存入小屋',memory:'一段被好好留下的声音。',audio_url:'./assets/records/018efb7785e3e022e3ad461e083320a3.mp3'},
 {id:'room-record-02',title:'一起听的六分钟',day:'存入小屋',memory:'这一段时间，留给你们慢慢听。',audio_url:'./assets/records/2f4629be736229d1c2a77ffba6a5f0c8.mp3'},
 {id:'room-record-03',title:'短短的晴天',day:'存入小屋',memory:'四十三秒，也足够装下一点开心。',audio_url:'./assets/records/865b4bdf78419136cf0305da6ee17c58.mp3'},
 {id:'room-record-04',title:'夜晚的回声',day:'存入小屋',memory:'把那天的声音，安静地放在这里。',audio_url:'./assets/records/e0ba272daf49a3575be97f2e72380bd9.mp3'}
];
const compact=matchMedia('(max-width:640px)');
const pageSize=()=>compact.matches?2:4;
compact.addEventListener('change',()=>{page=0;if(host)draw();});
const escape=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url=(r,asset='audio')=>asset==='cover'?r.cover_url:r.audio_url;
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
const bar=document.createElement('div');bar.className='record-player-bar';bar.hidden=true;bar.setAttribute('aria-label','唱片播放控制');
bar.innerHTML='<button class="record-return" aria-label="打开唱片架">♫</button><div class="record-now"><strong></strong><span role="status"></span></div><button class="record-prev" aria-label="上一张唱片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg></button><button class="record-toggle" aria-label="播放"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="play-mark" d="M8 5.5 18 12 8 18.5Z"/><path class="pause-mark" d="M8.5 6.5v11M15.5 6.5v11"/></svg></button><button class="record-next" aria-label="下一张唱片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7"/></svg></button><label class="record-volume">音量<input type="range" min="0" max="1" step="0.05" value="0.7" aria-label="音量"></label>';
document.body.append(bar);
function status(message){bar.querySelector('[role=status]').textContent=message;}
function sync(){const playing=!audio.paused&&!audio.ended;const toggle=bar.querySelector('.record-toggle');toggle.classList.toggle('is-playing',playing);toggle.setAttribute('aria-label',playing?'暂停':'播放');emit('soft-hours:record-playback',{playing});}
audio.addEventListener('playing',()=>{sync();status('正在播放 · '+(current?.day||'我们的声音'));});
audio.addEventListener('pause',()=>{sync();if(current)status('已暂停 · '+current.title);});audio.addEventListener('ended',()=>{sync();status('这一段回忆播放完了');});
audio.addEventListener('waiting',()=>{emit('soft-hours:record-playback',{playing:false});status('正在缓冲…');});
audio.addEventListener('error',()=>{sync();emit('soft-hours:record-playback',{playing:false});status('音频未能播放，请重试或换一种格式');});
bar.querySelector('.record-return').onclick=()=>emit('soft-hours:open','record');
bar.querySelector('.record-toggle').onclick=()=>{const toggle=bar.querySelector('.record-toggle');if(audio.paused){if(audio.error){audio.load();}toggle.classList.add('is-playing');toggle.setAttribute('aria-label','暂停');audio.play().catch(()=>{sync();status('请再次点播放，或检查音频格式');});}else{toggle.classList.remove('is-playing');toggle.setAttribute('aria-label','播放');audio.pause();}};
bar.querySelector('input').oninput=e=>audio.volume=Number(e.target.value);
bar.querySelector('.record-prev').onclick=()=>step(-1);bar.querySelector('.record-next').onclick=()=>step(1);
function step(n){if(records.length)select(records[(records.findIndex(r=>r.id===current?.id)+n+records.length)%records.length]);}
async function select(r,button){
 if(loading||selecting)return;selecting=true;current=r;audio.pause();audio.src=url(r);bar.hidden=false;bar.querySelector('strong').textContent=r.title;status('正在放入唱片…');
 // Start from the user's click so playback remains permitted on mobile browsers.
 audio.play().catch(()=>status('已放入唱片 · 点击 ▷ 开始播放'));
 const rect=button?.getBoundingClientRect();
 if(button&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  const siblings=[...host.querySelectorAll('.record-sleeve')].filter(x=>x!==button);
  siblings.forEach(x=>x.animate([{opacity:1},{opacity:0,transform:'translate(-50%,80px) scale(.65)'}],{duration:240,fill:'forwards',easing:'ease-in'}));
  await new Promise(resolve=>setTimeout(resolve,240));
 }
 selecting=false;emit('soft-hours:close');flight?.cancel();document.querySelector('.record-flight')?.remove();
 const anchor={x:innerWidth*.56,y:innerHeight*.48};emit('soft-hours:record-anchor',anchor);
 if(rect&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const disc=document.createElement('div');disc.className='record-flight';disc.innerHTML='<i></i>';disc.style.left=`${rect.left+rect.width/2-70}px`;disc.style.top=`${rect.top+rect.height/2-70}px`;document.body.append(disc);
 flight=disc.animate([{transform:'translate(0,-20px) scale(1) rotate(0deg)',opacity:1},{transform:`translate(${anchor.x-rect.left-rect.width/2}px,${anchor.y-rect.top-rect.height/2}px) scale(.24) rotate(240deg)`,opacity:0}],{duration:850,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});flight.finished.then(()=>disc.remove()).catch(()=>disc.remove());}
}
export function unmountRecords(){host=null;bar.inert=false;}
export async function mountRecords(container){host=container;page=0;bar.inert=true;drawLoading();if(!await showPrivateGate(container,()=>mountRecords(container)))return;refresh();}
function drawLoading(){if(host)host.innerHTML='<p class="record-message" role="status">正在打开唱片架…</p>';}
async function refresh(){const target=host;try{const {data,error}=await cloud.from('soft_hours_records').select('*').order('created',{ascending:false});if(error)throw error;const cloudRecords=await Promise.all(data.map(async r=>({...r,audio_url:await signedFile(r.audio_path),cover_url:r.cover_path?await signedFile(r.cover_path):null})));records=[...roomRecords,...cloudRecords];if(host===target&&host)draw();}catch(e){records=[...roomRecords];if(host===target&&host)draw();}}
function draw(){if(!host)return;host.classList.remove('is-uploading');const count=pageSize(),visible=records.slice(page*count,page*count+count);
 host.innerHTML=`<div class="record-fan" aria-label="选择一张唱片">${visible.map((r,i)=>`<button class="record-sleeve ${r.id===current?.id?'is-current':''}" style="--i:${i};--n:${visible.length};--hue:${[268,36,190,334,90,25,230][i]}" data-record="${escape(r.id)}" aria-label="播放 ${escape(r.title)}"><span class="sleeve-art">${r.cover_mime?`<img src="${url(r,'cover')}" alt="${escape(r.title)}的封面"/>`:'<span class="sleeve-flower">✿</span>'}<span class="sleeve-stamp">J & K / ${String(page*count+i+1).padStart(2,'0')}</span></span><strong>${escape(r.title)}</strong><small>${escape(r.day||'SOUNDS WE KEPT')}</small></button>`).join('')}</div>
 <p class="record-caption" aria-live="polite">${records.length?'移到唱片上看看，点击把它放上唱片机。':'唱片架还是空的，放入第一段属于你们的声音吧。'}</p>
 <div class="record-library-actions"><button class="record-page-prev" ${page===0?'disabled':''} aria-label="上一页唱片">←</button><span>${records.length?`${page+1} / ${Math.ceil(records.length/count)}`:'0 张唱片'}</span><button class="record-page-next" ${(page+1)*count>=records.length?'disabled':''} aria-label="下一页唱片">→</button><button class="record-add">＋ 收进一张唱片</button></div><div class="record-form-slot"></div>`;
 host.querySelectorAll('[data-record]').forEach(b=>{const r=records.find(x=>x.id===b.dataset.record);b.onclick=()=>select(r,b);const describe=()=>{host?.querySelector('.record-caption')?.replaceChildren(document.createTextNode(r.memory||r.title));};b.onmouseenter=describe;b.onfocus=describe;});
 host.querySelector('.record-page-prev').onclick=()=>{page--;draw();};host.querySelector('.record-page-next').onclick=()=>{page++;draw();};host.querySelector('.record-add').onclick=showForm;
}
function showForm(){const slot=host.querySelector('.record-form-slot');host.classList.add('is-uploading');slot.innerHTML=`<form class="record-upload"><label>唱片名字<input name="title" maxlength="80" required placeholder="例如：那天一起唱的歌"></label><label>那一天<input name="day" type="date"></label><label class="record-wide">留一句回忆<textarea name="memory" maxlength="500" placeholder="听到这段声音，你会想起什么？"></textarea></label><label>声音 · 最大 20 MB<input name="audio" type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm,.m4a" required></label><label>封面 · 可选，最大 2 MB<input name="cover" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="record-wide record-save-status" role="status">保存后，重新打开小屋也能听见。</p><button type="submit">保存到唱片架</button><button type="button" class="record-cancel">返回唱片架</button></form>`;
 const form=slot.querySelector('form');form.elements.title.focus();form.querySelector('.record-cancel').onclick=draw;let pendingId=crypto.randomUUID();
 form.oninput=()=>{pendingId=crypto.randomUUID();};
 form.onsubmit=async e=>{e.preventDefault();if(loading)return;const data=new FormData(form),file=data.get('audio'),cover=data.get('cover'),note=form.querySelector('.record-save-status');if(file.size>20*1024*1024||cover.size>2*1024*1024){note.textContent='音频最大 20 MB，封面最大 2 MB。';return;}loading=true;[...form.elements].forEach(x=>x.disabled=true);
 try{const member=await getIdentity();if(!member)throw Error('请先登录。');const audioPath=`records/${pendingId}/audio`,coverPath=cover.size?`records/${pendingId}/cover`:null;note.textContent='正在上传声音…';await uploadPrivate(audioPath,file);if(coverPath){note.textContent='正在上传封面…';await uploadPrivate(coverPath,cover);}const {error}=await cloud.from('soft_hours_records').insert({id:pendingId,title:data.get('title'),day:data.get('day'),memory:data.get('memory'),audio_path:audioPath,cover_path:coverPath,cover_mime:cover.size?cover.type:null,author:member.user.id});if(error)throw error;if(host){await refresh();const p=host?.querySelector('.record-caption');if(p)p.textContent='已保存到云端 · 点击新唱片开始播放';host?.querySelector('[data-record]')?.focus();}}
 catch(err){note.textContent=err.message;[...form.elements].forEach(x=>x.disabled=false);}finally{loading=false;}};
}
window.addEventListener('soft-hours:auth-change',()=>{if(host)mountRecords(host);});
