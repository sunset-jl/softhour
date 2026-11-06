const roachArt = `<svg viewBox="0 0 48 48" aria-hidden="true">
  <path class="roach-legs" d="m19 16-7-4-3-6m10 15-9 1-5 5m14 0-6 7-2 7m18-25 7-4 3-6m-10 15 9 1 5 5m-14 0 6 7 2 7" fill="none" stroke="#452a32" stroke-width="2.3" stroke-linecap="round"/>
  <path d="M21 13q-2-8-8-11m14 11q2-8 8-11" fill="none" stroke="#452a32" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="24" cy="26" rx="10.5" ry="15" fill="#63373c" stroke="#452a32" stroke-width="1.8"/>
  <path d="M16 18q8-5 16 0m-8 0v20" fill="none" stroke="#ab6d62" stroke-width="1.5" stroke-linecap="round"/>
  <ellipse cx="24" cy="12" rx="6" ry="4.8" fill="#503139"/>
</svg>`;

const slipperArt = `<svg viewBox="0 0 250 390" aria-hidden="true">
  <path d="M45 127c-9-60 26-104 80-105 54 0 88 44 81 105l-20 178c-5 42-27 62-61 62s-56-20-61-62Z" fill="#896ba7" stroke="#5e4c76" stroke-width="6"/>
  <path d="M52 116c-4-48 26-87 73-87s78 39 73 87l-19 179c-4 36-23 56-54 56s-50-20-54-56Z" fill="#f2d7d8" stroke="#b092bc" stroke-width="5"/>
  <path d="M52 129c2-53 30-88 73-88s71 35 73 88l-8 71c-34-19-95-19-130 0Z" fill="#d4b9e9" stroke="#9a78b5" stroke-width="6" stroke-linejoin="round"/>
  <path d="M66 186c34-14 84-14 118 0" fill="none" stroke="#f1dbf6" stroke-width="4" stroke-linecap="round" stroke-dasharray="4 7"/>
  <path d="M125 86q7 20 27 27-20 7-27 27-7-20-27-27 20-7 27-27Z" fill="#f8e7c9"/>
  <circle cx="125" cy="113" r="6" fill="#edc17f"/>
  <path d="M97 247q28-10 56 0m-49 15q21-7 42 0m-35 14q14-4 28 0" fill="none" stroke="#d6aebb" stroke-width="5" stroke-linecap="round"/>
</svg>`;

let audio;
let sample;
export function armSlapAudio(){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return;
  try{
    audio??=new Context();
    if(audio.state!=='running')audio.resume().catch(()=>{});
  }catch{}
}

function playSlap(delay=0){
  if(audio?.state!=='running')return;
  if(!sample){
    sample=audio.createBuffer(1,Math.round(audio.sampleRate*.18),audio.sampleRate);
    const wave=sample.getChannelData(0);
    let previous=0;
    for(let i=0;i<wave.length;i++){
      const t=i/audio.sampleRate;
      const noise=Math.random()*2-1;
      const attack=Math.min(1,t/.002);
      wave[i]=attack*((noise-previous)*Math.exp(-t*54)*.23+Math.sin(t*2*Math.PI*112)*Math.exp(-t*31)*.34);
      previous=noise*.55;
    }
  }
  const source=audio.createBufferSource();
  source.buffer=sample;
  source.connect(audio.destination);
  source.start(audio.currentTime+delay);
}

export function openRugRoachGame(){
  if(document.querySelector('.roach-game')||typeof HTMLDialogElement==='undefined')return;
  const dialog=document.createElement('dialog');
  dialog.className='roach-game';
  dialog.setAttribute('aria-labelledby','roachGameTitle');
  dialog.innerHTML=`<header class="roach-game-bar">
    <div><h2 id="roachGameTitle">拖鞋大作战</h2><p class="roach-score" role="status">准备好拖鞋……</p></div>
    <button class="roach-close" type="button" aria-label="退出拖鞋大作战" autofocus>×</button>
  </header><div class="roach-field"></div><div class="roach-slipper">${slipperArt}</div>`;
  document.body.append(dialog);
  const field=dialog.querySelector('.roach-field'),slipper=dialog.querySelector('.roach-slipper');
  const score=dialog.querySelector('.roach-score'),close=dialog.querySelector('.roach-close');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const count=14,bugs=[];
  let remaining=count,animation,frame,introTimer,hideTimer,previous,width=0,height=0;
  function bounds(){width=field.clientWidth;height=field.clientHeight;}
  const observer=new ResizeObserver(bounds);

  function strike(x,y,intro){
    animation?.cancel();
    clearTimeout(hideTimer);
    slipper.style.left=`${x}px`;
    slipper.style.top=`${y}px`;
    slipper.classList.toggle('is-intro',intro);
    slipper.hidden=false;
    const angle=intro?-27:Math.random()*38-19;
    const pose=(scale,offset=0)=>`translate(-50%,-50%) translateY(${offset}px) rotate(${angle}deg) scale(${scale})`;
    const duration=motion.matches?100:intro?680:310;
    if(!motion.matches)animation=slipper.animate([
      {transform:pose(intro?.22:.71,intro?-190:-82),opacity:.3},
      {transform:pose(intro?1.36:1,0),opacity:1,offset:intro?.53:.42},
      {transform:pose(intro?1.26:.92),opacity:0},
    ],{duration,easing:'ease-out'});
    hideTimer=setTimeout(()=>{slipper.hidden=true;},duration);
    return duration;
  }

  function move(now){
    const dt=Math.min((now-(previous??now))/1000,.05);
    previous=now;
    for(const bug of bugs){
      if(!bug.element.isConnected)continue;
      if(!motion.matches){
        bug.heading+=Math.sin(now/410+bug.phase)*dt*1.9;
        bug.x+=Math.cos(bug.heading)*bug.speed*dt;
        bug.y+=Math.sin(bug.heading)*bug.speed*dt;
      }
      const right=Math.max(44,width-28),bottom=Math.max(80,height-28);
      if(bug.x<28||bug.x>right){bug.heading=Math.PI-bug.heading;bug.x=Math.max(28,Math.min(right,bug.x));}
      if(bug.y<65||bug.y>bottom){bug.heading=-bug.heading;bug.y=Math.max(65,Math.min(bottom,bug.y));}
      bug.element.style.transform=`translate3d(${bug.x-25}px,${bug.y-25}px,0) rotate(${bug.heading+Math.PI/2}rad)`;
    }
    if(remaining)frame=requestAnimationFrame(move);
  }

  function start(){
    bounds();
    for(let i=0;i<count;i++){
      const element=document.createElement('button');
      element.className='roach-target';element.type='button';
      element.setAttribute('aria-label',`拍蟑螂 ${i+1}`);
      element.innerHTML=roachArt;
      const bug={element,x:32+Math.random()*Math.max(1,width-64),y:75+Math.random()*Math.max(1,height-113),heading:Math.random()*Math.PI*2,speed:47+Math.random()*74,phase:i*.76};
      bugs.push(bug);
      element.onclick=()=>{
        if(!element.isConnected)return;
        armSlapAudio();
        strike(bug.x,bug.y,false);
        playSlap(motion.matches?0:.09);
        const focused=document.activeElement===element;
        element.remove();
        remaining--;
        score.textContent=remaining?`还剩 ${remaining} 只 · 点蟑螂拍打`:'小屋清理完毕！';
        if(focused)(field.querySelector('button')||close).focus({preventScroll:true});
      };
      field.append(element);
    }
    score.textContent=`还剩 ${remaining} 只 · 点蟑螂拍打`;
    move(performance.now());
  }

  close.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{
    cancelAnimationFrame(frame);
    clearTimeout(introTimer);
    clearTimeout(hideTimer);
    observer.disconnect();
    animation?.cancel();
    dialog.remove();
  },{once:true});
  dialog.showModal();
  bounds();
  observer.observe(field);
  const duration=strike(width/2,height*.53,true);
  introTimer=setTimeout(()=>{
    playSlap();
    introTimer=setTimeout(start,motion.matches?0:170);
  },motion.matches?0:Math.round(duration*.53));
}
