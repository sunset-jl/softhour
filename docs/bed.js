import * as THREE from 'three';
import {createWholePillow,dressPillow} from './whole-pillow.js';

// Vertex ranges identify the original quilt (including sewn flowers) and the complete bed pillow (upper and lower shells).
// Keep the original positions as the exact tidy pose; never accumulate deformation.
export async function prepareBed(room){
 const response=await fetch('./bed-parts.json');if(!response.ok)throw Error('Bed parts unavailable');
 const parts=await response.json(),source=room.getObjectByName('room'),g=source.geometry;
 const owners=new Map();for(const [name,ranges] of Object.entries(parts))for(const [a,b] of ranges)for(let i=a;i<=b;i++)owners.set(i,name);
 const buckets={room:[],quilt:[],bedPillow:[]},indices=g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i);
 for(let i=0;i<indices.length;i+=3){const name=owners.get(indices[i])||'room';buckets[name].push(indices[i],indices[i+1],indices[i+2]);}
 const result={};
 for(const name of ['quilt','bedPillow']){
  const geometry=new THREE.BufferGeometry();
  for(const [key,attr] of Object.entries(g.attributes)){const values=new attr.array.constructor(buckets[name].length*attr.itemSize);buckets[name].forEach((id,j)=>{for(let k=0;k<attr.itemSize;k++)values[j*attr.itemSize+k]=attr.array[id*attr.itemSize+k];});geometry.setAttribute(key,new THREE.BufferAttribute(values,attr.itemSize,attr.normalized));}
  const finalGeometry=name==='bedPillow'?createWholePillow(geometry):geometry;
  if(finalGeometry!==geometry)geometry.dispose();
  const mesh=new THREE.Mesh(finalGeometry,source.material.clone());mesh.name=name;if(name==='bedPillow')dressPillow(mesh);mesh.userData.action='bed';source.parent.add(mesh);result[name]=mesh;
 }
 g.setIndex(buckets.room);return result;
}

export function installBed(parts){
 const button=document.getElementById('bedButton'),status=document.getElementById('bedStatus');
 const quilt=parts.quilt,position=quilt.geometry.attributes.position,original=position.array.slice();
 const pillows=[parts.bedPillow].map(mesh=>{mesh.geometry.computeBoundingBox();const center=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());mesh.geometry.translate(-center.x,-center.y,-center.z);mesh.children.forEach(child=>child.geometry?.translate(-center.x,-center.y,-center.z));mesh.position.copy(center);return {mesh,center};});
 let progress=0,from=0,to=0,elapsed=0,animation=null;
 function start(target,kind){
  if(animation)return false;
  from=progress;to=target;elapsed=0;animation=kind;
  if(button){button.disabled=true;button.textContent=to?'正在闹腾…':'正在铺好…';}
  status.textContent=kind==='sleep'?'被子轻轻掀起来了。':to?'枕头蹦开了，被子也鼓起来啦。':'被子慢慢铺平，枕头回到原位。';
  return true;
 }
 function toggle(){return start(progress===0?1:0,'toggle');}
 function sleep(){return start(0,'sleep');}
 function pose(t,hop,lift){
  for(let i=0;i<original.length;i+=3){
   const x=original[i],y=original[i+1],z=original[i+2];
   const edge=THREE.MathUtils.smoothstep(y,.35,1.05),bump=Math.exp(-((x+3.2)**2*1.7+(z-.2)**2*.75));
   // The foot of the quilt rises higher, letting the cover billow toward the pillow.
   const foot=lift?THREE.MathUtils.smoothstep(z,-2.42,2.12):0;
   position.array[i]=x+t*.12*Math.sin(z*2)*edge-lift*.13*foot;
   position.array[i+1]=y+t*(.62*bump+.10*(1+Math.sin(z*5+x*2)))*edge+lift*(.74+.58*foot+.13*Math.sin((x+z)*2));
   position.array[i+2]=z+t*.18*Math.sin(x*3)*edge-lift*.28*foot;
  }
  position.needsUpdate=true;quilt.geometry.computeBoundingSphere();
  pillows.forEach(({mesh,center},i)=>{mesh.position.copy(center).add(new THREE.Vector3(.16*t,hop*.65+.14*t,.48*t));mesh.rotation.set(.12*t,.24*t,-.08*t);});
 }
 if(button){button.disabled=false;button.addEventListener('click',toggle);}
 return {toggle,sleep,update(dt,reduced){
  if(!animation)return;
  elapsed+=dt;
  const sleeping=animation==='sleep';
  const t=reduced?1:Math.min(1,elapsed/(sleeping?1.5:1.65));
  const ease=t*t*(3-2*t);
  const wave=t===1?0:Math.sin(Math.PI*t)**2;
  progress=from+(to-from)*ease;
  pose(progress,sleeping?0:wave*(to?1:.4),sleeping?wave:0);
  if(t===1){
   animation=null;
   if(button){button.disabled=false;button.textContent=to?'整理床铺':'一键乱床';button.setAttribute('aria-pressed',String(to===1));}
   status.textContent=sleeping?'被子盖好了。':to?'床铺乱好啦，再点一次就能整理。':'床铺已经整理好。';
   if(to===1&&document.body.classList.contains('is-night'))window.dispatchEvent(new CustomEvent('soft-hours:open',{detail:'bedPrank'}));
  }
 }};
}
