import { roomSound } from './room-sounds.js?v=room-finds-2';

const notes = [
  '今天只做到这里也可以。剩下的事，等你有力气了再说。',
  '先喝口水，找个舒服的位置。今天不用急着把自己哄好。',
  '你可以同时很努力，也很累。这两件事都是真的。',
  '今天的坏心情，可以先在小屋门口寄放一会儿。',
  '就算今天只做了一件小事，也算是认真过了今天。',
  '你可以先照顾自己，消息和待办都可以晚一点。',
  '想哭的话，小屋里有纸巾。想安静的话，这里也有一把椅子。',
  '允许自己今天只开一盏小灯。',
  '今天觉得难熬，也可以找信任的人说一句「能陪我一会儿吗？」',
  '先把肩膀放松一点。小屋替你把灯留着。',
  '如果今天走得有点慢，就当是在路边多看了几朵花。',
  '给你留了一个软软的位置，随时都可以回来坐。',
  '不用马上决定明天怎么办。现在先休息五分钟。',
  '小猫把暖暖的那半块地毯让给你了。',
  '心里乱成一团时，可以先做一件摸得着的小事，比如叠好毯子。',
  '送你一张今日免催券。今天可以慢慢来。',
];
let remaining = [];
let last = -1;
let timer;

export function unmountComfortMachine(){
  clearTimeout(timer);
}

export function mountComfortMachine(host){
  host.innerHTML = `<div class="comfort-stage" data-phase="ready">
    <canvas class="comfort-preview" width="384" height="384" role="img" aria-label="圆形扭蛋机"></canvas>
    <span class="comfort-capsule" aria-hidden="true"><i></i><i></i></span>
  </div>
  <div class="comfort-actions"><button type="button">抽</button></div>
  <div class="comfort-paper-slot"><blockquote class="pillow-note comfort-note" role="status"></blockquote></div>`;
  const stage = host.querySelector('.comfort-stage');
  const preview = host.querySelector('canvas');
  window.dispatchEvent(new CustomEvent('soft-hours:comfort-preview',{detail:preview}));
  const card = host.querySelector('.comfort-note');
  const button = host.querySelector('button');
  function draw(){
    if(!remaining.length)remaining = notes.map((_, index) => index);
    const available = remaining.length > 1 ? remaining.filter(index => index !== last) : remaining;
    last = available[Math.floor(Math.random() * available.length)];
    remaining.splice(remaining.indexOf(last),1);
    card.textContent = notes[last];
  }
  function reveal(){
    stage.dataset.phase = 'revealed';
    draw();
    button.disabled = false;
    roomSound('sparkle');
  }
  function next(phase, delay, after){
    stage.dataset.phase = phase;
    timer = setTimeout(after,delay);
  }
  button.onclick = () => {
    if(button.disabled)return;
    card.textContent = '';
    button.disabled = true;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){reveal();return;}
    roomSound('box');
    next('shake',460,() => next('drop',480,() => {
      roomSound('place');
      next('open',340,reveal);
    }));
  };
}
