import * as THREE from 'three';
import { mistSound, placementSound, roomSound } from './room-sounds.js?v=room-finds-2';

export function installRoomProps({ room, camera, canvas, controls, hitAt, cushion, plants, tapPillow, notify }) {
  const point = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  function floorPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(2*(event.clientX-bounds.left)/bounds.width-1, 1-2*(event.clientY-bounds.top)/bounds.height);
    ray.setFromCamera(pointer,camera);
    return ray.ray.intersectPlane(plane,point) ? room.worldToLocal(point) : null;
  }
  let drag;
  canvas.addEventListener('pointerdown', event => {
    if (drag || !event.isPrimary || event.button !== 0 || !controls.enabled || hitAt(event.clientX,event.clientY)!=='pillow') return;
    plane.constant = -room.localToWorld(new THREE.Vector3(0,.25,0)).y;
    const p=floorPoint(event);
    if(!p)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,anchor:p.clone(),start:cushion.position.clone(),moved:false};
    controls.enabled=false;
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  canvas.addEventListener('pointermove', event => {
    if(drag?.id!==event.pointerId)return;
    if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6){drag.moved=true;roomSound('fabric');}
    const p=drag.moved&&floorPoint(event);
    if(p){
      cushion.position.x=THREE.MathUtils.clamp(drag.start.x+p.x-drag.anchor.x,-.9,1.75);
      cushion.position.z=THREE.MathUtils.clamp(drag.start.z+p.z-drag.anchor.z,-1.05,.55);
    }
    event.preventDefault();event.stopImmediatePropagation();
  },true);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>{
    if(drag?.id!==event.pointerId)return;
    const {moved,start}=drag;drag=null;controls.enabled=true;
    if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    if(name==='pointerup'){if(moved)placementSound();else tapPillow();}
    else cushion.position.copy(start);
    event.preventDefault();event.stopImmediatePropagation();
  },true);

  const sprayer=new THREE.Group();
  function piece(geometry,color,x,y,z){
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color}));
    mesh.position.set(x,y,z);sprayer.add(mesh);return mesh;
  }
  piece(new THREE.SphereGeometry(.18,20,14),'#c5b4e4',0,0,0).scale.set(.8,1.35,.8);
  piece(new THREE.CylinderGeometry(.08,.09,.11,16),'#eee1cf',0,.23,0);
  piece(new THREE.BoxGeometry(.22,.10,.13),'#b5a1d5',-.045,.31,0);
  piece(new THREE.BoxGeometry(.055,.064,.12),'#e5c49f',-.17,.31,0);
  sprayer.visible=false;room.add(sprayer);
  const drops=Array.from({length:24},()=>{
    const drop=new THREE.Mesh(new THREE.SphereGeometry(.026,8,6),new THREE.MeshBasicMaterial({color:'#b8e7f3',transparent:true,opacity:.8}));
    drop.visible=false;room.add(drop);return drop;
  });
  const spray=document.createElement('button');spray.type='button';spray.className='tea-cup-drink';
  spray.textContent='喷喷水';spray.hidden=true;canvas.parentElement.append(spray);
  let selected=null,elapsed=-1;
  const projected=new THREE.Vector3();
  function hideSprayer(){sprayer.visible=false;spray.hidden=true;if(elapsed<0)selected=null;}
  spray.onclick=()=>{
    if(!selected||elapsed>=0)return;
    elapsed=0;spray.hidden=true;mistSound();
    notify('咕噜咕噜，叶子喝饱啦。');
  };
  return {
    showPlant(id){
      if(elapsed>=0)return;
      selected=plants.get(id);
      sprayer.position.copy(selected.position).add(new THREE.Vector3(.52,.62,.12));
      sprayer.visible=true;spray.hidden=false;
      roomSound('sparkle');
    },
    hideSprayer,
    update(delta,reduced){
      if(!selected)return;
      if(!spray.hidden){
        projected.copy(sprayer.position);room.localToWorld(projected);projected.project(camera);
        const {width,height}=canvas.getBoundingClientRect();
        spray.style.left=`${THREE.MathUtils.clamp((projected.x+1)*width/2,50,width-50)}px`;
        spray.style.top=`${THREE.MathUtils.clamp((1-projected.y)*height/2-28,58,height-50)}px`;
      }
      if(elapsed<0)return;
      elapsed+=delta;
      drops.forEach((drop,i)=>{
        const t=(elapsed-i*.014)/.48;
        drop.visible=t>0&&t<1;
        if(drop.visible){
          drop.position.copy(sprayer.position).add(new THREE.Vector3(-.17,.31,0));
          drop.position.lerp(selected.position,t);
          drop.position.y+=Math.sin(t*Math.PI)*.16;
          drop.position.z+=Math.sin(i*2.4)*.15*t;
        }
      });
      if(!reduced)selected.rotation.z=Math.sin(elapsed*27)*.075*Math.max(0,1-elapsed);
      if(elapsed>=.95){selected.rotation.z=0;elapsed=-1;hideSprayer();}
    },
  };
}
