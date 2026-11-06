import { roomSound } from './room-sounds.js?v=room-finds-2';

const notes = [
  '慢慢来，每一步都算数。',
  '乌云会散，阳光总会再来。',
  '日子很长，好事可以慢一点来。',
  '每一朵花，都有自己的花期。',
  '今天的雨，落不到明天。',
  '走累了就歇一会儿，远方会等你。',
  '你已经走了很远，记得回头看看。',
  '不完美的日子，也值得好好收藏。',
  '温柔一点，对世界，也对自己。',
  '心里留一点光，慢慢就能看清路。',
  '把期待留给明天，把好觉留给今晚。',
  '日子偶尔酸一点，也会慢慢回甘。',
  '花会沿着自己的节奏开，你也是。',
  '愿你在平凡的一天里，遇见一点小小的好运。',
  '山路会转弯，日子也会有新的风景。',
  '今天辛苦啦，明天又是新的一天。',
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
