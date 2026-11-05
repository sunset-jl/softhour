import * as THREE from 'three';
export function prepareLittleThings(room){
 const cup=room.getObjectByName('cupJ');if(cup){const k=cup.clone();k.geometry=cup.geometry.clone();k.geometry.translate(2.25,0,.25);k.name='cupK';k.userData.action='presence';room.add(k);cup.userData.action='presence';}
 const geo=new THREE.BoxGeometry(.62,.045,.40),colors=[];for(let i=0;i<geo.attributes.position.count;i++)colors.push(.84,.73,.68);geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const envelope=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true}));envelope.name='futureEnvelope';envelope.userData.action='letters';envelope.position.set(-3.15,1.49,-2.86);envelope.rotation.y=.12;room.add(envelope);
 // Fold lines and wax seal sit on the envelope, using the same night material treatment.
 const sealGeo=new THREE.CylinderGeometry(.065,.065,.014,24),c=[];for(let i=0;i<sealGeo.attributes.position.count;i++)c.push(.58,.36,.46);sealGeo.setAttribute('color',new THREE.Float32BufferAttribute(c,3));const seal=new THREE.Mesh(sealGeo,new THREE.MeshBasicMaterial({vertexColors:true}));seal.position.y=.035;seal.userData.action='letters';envelope.add(seal);
 for(const sign of [-1,1]){const g=new THREE.BoxGeometry(.32,.005,.008),a=[];for(let i=0;i<g.attributes.position.count;i++)a.push(.64,.52,.57);g.setAttribute('color',new THREE.Float32BufferAttribute(a,3));const line=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true}));line.position.set(sign*.12,.025,.05);line.rotation.y=sign*-.6;line.userData.action='letters';envelope.add(line);}
 return envelope;
}
export function installLittleThings(room,envelope){
 const p=room.getObjectByName('pillow');let pivot=null,bounce=0,count=0,last=0,unread=false,time=0;const base=envelope.position.y;let online={J:false,K:false};
 if(p){p.geometry.computeBoundingBox();const center=p.geometry.boundingBox.getCenter(new THREE.Vector3());pivot=new THREE.Group();pivot.position.copy(center);p.geometry.translate(-center.x,-center.y,-center.z);p.parent.add(pivot);pivot.add(p);}
 const steam=[];for(const name of ['cupJ','cupK']){const cup=room.getObjectByName(name);if(!cup)continue;cup.geometry.computeBoundingBox();const b=cup.geometry.boundingBox,center=b.getCenter(new THREE.Vector3());for(let i=0;i<3;i++){const points=[];for(let j=0;j<16;j++)points.push(new THREE.Vector3(Math.sin(j*.5+i)*.022,j*.025,0));const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xeee4ee,transparent:true,opacity:0,depthWrite:false}));line.position.set(center.x+(i-1)*.065,b.max.y+.04,center.z);room.add(line);steam.push({line,cup,slot:name==='cupJ'?'J':'K',base:line.position.y,i});}}
 window.addEventListener('soft-hours:presence',e=>{online={J:false,K:false};const d=e.detail;if(d){d.members.forEach(m=>online[m.slot]=m.online);unread=d.letters.some(l=>!l.mine&&!l.opened&&l.unlock_at<=d.now);}else unread=false;});
 window.addEventListener('soft-hours:letters-read',()=>unread=false);
 const toast=document.createElement('div');toast.className='little-toast';toast.hidden=true;toast.setAttribute('role','status');document.body.append(toast);let hide;
 function tap(){bounce=1;const now=performance.now();count=now-last<3000?count+1:1;last=now;clearTimeout(hide);if(count>=3){count=0;toast.hidden=true;window.dispatchEvent(new CustomEvent('soft-hours:open',{detail:'pillow'}));}else{toast.textContent=count===1?'软软的，里面好像藏了什么…':'再轻轻碰一下？';toast.hidden=false;hide=setTimeout(()=>toast.hidden=true,2200);}}
 window.addEventListener('soft-hours:pillow',tap);
 return {tap,pillowPivot:pivot,update(dt,reduced){time+=dt;bounce=Math.max(0,bounce-dt*2.5);if(pivot){const wave=reduced?0:Math.sin((1-bounce)*Math.PI*4)*bounce;pivot.scale.set(1+wave*.08,1-wave*.2,1+wave*.08);}envelope.rotation.z=unread&&!reduced?Math.sin(time*2)*.025:0;envelope.position.y=base+(unread?.035:0);for(const s of steam){s.line.material.opacity=s.cup.visible&&online[s.slot]?.35:0;s.line.position.y=s.base+(reduced?0:(Math.sin(time*1.5+s.i)+1)*.04);}}};
}
