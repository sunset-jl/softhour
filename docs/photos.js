import {cloud,getIdentity,showPrivateGate,signedFile,uploadPrivate} from './cloud.js';
let host=null,photos=[],trash=false,timer=null,running=false,selectedPhoto=null,lastSnapshot='',lastSignedAt=0;
let albumState='loading', mountVersion=0, refreshVersion=0, cachedAlbum=null;
let legacyRows=[];
const queue=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const warmNames={889:'两口甜，刚刚好',890:'认真挑选的你',891:'路灯下，走向我',892:'那晚的背影',893:'逛店时的小惊喜',894:'隔着屏幕，也在一起',895:'通话里的小表情',896:'镜头里温柔的你',897:'把今天拼成两格',898:'同一刻的两个我们',899:'屏幕两端的日常',900:'又见你的笑',901:'留在相纸里的我们',902:'值得庆祝的一天',903:'这一刻，很闪亮'};
function photoTitle(p){const match=String(p.name||p.path||'').match(/_(88[9]|89\d|90[0-3])_121\.(?:jpe?g|png|webp)$/i);return match?warmNames[Number(match[1])]||p.name:p.name;}
function savedDate(p,detail=false){const date=new Date(p.created);if(Number.isNaN(date.getTime()))return '存入小屋';return `存入小屋 · ${detail?date.toLocaleString('zh-CN',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'}):date.toLocaleDateString('zh-CN')}`;}
function status(text){const el=host?.querySelector('#photoStatus');if(el)el.textContent=text;}
function drawQueue(){const target=host?.querySelector('#photoQueue');if(target)target.innerHTML=queue.map((q,i)=>`<div class="photo-job"><span>${esc(q.file.name)}</span><small>${esc(q.status)}</small>${q.failed?`<button data-retry="${i}">重试</button>`:''}</div>`).join('');}
function draw(){
  if(!host?.querySelector('#photoGrid'))return;
  const items=photos.filter(p=>trash?!!p.deleted:!p.deleted);
  const selected=Math.max(0,items.findIndex(p=>p.id===selectedPhoto));
  const photo=items[selected];
  selectedPhoto=photo?.id;
  const first=Math.floor(selected/4)*4;
  const visible=items.slice(first,first+4);
  host.querySelector('#photoGrid').innerHTML=visible.map(p=>`<button type="button" class="photo-slot album-thumb" data-view="${esc(p.id)}" aria-pressed="${p.id===selectedPhoto}" aria-label="查看 ${esc(photoTitle(p))}"><img src="${esc(p.url)}" alt="" loading="lazy"></button>`).join('');
  const image=host.querySelector('#photoLarge');
  image.hidden=!photo;
  if(photo){ if(image.getAttribute('src')!==photo.url)image.src=photo.url; image.alt=photoTitle(photo); }else image.removeAttribute('src');
  host.querySelector('#photoEmpty').hidden=!!photo;
  host.querySelector('#photoEmpty').textContent=albumState==='loading'?'正在打开私人相册…':albumState==='error'?'照片暂时没有加载出来。':trash?'暂时没有移除的照片。':'这里还没有照片，放入第一段回忆吧。';
  host.querySelector('#photoRetry').hidden=albumState!=='error'||!!photo;
  host.querySelector('#photoName').textContent=photo?`${photoTitle(photo)} · ${photo.author_slot} · ${savedDate(photo)}`:'';
  const manage=host.querySelector('#photoManageSelected');
  manage.hidden=!photo?.mine;
  if(photo?.mine){manage.dataset.photo=photo.id;manage.dataset.photoAction=trash?'restore':'remove';manage.textContent=trash?'恢复这张照片':'移除这张照片';}
  const pager=host.querySelector('#photoPager');
  pager.hidden=!photo;
  pager.querySelector('.album-dots').innerHTML=visible.map((p,i)=>`<button type="button" data-view="${esc(p.id)}" aria-label="第 ${first+i+1} 张照片" aria-pressed="${p.id===selectedPhoto}"></button>`).join('');
  pager.querySelector('[data-photo-page="prev"]').disabled=selected===0;
  pager.querySelector('[data-photo-page="next"]').disabled=selected>=items.length-1;
  host.querySelector('#photoTrash').textContent=trash?'返回相册':'最近移除';drawQueue();
}
async function refresh(){
  if(!host)return;
  const mount=mountVersion, request=++refreshVersion;
  const current=()=>host&&mount===mountVersion&&request===refreshVersion;
  if(albumState==='error'&&!photos.length){albumState='loading';status('');draw();}
  try{
    const identity=await getIdentity();
    if(!current())return;
    if(!identity)throw Error('请重新登录 J/K 后再试。');
    const {data,error}=await cloud.from('soft_hours_photos').select('*').order('created',{ascending:false})
      .abortSignal(AbortSignal.timeout(12000));
    if(!current())return;
    if(error)throw error;
    const snapshot=JSON.stringify(data.map(p=>[p.id,p.name,p.path,p.deleted,p.created]));
    if(snapshot===lastSnapshot&&Date.now()-lastSignedAt<45*60*1000){
      if(albumState!=='ready'){albumState='ready';draw();status('');}
      return;
    }
    const signed=await Promise.allSettled(data.map(async p=>({...p,url:await signedFile(p.path),author_slot:p.author===identity.user.id?identity.slot:identity.slot==='J'?'K':'J',mine:p.author===identity.user.id})));
    if(!current())return;
    const available=signed.flatMap(result=>result.status==='fulfilled'?[result.value]:[]);
    if(data.length&&!available.length)throw Error('照片的访问链接暂时无法生成。');
    photos=available;
    albumState='ready';
    if(available.length===data.length){
      lastSnapshot=snapshot;
      lastSignedAt=Date.now();
      cachedAlbum={userId:identity.user.id,photos,snapshot,signedAt:lastSignedAt};
    }
    draw();
    status(available.length<data.length?'部分照片暂时无法打开，可以在「管理照片」里重试。':'');
  }catch(error){
    if(!current())return;
    albumState='error';
    draw();
    status(error.message||'请检查网络后重试。');
  }
}
async function upload(q){const member=await getIdentity();if(!member)throw Error('请重新登录后上传。');const path=`photos/${q.id}/${q.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await uploadPrivate(path,q.file);const {error}=await cloud.from('soft_hours_photos').insert({id:q.id,name:q.file.name,path,author:member.user.id});if(error)throw error;}
async function loadLegacy(){try{const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('soft-hours-photos',1);request.onupgradeneeded=()=>request.result.createObjectStore('photos',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});legacyRows=await new Promise((resolve,reject)=>{const tx=db.transaction('photos','readonly'),request=tx.objectStore('photos').getAll();request.onsuccess=()=>resolve(request.result.filter(p=>p.blob&&!p.deleted));request.onerror=()=>reject(request.error);});db.close();const missing=legacyRows.filter(p=>!photos.some(x=>x.id===p.id));const button=host?.querySelector('#photoImportLegacy');if(button){button.hidden=!missing.length;button.textContent=`导入这台浏览器的旧照片（${missing.length} 张）`;}}catch{legacyRows=[];}}
async function importLegacy(){const button=host?.querySelector('#photoImportLegacy');if(!button||running)return;button.disabled=true;const missing=legacyRows.filter(p=>!photos.some(x=>x.id===p.id));let count=0;for(const p of missing){status(`正在导入旧照片 ${count+1} / ${missing.length}…`);try{await upload({id:p.id,file:new File([p.blob],p.name||'memory.jpg',{type:p.blob.type||'image/jpeg'})});count++;}catch(e){status(`已导入 ${count} 张；${e.message}。原照片仍保存在浏览器中。`);button.disabled=false;await refresh();return;}}await refresh();await loadLegacy();status(`已导入 ${count} 张旧照片，原照片仍保存在浏览器中。`);button.disabled=false;}
async function process(){if(running)return;running=true;try{while(queue.some(q=>q.pending)){const q=queue.find(q=>q.pending);q.pending=false;q.failed=false;q.status='正在上传…';drawQueue();try{await upload(q);q.status='已保存到云端';q.done=true;await refresh();}catch(e){q.status=e.message;q.failed=true;}drawQueue();}}finally{running=false;}}
export async function mountPhotos(element){
  unmountPhotos();
  const version=mountVersion;
  host=element;photos=[];trash=false;selectedPhoto=null;lastSnapshot='';albumState='loading';
  host.innerHTML='<p class="small-note">正在确认私人相册的访问权限…</p>';
  const member=await showPrivateGate(element,()=>mountPhotos(element));
  if(version!==mountVersion)return;
  if(!member){cachedAlbum=null;return;}
  if(cachedAlbum?.userId===member.user.id&&Date.now()-cachedAlbum.signedAt<45*60*1000){
    ({photos,snapshot:lastSnapshot,signedAt:lastSignedAt}=cachedAlbum);
    albumState='ready';
  }else cachedAlbum=null;
  host.innerHTML=`<div class="photo-viewer"><div class="photo-grid" id="photoGrid" aria-label="照片缩略图"></div><figure class="album-main"><img id="photoLarge" alt="" hidden><p id="photoEmpty" class="small-note" role="status"></p><button type="button" id="photoRetry" hidden>重试加载</button><figcaption id="photoName" aria-live="polite"></figcaption><nav class="photo-pager" id="photoPager" aria-label="切换照片"><button type="button" data-photo-page="prev" aria-label="上一张照片">‹</button><span class="album-dots"></span><button type="button" data-photo-page="next" aria-label="下一张照片">›</button></nav></figure></div><details class="album-tools"><summary>管理照片</summary><div class="photo-tools"><label class="upload-label">放入照片 <input type="file" id="photoInput" accept="image/jpeg,image/png,image/webp" multiple></label><button id="photoTrash">最近移除</button><button id="photoRefresh">刷新相册</button><button id="photoImportLegacy" hidden>导入旧照片</button><button id="photoManageSelected" hidden></button></div></details><p id="photoStatus" role="status"></p><div id="photoQueue" aria-live="polite"></div>`;
  host.querySelector('#photoRetry').onclick=refresh;
  host.querySelector('#photoInput').onchange=e=>{const files=[...e.target.files];e.target.value='';if(files.length>12){status('每次最多选择 12 张照片。');return;}for(const file of files){const valid=file.size<=12*1024*1024&&['image/jpeg','image/png','image/webp'].includes(file.type);queue.push({id:crypto.randomUUID(),file,pending:valid,failed:!valid,status:valid?'等待上传…':'请选择 12 MB 以内的照片。'});}drawQueue();process();};
  host.querySelector('#photoTrash').onclick=()=>{trash=!trash;selectedPhoto=null;draw();};host.querySelector('#photoRefresh').onclick=refresh;host.querySelector('#photoImportLegacy').onclick=importLegacy;
  host.onclick=async e=>{
    const b=e.target.closest('button');
    if(!b||b.disabled)return;
    if(b.dataset.photoPage){
      const items=photos.filter(p=>trash?!!p.deleted:!p.deleted);
      const index=items.findIndex(p=>p.id===selectedPhoto)+(b.dataset.photoPage==='next'?1:-1);
      if(items[index]){selectedPhoto=items[index].id;draw();}
      return;
    }
    if(b.dataset.retry!==undefined){const q=queue[Number(b.dataset.retry)];if(q&&!running){q.pending=true;process();}return;}
    if(b.dataset.view){selectedPhoto=b.dataset.view;draw();return;}
    if(b.dataset.photoAction){b.disabled=true;const {error}=await cloud.from('soft_hours_photos').update({deleted:b.dataset.photoAction==='remove'}).eq('id',b.dataset.photo);if(error)status(error.message);else await refresh();b.disabled=false;}
  };
  draw();await refresh();
  if(version!==mountVersion)return;
  loadLegacy();timer=setInterval(()=>{if(!document.hidden&&!running)refresh();},5*60*1000);
}
export function unmountPhotos(){mountVersion++;clearInterval(timer);if(host)host.onclick=null;host=null;}
window.addEventListener('soft-hours:auth-change',()=>{if(host)mountPhotos(host);else cachedAlbum=null;});
window.addEventListener('beforeunload',e=>{if(running){e.preventDefault();e.returnValue='';}});
