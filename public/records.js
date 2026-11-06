import {cloud,getIdentity,showPrivateGate,signedFile,uploadPrivate} from './cloud.js';
import {roomSound} from './room-sounds.js?v=room-finds-2';
const audio=new Audio();audio.preload='metadata';audio.volume=.7;
let records=[],current=null,host=null,page=0,loading=false,flight=null,selecting=false;
// These recordings are bundled from the videos placed in the room's media folder.
// They are shown through the same private record-library view as uploaded records.
const roomRecords=[
 {id:'room-record-01',title:'午后的低语',day:'存入小屋',memory:'一段被好好留下的声音。',audio_url:'./assets/records/018efb7785e3e022e3ad461e083320a3.mp3'},
 {id:'room-record-02',title:'一起听的六分钟',day:'存入小屋',memory:'这一段时间，留给你们慢慢听。',audio_url:'./assets/records/2f4629be736229d1c2a77ffba6a5f0c8.mp3'},
 {id:'room-record-03',title:'短短的晴天',day:'存入小屋',memory:'四十三秒，也足够装下一点开心。',audio_url:'./assets/records/865b4bdf78419136cf0305da6ee17c58.mp3'},
 {id:'room-record-04',title:'夜晚的回声',day:'存入小屋',memory:'把那天的声音，安静地放在这里。',audio_url:'./assets/records/e0ba272daf49a3575be97f2e72380bd9.mp3'},
 {id:'room-record-05',title:'好想爱这个世界啊',day:'存入小屋',memory:'把想说的话，唱给这个世界听。',audio_url:'./assets/records/love-this-world.mp3'},
 {id:'room-record-06',title:'好想我回来啊',day:'存入小屋',memory:'留一段声音，等回来的那一天。',audio_url:'./assets/records/hope-i-return.mp3'},
 {id:'room-record-07',title:'十万毫升泪水',day:'存入小屋',memory:'很重的心事，也可以在这里慢慢放下。',audio_url:'./assets/records/hundred-thousand-tears.mp3'}
];
const compact=matchMedia('(max-width:640px)');
const preloadedCovers=new Set();
const defaultCovers=[
 './assets/records/cover-sunset.jpg',
 './assets/records/cover-daisies.webp',
 './assets/records/covers/moon-window.jpg',
 './assets/records/covers/pastel-clouds.jpg',
 './assets/records/cover-blue-sea.jpg',
];
compact.addEventListener('change',()=>{if(host?.querySelector('.record-fan'))draw();});
const url=(r,asset='audio')=>asset==='cover'?r.cover_url:r.audio_url;
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
const bar=document.createElement('div');bar.className='record-player-bar';bar.hidden=true;bar.setAttribute('aria-label','唱片播放控制');
bar.innerHTML='<button class="record-return" aria-label="打开唱片架"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z"/></svg></button><div class="record-now"><strong></strong><span role="status"></span></div><button class="record-prev" aria-label="上一张唱片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7"/></svg></button><button class="record-toggle" aria-label="播放"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="play-mark" d="M8 5.5 18 12 8 18.5Z"/><path class="pause-mark" d="M8.5 6.5v11M15.5 6.5v11"/></svg></button><button class="record-next" aria-label="下一张唱片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7"/></svg></button><label class="record-volume">音量<input type="range" min="0" max="1" step="0.05" value="0.7" aria-label="音量"></label>';
// Match the tall, slender beamed notes in the selected reference.
bar.querySelector('.record-return').innerHTML='<svg class="music-note-reference" viewBox="0 0 32 36" aria-hidden="true"><path d="M9 25V7L27 3v18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="miter"/><path d="M9 7 27 3v4L9 11Z" fill="currentColor"/><ellipse cx="5.5" cy="26.5" rx="4.5" ry="3.2" transform="rotate(-20 5.5 26.5)" fill="currentColor"/><ellipse cx="23.5" cy="22.5" rx="4.5" ry="3.2" transform="rotate(-20 23.5 22.5)" fill="currentColor"/></svg>';
document.body.append(bar);
for (const event of ['play', 'pause', 'ended', 'error']) {
  audio.addEventListener(event, () => {
    emit('soft-hours:record-activity', !audio.paused && !audio.ended && !audio.error);
  });
}
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
 roomSound('record');
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
export function unmountRecords(){host=null;preloadedCovers.clear();bar.inert=false;}
export async function mountRecords(container){host=container;page=2;bar.inert=true;drawLoading();if(!await showPrivateGate(container,()=>mountRecords(container)))return;refresh();}
function drawLoading(){if(host)host.innerHTML='<p class="record-message" role="status">正在打开唱片架…</p>';}
async function refresh(){const target=host;try{const {data,error}=await cloud.from('soft_hours_records').select('*').order('created',{ascending:false});if(error)throw error;const cloudRecords=await Promise.all(data.map(async r=>({...r,audio_url:await signedFile(r.audio_path),cover_url:r.cover_path?await signedFile(r.cover_path):null})));records=[...roomRecords,...cloudRecords];if(host===target&&host)draw();}catch(e){records=[...roomRecords];if(host===target&&host)draw();}}
function draw(){
 if(!host)return;
 host.classList.remove('is-uploading');
 let fan=host.querySelector('.record-fan');
 if(!fan){
  host.innerHTML=`<div class="record-fan" aria-label="浏览唱片">
   <button class="record-page-prev" type="button" aria-label="上一张唱片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button>
   <div class="record-sleeves"></div>
   <button class="record-page-next" type="button" aria-label="下一张唱片"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>
  </div>
  <p class="record-caption" aria-live="polite"><strong></strong><span></span></p>
  <div class="record-library-actions"><button class="record-add">＋ 收进一张唱片</button></div><div class="record-form-slot"></div>`;
  fan=host.querySelector('.record-fan');
  fan.querySelector('.record-page-prev').onclick=()=>shift(-1);
  fan.querySelector('.record-page-next').onclick=()=>shift(1);
  host.querySelector('.record-add').onclick=showForm;
 }
 const total=records.length;
 page=total?((page%total)+total)%total:0;
 const offsets=compact.matches?[-1,0,1]:[-2,-1,0,1,2];
 const spread=total<offsets.length?offsets.filter(offset=>offset>=-Math.floor((total-1)/2)&&offset<=Math.ceil((total-1)/2)):offsets;
 const picked=records[page];
 const sleeves=fan.querySelector('.record-sleeves');
 const existing=new Map([...sleeves.children].map(button=>[button.dataset.recordId,button]));
 const coverAt=index=>records[index].cover_url||defaultCovers[index%defaultCovers.length];
 if(total)for(const offset of spread){
  const index=(page+offset+total)%total;
  const {id,title}=records[index];
  const previous=existing.get(id);
  const button=previous||document.createElement('button');
  if(previous)existing.delete(id);
  else{
   button.className='record-sleeve';
   button.type='button';
   button.dataset.recordId=id;
   const img=document.createElement('img');
   img.alt='';
   img.decoding='async';
   button.append(img);
   button.onclick=()=>{
    if(selecting)return;
    const target=records.findIndex(record=>record.id===id);
    if(target===page)select(records[target],button);
    else if(target>=0){page=target;roomSound('page');draw();}
   };
  }
  const cover=coverAt(index);
  if(button.firstElementChild.getAttribute('src')!==cover)button.firstElementChild.src=cover;
  button.style.setProperty('--offset',offset);
  button.style.setProperty('--distance',Math.abs(offset));
  button.classList.toggle('is-centered',offset===0);
  button.tabIndex=offset===0?0:-1;
  button.setAttribute('aria-label',(offset===0?'播放 ':'选中 ')+title);
  if(!previous)sleeves.append(button);
 }
 for(const button of existing.values())button.remove();
 fan.querySelector('.record-page-prev').disabled=total<2;
 fan.querySelector('.record-page-next').disabled=total<2;
 const caption=host.querySelector('.record-caption');
 caption.querySelector('strong').textContent=picked?.title||'唱片架还是空的';
 caption.querySelector('span').textContent=picked?(picked.memory||picked.day||''):'放入第一段属于你们的声音吧。';
 if(total>spread.length)for(const offset of [spread[0]-1,spread.at(-1)+1]){
  const cover=coverAt((page+offset+total)%total);
  if(preloadedCovers.has(cover))continue;
  const image=new Image();
  image.src=cover;
  image.decode().catch(()=>preloadedCovers.delete(cover));
  preloadedCovers.add(cover);
 }
}
function shift(amount){if(!selecting){page+=amount;draw();}}
function showForm(){const slot=host.querySelector('.record-form-slot');host.classList.add('is-uploading');slot.innerHTML=`<form class="record-upload"><label>唱片名字<input name="title" maxlength="80" required placeholder="例如：那天一起唱的歌"></label><label>那一天<input name="day" type="date"></label><label class="record-wide">留一句回忆<textarea name="memory" maxlength="500" placeholder="听到这段声音，你会想起什么？"></textarea></label><label>声音 · 最大 20 MB<input name="audio" type="file" accept="audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/webm,.m4a" required></label><label>封面 · 可选，最大 2 MB<input name="cover" type="file" accept="image/jpeg,image/png,image/webp"></label><p class="record-wide record-save-status" role="status">保存后，重新打开小屋也能听见。</p><button type="submit">保存到唱片架</button><button type="button" class="record-cancel">返回唱片架</button></form>`;
 const form=slot.querySelector('form');form.elements.title.focus();form.querySelector('.record-cancel').onclick=()=>{slot.replaceChildren();draw();host.querySelector('.record-add').focus();};let pendingId=crypto.randomUUID();
 form.oninput=()=>{pendingId=crypto.randomUUID();};
 form.onsubmit=async e=>{e.preventDefault();if(loading)return;const data=new FormData(form),file=data.get('audio'),cover=data.get('cover'),note=form.querySelector('.record-save-status');if(file.size>20*1024*1024||cover.size>2*1024*1024){note.textContent='音频最大 20 MB，封面最大 2 MB。';return;}loading=true;[...form.elements].forEach(x=>x.disabled=true);
 try{const member=await getIdentity();if(!member)throw Error('请先登录。');const audioPath=`records/${pendingId}/audio`,coverPath=cover.size?`records/${pendingId}/cover`:null;note.textContent='正在上传声音…';await uploadPrivate(audioPath,file);if(coverPath){note.textContent='正在上传封面…';await uploadPrivate(coverPath,cover);}const {error}=await cloud.from('soft_hours_records').insert({id:pendingId,title:data.get('title'),day:data.get('day'),memory:data.get('memory'),audio_path:audioPath,cover_path:coverPath,cover_mime:cover.size?cover.type:null,author:member.user.id});if(error)throw error;if(form.isConnected){slot.replaceChildren();await refresh();const p=host?.querySelector('.record-caption span');if(p)p.textContent='已保存到云端 · 点击新唱片开始播放';host?.querySelector('.is-centered')?.focus({preventScroll:true});}}
 catch(err){note.textContent=err.message;[...form.elements].forEach(x=>x.disabled=false);}finally{loading=false;}};
}
window.addEventListener('soft-hours:auth-change',()=>{if(host)mountRecords(host);});
