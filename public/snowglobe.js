import * as THREE from 'three';
import { roomSound } from './room-sounds.js?v=room-finds-2';
import {OrbitControls} from './vendor/OrbitControls.js';

export function installSnowglobe(room){
 const trigger=document.getElementById('globeButton');let closeCurrent=null;
 trigger.disabled=false;trigger.addEventListener('click',()=>{if(closeCurrent)return;open();});
 window.addEventListener('soft-hours:globe-selfie',()=>{if(!closeCurrent)open(true);});
 function open(selfieMode=false){
  const night=document.body.classList.contains('is-night'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const overlay=document.createElement('section');overlay.className='globe-overlay'+(night?' globe-night':'');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','globeTitle');
  overlay.innerHTML=`<header class="globe-header"><span>J & K / POCKET UNIVERSE</span><button class="globe-close" aria-label="返回小屋">返回小屋 ↗</button></header><div class="globe-heading"><span>把这一刻，轻轻收藏</span><h2 id="globeTitle">我们的小小宇宙</h2></div><div class="globe-stage"><canvas tabindex="0" aria-label="三维水晶球：拖动旋转，滚轮缩放，方向键调整角度"></canvas></div><div class="globe-bottom"><p class="globe-instruction">拖动转一转 · 滚轮靠近一点</p><label class="globe-caption-label">写在照片下面<input maxlength="32" value="把有你的地方，装进口袋。" aria-label="照片上的一句话"></label><div class="globe-actions"><button class="globe-shake">✧ 摇落星星</button><button class="globe-save">保存这颗小宇宙 ↓</button></div><p class="globe-status" role="status">保存为 1080 × 1350 图片，可以发到朋友圈</p><a class="globe-image-link" hidden target="_blank" rel="noopener">打开成片 · 可长按保存</a></div>`;
  document.body.append(overlay);document.body.classList.add('is-globe');
  const main=document.querySelector('main'),bar=document.querySelector('.record-player-bar'),oldInert=main.inert,oldBar=bar?.inert,oldFocus=document.activeElement;
  main.inert=true;if(bar)bar.inert=true;
  const canvas=overlay.querySelector('canvas'),stage=overlay.querySelector('.globe-stage'),status=overlay.querySelector('.globe-status'),save=overlay.querySelector('.globe-save');
  canvas.addEventListener('wheel', event => {
    if (event.deltaY) roomSound(event.deltaY < 0 ? 'zoomIn' : 'zoomOut');
  }, { passive: true });
  let dragStart = null;
  canvas.addEventListener('pointerdown', event => {
    if (event.isPrimary && event.button === 0) dragStart = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragStart || Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) < 6) return;
    dragStart = null;
    roomSound('turn');
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, () => { dragStart = null; });
  }
  canvas.addEventListener('keydown', event => {
    if (event.key.startsWith('Arrow')) roomSound('turn');
  });
  let renderer,controls,observer,frame,disposed=false,saving=false,url=null,stream=null;
  const video=document.createElement('video');
  video.className='globe-selfie-video';video.autoplay=true;video.muted=true;video.playsInline=true;video.hidden=true;
  const selfieControls=document.createElement('div');
  selfieControls.className='globe-selfie-controls';
  selfieControls.hidden=true;
  selfieControls.innerHTML='<label>左右<input type="range" min="-1" max="1" step=".02" value=".32"></label><label>上下<input type="range" min="-1" max="1" step=".02" value="-.32"></label>';
  const [horizontal,vertical]=selfieControls.querySelectorAll('input');
  if(selfieMode){
    stage.prepend(video);
    overlay.querySelector('.globe-bottom').prepend(selfieControls);
    const instruction=overlay.querySelector('.globe-instruction');
    status.textContent='请允许使用摄像头，照片只会保存到你的设备。';
    (async()=>{
      try{
        const feed=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
        if(disposed){feed.getTracks().forEach(track=>track.stop());return;}
        stream=feed;video.srcObject=stream;await video.play();
        if(disposed)return;
        video.hidden=false;selfieControls.hidden=false;stage.classList.add('has-selfie');
        instruction.textContent='用滑杆把水晶球移到手掌上，再拍照。';
        status.textContent='保存为 1080 × 1350 图片';
      }catch{
        stream?.getTracks().forEach(track=>track.stop());stream=null;
        if(!disposed)status.textContent='摄像头无法打开。仍然可以保存水晶球照片。';
      }
    })();
  }
  const geometries=new Set(),materials=new Set(),textures=new Set();
  function clean(){if(disposed)return;disposed=true;stream?.getTracks().forEach(track=>track.stop());cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();renderer?.dispose();renderer?.forceContextLoss();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());if(url)URL.revokeObjectURL(url);document.removeEventListener('keydown',key);overlay.remove();main.inert=oldInert;if(bar)bar.inert=oldBar;document.body.classList.remove('is-globe');closeCurrent=null;oldFocus?.focus();}
  closeCurrent=clean;overlay.querySelector('.globe-close').onclick=clean;
  function key(e){if(e.key==='Escape'){e.preventDefault();clean();return;}if(e.key==='Tab'){const items=[...overlay.querySelectorAll('button,input,canvas,a[href]')].filter(x=>!x.hidden&&!x.disabled),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  document.addEventListener('keydown',key);overlay.querySelector('.globe-close').focus();
  try{
   renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
   const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);
   const camera=new THREE.PerspectiveCamera(36,1,.1,80);camera.position.set(9,6.3,11);camera.lookAt(0,1.9,0);
   controls=new OrbitControls(camera,canvas);controls.target.set(0,1.9,0);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=12;controls.maxDistance=22;controls.minPolarAngle=.55;controls.maxPolarAngle=1.48;controls.rotateSpeed=.5;controls.zoomSpeed=.6;controls.update();
   function material(m){materials.add(m);return m;}function mesh(g,m){geometries.add(g);return new THREE.Mesh(g,material(m));}
   const copy=room.clone(true);copy.traverse(o=>{if(o.isMesh){o.material=material(new THREE.MeshBasicMaterial({vertexColors:true,map:o.material.map,side:THREE.DoubleSide,color:night?0x8d9cce:0xffffff}));if(!o.geometry.attributes.color)o.visible=false;}else if(o.isLine||o.isSprite)o.visible=false;});
   copy.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(copy),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),scale=2.55/Math.hypot(size.x/2,size.z/2);
   const miniature=new THREE.Group();miniature.add(copy);copy.position.x-=center.x;copy.position.z-=center.z;copy.position.y-=bounds.min.y;miniature.scale.setScalar(scale);miniature.position.y=.12;world.add(miniature);
   const base=mesh(new THREE.CylinderGeometry(2.78,2.92,.48,96),new THREE.MeshBasicMaterial({color:night?0x66607c:0xdcc7bd}));base.position.y=-.20;world.add(base);
   const top=mesh(new THREE.CylinderGeometry(2.79,2.79,.08,96),new THREE.MeshBasicMaterial({color:night?0xa295b6:0xf1e3c8}));top.position.y=.04;world.add(top);
   for(const y of [-.38,-.05]){const ring=mesh(new THREE.TorusGeometry(2.84,.025,8,96),new THREE.MeshBasicMaterial({color:night?0xb6a6cf:0xbfa186}));ring.rotation.x=Math.PI/2;ring.position.y=y;world.add(ring);}
   const label=document.createElement('canvas');label.width=512;label.height=128;const lc=label.getContext('2d');lc.fillStyle=night?'#e6d6f0':'#786578';lc.font='42px Georgia';lc.textAlign='center';lc.fillText('J & K',256,61);lc.font='13px Arial';lc.fillText('S O F T   H O U R S',256,96);const tex=new THREE.CanvasTexture(label);tex.colorSpace=THREE.SRGBColorSpace;textures.add(tex);
   const badge=mesh(new THREE.PlaneGeometry(1.5,.37),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));badge.position.set(0,-.16,2.925);world.add(badge);
   const globe=mesh(new THREE.SphereGeometry(3.3,80,48,0,Math.PI*2,0,Math.acos(-1.8/3.3)),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.FrontSide,uniforms:{tint:{value:new THREE.Color(night?0xbca4e8:0xb8a4c4)}},vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'uniform vec3 tint; varying vec3 n; varying vec3 v; void main(){vec3 nn=normalize(n);float rim=pow(1.0-abs(dot(nn,normalize(v))),3.0);float glint=pow(max(0.0,dot(nn,normalize(vec3(-.55,.65,.75)))),60.0);float edge=pow(1.0-abs(dot(nn,normalize(v))),14.0);gl_FragColor=vec4(mix(tint,vec3(1.),glint),.008+rim*.30+edge*.48+glint*.65);#include <colorspace_fragment>\n}'}));
   globe.material.fragmentShader=globe.material.fragmentShader.replace(';#include',';\n#include');globe.position.y=1.8;globe.renderOrder=10;world.add(globe);
   const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.045:.11;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();const starGeo=new THREE.ShapeGeometry(starShape);geometries.add(starGeo);
   const stars=[];for(let i=0;i<42;i++){const m=material(new THREE.MeshBasicMaterial({color:[0xffedbc,0xe7cee8,0xc5d8dc][i%3],transparent:true,opacity:night?.75:.65,side:THREE.DoubleSide,depthWrite:false}));const star=new THREE.Mesh(starGeo,m);const angle=i*2.39996,r=1.5+(i%5)*.23;star.position.set(Math.cos(angle)*r,.4+(i%13)*.30,Math.sin(angle)*r);world.add(star);stars.push({star,angle,r,speed:.08+(i%4)*.035});}
   let gust=0,time=0,last=performance.now(),entrance=0;
   overlay.querySelector('.globe-shake').onclick=()=>{gust=1;status.textContent=reduced?'小星星已经为你留在这里。':'星星慢慢落下，挑一个喜欢的瞬间。';};
   function fit(w,h){camera.aspect=w/h;camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.max(7.2,7.1/camera.aspect)/(2*15.3)));camera.updateProjectionMatrix();}
   function resize(){if(saving)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);fit(w,h);}
   observer=new ResizeObserver(resize);observer.observe(stage);resize();
   canvas.addEventListener('keydown',e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();const s=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));s.theta+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;s.phi=THREE.MathUtils.clamp(s.phi+(e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0),.55,1.48);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();});
   function layoutGlobe(scale){
     if(video.hidden){world.scale.setScalar(scale);return;}
     const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0);
     const up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);
     world.scale.setScalar(.52*scale);
     world.position.set(0,1.05,0).addScaledVector(right,Number(horizontal.value)*2.45).addScaledVector(up,Number(vertical.value)*2.3);
   }
   function animate(){if(disposed)return;frame=requestAnimationFrame(animate);const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden||saving)return;time+=dt;entrance=Math.min(1,entrance+dt/1.2);const ease=reduced?1:1-Math.pow(1-entrance,3);layoutGlobe(.75+.25*ease);gust=Math.max(0,gust-dt*.25);if(!reduced){for(const s of stars){s.star.position.y-=dt*(s.speed+gust*1.1);if(s.star.position.y<.35)s.star.position.y=3.8;const radius=Math.min(s.r,Math.sqrt(Math.max(0,10.24-(s.star.position.y-1.8)**2))-.16);s.star.position.x=Math.cos(s.angle+Math.sin(time*.25)*.12+gust*.2)*radius;s.star.position.z=Math.sin(s.angle+Math.sin(time*.25)*.12+gust*.2)*radius;s.star.rotation.z+=dt*.18;s.star.quaternion.copy(camera.quaternion);}}controls.update();renderer.render(scene,camera);}
   animate();
   save.onclick=async()=>{if(saving||disposed)return;saving=true;save.disabled=true;status.textContent='正在把这一刻装进照片…';
    try{
     const out=document.createElement('canvas');out.width=1080;out.height=1350;const ctx=out.getContext('2d');const bg=ctx.createLinearGradient(0,0,1080,1350);bg.addColorStop(0,night?'#28283f':'#fbf3e4');bg.addColorStop(.6,night?'#47405e':'#ece3ef');bg.addColorStop(1,night?'#302d47':'#f5e2d8');ctx.fillStyle=bg;ctx.fillRect(0,0,1080,1350);
     const glow=ctx.createRadialGradient(540,640,50,540,640,650);glow.addColorStop(0,night?'#bda0dd28':'#fffdf5c0');glow.addColorStop(1,'#ffffff00');ctx.fillStyle=glow;ctx.fillRect(0,0,1080,1350);
     renderer.setPixelRatio(1);renderer.setSize(1080,1020,false);fit(1080,1020);layoutGlobe(1);
     if(!video.hidden&&video.videoWidth){
       const w=video.videoWidth,h=video.videoHeight,ratio=1080/1020;
       const cropW=Math.min(w,h*ratio),cropH=cropW/ratio;
       ctx.save();ctx.translate(1080,0);ctx.scale(-1,1);
       ctx.drawImage(video,(w-cropW)/2,(h-cropH)/2,cropW,cropH,0,170,1080,1020);ctx.restore();
     }
     renderer.render(scene,camera);ctx.drawImage(canvas,0,170,1080,1020);
     ctx.textAlign='center';ctx.fillStyle=night?'#ede0f3':'#816a84';ctx.font='20px Georgia';ctx.fillText('J & K   /   POCKET UNIVERSE',540,83);ctx.font='62px Georgia';ctx.fillText('Soft Hours',540,159);
     ctx.font='27px "Noto Sans SC", sans-serif';const caption=overlay.querySelector('.globe-caption-label input').value.trim();ctx.fillText(caption||'把有你的地方，装进口袋。',540,1235,940);ctx.font='16px Georgia';ctx.fillText(new Date().toLocaleDateString('zh-CN')+'  ·  A LITTLE WORLD OF OURS',540,1285);
     const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(Error('图片生成失败')),'image/png'));if(disposed)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Soft-Hours-'+new Date().toISOString().slice(0,10)+'.png';document.body.append(a);a.click();a.remove();const link=overlay.querySelector('.globe-image-link');link.href=url;link.hidden=false;status.textContent='照片已生成。若未自动下载，可打开成片长按保存。';
    }catch{status.textContent='这次没有保存成功，请再试一次。';}
    finally{if(!disposed){saving=false;save.disabled=false;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));resize();}}
   };
  }catch(e){console.error('Crystal globe',e);status.textContent='水晶球暂时没有打开，请返回小屋后重试。';save.disabled=true;}
 }
}
