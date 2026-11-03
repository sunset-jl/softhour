import * as THREE from 'three';

export function installCoffeeMachine(room,meshes){
 const root=new THREE.Group();root.name='Coffee machine';room.add(root);
 const colors=[];
 const material=(day,night)=>{const m=new THREE.MeshBasicMaterial({color:day});colors.push({m,day:new THREE.Color(day),night:new THREE.Color(night)});return m;};
 const cream=material('#f4e8d2','#66728a'),blue=material('#a9c4d6','#506786'),wood=material('#bb8b61','#63526a'),gold=material('#c8a773','#79718b'),dark=material('#736c7b','#3c455e');
 function part(g,m,x,y,z,action='coffeeMachine'){const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.userData.action=action;root.add(mesh);meshes.push(mesh);return mesh;}
 function block(w,h,d,m,x,y,z){return part(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
 const cx=1.84,cz=-3.43,base=1.198,spoutX=.95,spoutZ=-3.40;
 for(const name of ['cupJ','cupK']){const old=room.getObjectByName(name);if(old){old.visible=false;const i=meshes.indexOf(old);if(i>=0)meshes.splice(i,1);}}
 const glass=new THREE.MeshBasicMaterial({color:'#e9f3f4',transparent:true,opacity:.27,depthWrite:false,side:THREE.DoubleSide});
 const edge=new THREE.MeshBasicMaterial({color:'#f8ffff',transparent:true,opacity:.78,depthWrite:false});
 const machineStart=meshes.length;
 block(.68,.65,.51,cream,cx,1.74,cz-.08);
 block(.61,.31,.035,blue,cx,1.88,cz+.195);
 block(.74,.065,.58,cream,cx,1.39,cz-.05);
 block(.47,.025,.35,dark,cx-.23,1.43,cz+.18);
 block(.22,.045,.33,gold,cx-.28,2.10,cz-.05);
 part(new THREE.CylinderGeometry(.064,.064,.15,16),wood,cx+.1,2.19,cz-.05);
 block(.92,.09,.12,cream,cx-.44,1.91,cz+.03);
 part(new THREE.CylinderGeometry(.043,.035,.15,12),gold,spoutX,1.80,spoutZ);
 for(const x of [cx-.13,cx+.13]){part(new THREE.CylinderGeometry(.055,.055,.018,16),gold,x,1.90,cz+.224).rotation.x=Math.PI/2;}
 part(new THREE.CylinderGeometry(.026,.026,.02,12),wood,cx-.13,1.90,cz+.239).rotation.x=Math.PI/2;
 part(new THREE.SphereGeometry(.027,10,8),wood,cx+.13,1.90,cz+.239);
 block(.065,.31,.08,wood,cx+.385,1.78,cz+.04);
 part(new THREE.SphereGeometry(.068,12,10),wood,cx+.385,1.98,cz+.04);
 for(const mesh of meshes.slice(machineStart))mesh.position.y-=.14;
 const stream=part(new THREE.CylinderGeometry(.018,.012,.28,12),new THREE.MeshBasicMaterial({color:'#d5aa84'}),spoutX,1.50,spoutZ);
 stream.visible=false;
 // Keep both glasses to the right of the record player (its right edge is near x=0).
 const homes=[{x:.68,z:-3.40},{x:.36,z:-3.40}];
 const cups=homes.map((home,index)=>{
  const action=index?'teaCupK':'teaCupJ',group=new THREE.Group();group.position.set(home.x,base,home.z);root.add(group);
  function cupPart(g,m,y,z=0){const obj=new THREE.Mesh(g,m);obj.position.set(0,y,z);obj.userData.action=action;group.add(obj);meshes.push(obj);return obj;}
  cupPart(new THREE.CylinderGeometry(.127,.112,.25,32,1,true),glass,.125).name=index?'glassCupK':'glassCupJ';
  cupPart(new THREE.CylinderGeometry(.112,.112,.014,32),edge,.008);
  cupPart(new THREE.TorusGeometry(.127,.009,8,32),edge,.25).rotation.x=Math.PI/2;
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=72;const c=canvas.getContext('2d');c.fillStyle='#faf4e8';c.fillRect(3,3,122,66);c.strokeStyle='#c7abb8';c.lineWidth=4;c.strokeRect(3,3,122,66);c.fillStyle='#79637d';c.textAlign='center';c.textBaseline='middle';c.font='bold 44px Georgia';c.fillText(index?'K':'J',64,37);
  cupPart(new THREE.PlaneGeometry(.14,.079),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,side:THREE.DoubleSide,depthWrite:false}),.135,.13);
  const tea=cupPart(new THREE.CylinderGeometry(.108,.10,.17,32),new THREE.MeshBasicMaterial({color:'#d5aa84'}),.095);tea.visible=false;
  const foam=cupPart(new THREE.CylinderGeometry(.105,.105,.007,32),material('#fff0cf','#c9b9d6'),.183);foam.visible=false;
  const shadow=new THREE.Mesh(new THREE.CircleGeometry(.15,32),new THREE.MeshBasicMaterial({color:'#6b5d74',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));shadow.rotation.x=-Math.PI/2;shadow.position.set(home.x,base-.004,home.z);root.add(shadow);
  const spillMat=new THREE.MeshBasicMaterial({color:'#b9895d',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
  const flow=new THREE.Mesh(new THREE.CylinderGeometry(.012,.025,.21,12),spillMat);flow.visible=false;root.add(flow);
  const puddle=new THREE.Mesh(new THREE.CircleGeometry(.15,32),spillMat.clone());puddle.rotation.x=-Math.PI/2;puddle.visible=false;root.add(puddle);
  return {group,shadow,tea,foam,flow,puddle,home,docked:false,pouring:0,spilling:0,drinking:0,filled:false,drinkColor:new THREE.Color('#d5aa84')};
 });
 let night=0;
 function position(index,x,z){const cup=cups[index];cup.group.position.set(x,base,z);cup.shadow.position.set(x,base-.004,z);cup.flow.position.set(x+(index?-.15:.15),base+.11,z);cup.puddle.position.set(x+(index?-.22:.22),base+.003,z);}
 function clearCup(cup){cup.tea.visible=false;cup.foam.visible=false;cup.filled=false;cup.pouring=0;cup.spilling=0;cup.drinking=0;cup.flow.visible=false;cup.puddle.visible=false;cup.group.rotation.z=0;}
 function clearOfOther(index,x,z){
  const other=cups[1-index].group.position,minGap=.29;
  let dx=x-other.x,dz=z-other.z,distance=Math.hypot(dx,dz);
  if(distance>=minGap)return {x,z};
  if(distance<.001){dx=index?-.01:.01;dz=0;distance=.01;}
  x=THREE.MathUtils.clamp(other.x+dx/distance*minGap,.33,1.2);
  z=THREE.MathUtils.clamp(other.z+dz/distance*minGap,-3.62,-3.25);
  if(Math.hypot(x-other.x,z-other.z)<minGap-.001){
   const choices=[{x:other.x-minGap,z:other.z},{x:other.x+minGap,z:other.z},{x:other.x,z:other.z-minGap},{x:other.x,z:other.z+minGap}]
    .filter(p=>p.x>=.33&&p.x<=1.2&&p.z>=-3.62&&p.z<=-3.25);
   choices.sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
   if(choices.length)return choices[0];
  }
  return {x,z};
 }
 function colorCup(cup){cup.tea.material.color.copy(cup.drinkColor).lerp(new THREE.Color('#716781'),night*.45);cup.flow.material.color.copy(cup.tea.material.color);cup.puddle.material.color.copy(cup.tea.material.color);}
 return {
  getPosition(index){return cups[index].group.position.clone();},
  isDocked(index){return cups[index].docked;},
  moveCup(index,x,z){const cup=cups[index],safe=clearOfOther(index,THREE.MathUtils.clamp(x,.33,1.2),THREE.MathUtils.clamp(z,-3.62,-3.25));position(index,safe.x,safe.z);cup.docked=false;stream.visible=false;},
  releaseCup(index){const cup=cups[index],p=cup.group.position,other=cups[1-index].group.position;if(Math.hypot(p.x-spoutX,p.z-spoutZ)<.24&&Math.hypot(other.x-spoutX,other.z-spoutZ)>=.29){position(index,spoutX,spoutZ);cup.docked=true;return true;}cup.docked=false;return false;},
  brew(value){const index=value?.cupIndex;if(index!==0&&index!==1||!cups[index].docked)return false;const cup=cups[index],palette={milkTea:'#d5aa84',coffee:'#805943',orangeJuice:'#eea646'};clearCup(cup);cup.drinkColor.set(palette[value.base]||palette.milkTea);colorCup(cup);cup.tea.visible=true;cup.tea.scale.y=.03;cup.tea.position.y=.02;cup.pouring=2.4;stream.visible=true;stream.material.color.copy(cup.tea.material.color);return true;},
  hasDrink(index){return cups[index].filled&&cups[index].pouring===0&&cups[index].spilling===0&&cups[index].drinking===0;},
  drink(index){if(!this.hasDrink(index))return false;const cup=cups[index];cup.drinking=1.35;cup.filled=false;cup.foam.visible=false;return true;},
  spill(index){if(!this.hasDrink(index))return false;const cup=cups[index];cup.spilling=.95;cup.flow.visible=true;cup.puddle.visible=true;return true;},
  setNight(amount){night=amount;for(const color of colors)color.m.color.lerpColors(color.day,color.night,amount);glass.color.lerpColors(new THREE.Color('#e9f3f4'),new THREE.Color('#9ba8bf'),amount);edge.color.lerpColors(new THREE.Color('#f8ffff'),new THREE.Color('#b6c3d8'),amount);for(const cup of cups)colorCup(cup);},
  update(dt){for(const cup of cups){if(cup.pouring>0){cup.pouring=Math.max(0,cup.pouring-dt);const progress=1-cup.pouring/2.4;cup.tea.scale.y=Math.max(.03,progress);cup.tea.position.y=.015+.085*cup.tea.scale.y;stream.visible=cup.pouring>.3;if(cup.pouring===0){cup.filled=true;stream.visible=false;}}if(cup.drinking>0){cup.drinking=Math.max(0,cup.drinking-dt);const level=cup.drinking/1.35;cup.tea.scale.y=Math.max(.01,level);cup.tea.position.y=.015+.085*cup.tea.scale.y;if(cup.drinking===0)cup.tea.visible=false;}if(cup.spilling>0){cup.spilling=Math.max(0,cup.spilling-dt);const progress=1-cup.spilling/.95;cup.tea.scale.y=Math.max(.01,1-progress);cup.group.rotation.z=(cups.indexOf(cup)?1:-1)*Math.sin(progress*Math.PI/2)*.72;cup.flow.material.opacity=Math.sin(progress*Math.PI)*.8;cup.puddle.material.opacity=Math.min(.6,progress*.6);cup.puddle.scale.setScalar(.2+progress*.8);if(cup.spilling===0){cup.tea.visible=false;cup.foam.visible=false;cup.flow.visible=false;cup.filled=false;}}}}
 };
}
