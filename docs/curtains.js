import * as THREE from 'three';

// Deform the original painted cloth, keeping its outside edge attached to the rod.
import { curtainSound } from './room-sounds.js?v=room-sfx-1';

export function installCurtains({room, camera, canvas, controls, meshes, hoverLabel, shouldApproach, onApproach}) {
  const cursor=document.createElement('div');
  cursor.className='curtain-cursor';cursor.hidden=true;cursor.setAttribute('aria-hidden','true');
  cursor.innerHTML='<span class="curtain-cursor__glass"><svg viewBox="0 0 24 16" aria-hidden="true"><path d="M3 8h18M7 4L3 8l4 4M17 4l4 4-4 4"/></svg></span>';
  document.body.append(cursor);
  function showCursor(e,pressed=false){
    if(e.pointerType==='touch'){hideCursor();return;}
    cursor.hidden=false;cursor.classList.toggle('is-pressed',pressed);
    cursor.style.transform='translate3d('+e.clientX+'px,'+e.clientY+'px,0)';
    canvas.style.cursor='none';
  }
  function hideCursor(){cursor.hidden=true;canvas.style.cursor='grab';}
  let saved={}; try {saved=JSON.parse(localStorage.getItem('soft-hours-curtains')||'{}');} catch {}
  const curtains=[];
  room.traverse(mesh=>{
    if(!mesh.isMesh || !['curtainLeft','curtainRight'].includes(mesh.userData.action)) return;
    const p=mesh.geometry.attributes.position, original=p.array.slice();
    mesh.geometry.computeBoundingBox(); const box=mesh.geometry.boundingBox;
    const positive=(box.min.z+box.max.z)>0, anchor=positive?box.max.z:box.min.z;
    const width=box.max.z-box.min.z;
    const item={mesh,p,original,anchor,width,sign:positive?-1:1,amount:0};
    curtains.push(item);
    apply(item,Number.isFinite(saved[mesh.userData.action])?saved[mesh.userData.action]:0);
  });
  function apply(item,amount){
    item.amount=THREE.MathUtils.clamp(amount,0,1);
    const ratio=1+item.amount*(Math.abs(item.anchor)/item.width-1);
    for(let i=0;i<item.p.count;i++) item.p.setZ(i,item.anchor+(item.original[i*3+2]-item.anchor)*ratio);
    item.p.needsUpdate=true;item.mesh.geometry.computeBoundingBox();item.mesh.geometry.computeBoundingSphere();
  }
  function save(){try{localStorage.setItem('soft-hours-curtains',JSON.stringify(Object.fromEntries(curtains.map(c=>[c.mesh.userData.action,c.amount]))));}catch{}}
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let drag=null;
  function pick(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes,false)[0];return curtains.find(c=>c.mesh===hit?.object);}
  function finish(){hideCursor();if(!drag)return;drag=null;controls.enabled=true;canvas.style.cursor='grab';canvas.classList.remove('is-dragging');hoverLabel.hidden=true;save();}
  canvas.addEventListener('pointerdown',e=>{
    if(drag){e.stopImmediatePropagation();return;}
    if(e.button!==0)return;const item=pick(e);if(!item)return;
    if(shouldApproach?.()){hideCursor();onApproach?.();e.preventDefault();e.stopImmediatePropagation();return;}
    room.updateMatrixWorld(true);
    const a=item.mesh.localToWorld(new THREE.Vector3(0,0,item.anchor)).project(camera);
    const b=item.mesh.localToWorld(new THREE.Vector3(0,0,item.anchor+item.sign*(Math.abs(item.anchor)-item.width))).project(camera);
    const r=canvas.getBoundingClientRect(),dx=(b.x-a.x)*r.width/2,dy=-(b.y-a.y)*r.height/2;
    if(dx*dx+dy*dy<100)return;
    drag={item,id:e.pointerId,x:e.clientX,y:e.clientY,amount:item.amount,dx,dy};
    controls.enabled=false;canvas.setPointerCapture(e.pointerId);showCursor(e,true);hoverLabel.hidden=true;
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  canvas.addEventListener('pointermove',e=>{
    if(!drag)return;e.stopImmediatePropagation();e.preventDefault();if(e.pointerId!==drag.id)return;
    const t=((e.clientX-drag.x)*drag.dx+(e.clientY-drag.y)*drag.dy)/(drag.dx*drag.dx+drag.dy*drag.dy);
    const previous = drag.item.amount;
    apply(drag.item,drag.amount+t);showCursor(e,true);
    if (Math.abs(previous - drag.item.amount) > 0.002) curtainSound();
  },true);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
    if(!drag)return;e.stopImmediatePropagation();if(e.pointerId!==drag.id)return;
    finish();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  },true);
  canvas.addEventListener('wheel',e=>{if(drag){e.preventDefault();e.stopImmediatePropagation();}},{capture:true,passive:false});
  canvas.addEventListener('pointerleave',()=>{if(!drag)hideCursor();});
  canvas.addEventListener('wheel',()=>{if(!drag)hideCursor();},{passive:true});
  window.addEventListener('blur',finish);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
  canvas.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='c'){e.preventDefault();const amount=curtains.some(c=>c.amount<.5)?1:0;curtains.forEach(c=>apply(c,amount));if(curtains.length)curtainSound();save();}});
  return {get dragging(){return !!drag;},count:curtains.length,get lightOpening(){
    let min=-3.15,max=3.15;
    for(const c of curtains){const edge=c.anchor+c.sign*(c.width+(Math.abs(c.anchor)-c.width)*c.amount);if(c.anchor<0)min=edge;else max=edge;}
    return [min,max];
  },hover(e,active){if(active)showCursor(e);else hideCursor();}};
}
