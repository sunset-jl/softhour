import * as THREE from 'three';
export function installOpenStorage(room){
 const keepsakes = new Map();
 const roundCushion = new THREE.Group();
 const plants = new Map();
 let comfortMachine;
 const source=room.getObjectByName('room'),g=source.geometry,parts=[],removed=new Set(),colored=[];
 function extract(a,b,action,pivot){
  const ids=[];for(const id of g.index.array)if(id>=a&&id<=b){ids.push(id);removed.add(id);}
  const geo=new THREE.BufferGeometry();for(const [key,attr] of Object.entries(g.attributes)){const data=new attr.array.constructor(ids.length*attr.itemSize);ids.forEach((id,j)=>{for(let k=0;k<attr.itemSize;k++)data[j*attr.itemSize+k]=attr.array[id*attr.itemSize+k];});geo.setAttribute(key,new THREE.BufferAttribute(data,attr.itemSize,attr.normalized));}
  // Movable pieces get their own tint, so their night color is reliable even
  // when Three.js recompiles the shared room shader after geometry changes.
  const material=source.material.clone();
  const mesh=new THREE.Mesh(geo,material);mesh.userData.action=action;pivot.add(mesh);
  colored.push({material,day:material.color.clone(),night:material.color.clone().multiply(new THREE.Color(action==='storageBox0'?'#aab4cc':'#46516e'))});
  return mesh;
 }
 function part(parent,geometry,x,y,z,color,nightTint='#46516e'){
  const material = new THREE.MeshBasicMaterial({color});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x,y,z);
  parent.add(mesh);
  colored.push({material,day:new THREE.Color(color),night:new THREE.Color(color).multiply(new THREE.Color(nightTint))});
  return mesh;
 }
 function box(parent,w,h,d,x,y,z,color,nightTint){
  return part(parent,new THREE.BoxGeometry(w,h,d),x,y,z,color,nightTint);
 }
 function fillDrawer(tray, index, x, floor){
  if(index === 2) return null;
  const props = new THREE.Group();
  props.position.set(x, floor, -2.96);
  tray.add(props);

  if(index === 0){
   // Rounded lilac base, glass globe, and a centered capsule outlet.
   props.rotation.y = -.08;
   const baseProfile=[[0,0],[.117,0],[.132,.008],[.136,.025],[.125,.074],[.106,.098],[0,.098]];
   part(props,new THREE.LatheGeometry(baseProfile.map(([radius,y])=>new THREE.Vector2(radius,y)),32),0,0,0,'#c5a9da');
   const globe=part(props,new THREE.SphereGeometry(.113,32,20),0,.181,0,'#e7d9f4');
   globe.material.transparent=true;globe.material.opacity=.29;globe.material.depthWrite=false;
   for(const [x,y,z,color] of [[-.05,.151,.034,'#e8aabb'],[.046,.153,.037,'#b9b5ea'],[0,.199,.044,'#f5ce81'],[.048,.186,-.041,'#b4d0b8']]){
    part(props,new THREE.SphereGeometry(.041,20,12),x,y,z,color);
   }
   part(props,new THREE.CylinderGeometry(.067,.083,.014,24),0,.277,0,'#baa0ce');
   const mouth=part(props,new THREE.SphereGeometry(.043,20,12),0,.041,.126,'#705589');
   mouth.scale.set(1,.51,.24);
   const crank=part(props,new THREE.CylinderGeometry(.022,.022,.019,16),.068,.063,.114,'#edc686');
   crank.rotation.x=Math.PI/2;
   comfortMachine=props;
  }else if(index === 1){
   // Rest the camera on its back so the lens is visible from above.
   props.rotation.y = -.17;
   box(props,.39,.076,.235,0,.038,0,'#d6b3c9');
   box(props,.39,.012,.235,0,.082,0,'#f3dfc4');
   const lens = (radius,height,y,color) =>
    part(props,new THREE.CylinderGeometry(radius,radius,height,24),.015,y,.008,color);
   lens(.091,.034,.105,'#87708f');
   lens(.071,.015,.127,'#544962');
   lens(.049,.007,.137,'#7586a0');
   box(props,.062,.009,.032,-.13,.092,-.066,'#fff1d9');
   box(props,.025,.010,.023,.141,.093,-.066,'#be777e');
  }else if(index === 3){
   // Two letters, slightly offset, with a rose-colored seal on top.
   box(props,.35,.018,.23,-.045,.009,.015,'#c9b5d4').rotation.y = -.16;
   const letter = new THREE.Group();
   letter.position.set(.035,.018,-.025);
   letter.rotation.y = .19;
   props.add(letter);
   box(letter,.35,.019,.23,0,.0095,0,'#f3e3c7');
   box(letter,.19,.004,.009,-.078,.020,-.014,'#d0b59a').rotation.y = -.43;
   box(letter,.19,.004,.009,.078,.020,-.014,'#d0b59a').rotation.y = .43;
   box(letter,.048,.008,.048,0,.024,.021,'#be818d').rotation.y = Math.PI/4;
  }else if(index === 4){
   // A lavender notebook with cream page edges and a small cover label.
   props.rotation.y = -.16;
   box(props,.30,.013,.29,0,.0065,0,'#a999c2');
   box(props,.28,.043,.27,0,.0345,0,'#eee0c1');
   box(props,.30,.013,.29,0,.0625,0,'#bcaad7');
   box(props,.022,.056,.29,-.14,.034,0,'#9d8cb7');
   box(props,.105,.004,.063,.026,.071,-.025,'#f1ddbd');
  }else{
   // Two pastel pencils and an eraser.
   const pencils = new THREE.Group();
   pencils.rotation.y = .35;
   props.add(pencils);
   for(const [offset,color] of [[-.038,'#94ac9a'],[.038,'#cfa2b2']]){
    box(pencils,.27,.028,.028,-.035,.014,offset,color);
    box(pencils,.045,.024,.024,.122,.014,offset,'#e5c69f');
    box(pencils,.015,.015,.015,.151,.014,offset,'#887477');
   }
   box(props,.10,.038,.059,.15,.019,.08,'#e0abb7').rotation.y = -.22;
  }
  return props;
 }
 for(let i=0;i<6;i++){
  const action='drawer'+i,pivot=new THREE.Group();room.add(pivot);extract(158619+i*210,158828+i*210,action,pivot);
  const x=.01+(i%3)*.75,y=.24+Math.floor(i/3)*.41;
  const tray=new THREE.Group();pivot.add(tray);box(tray,.65,.035,.65,x,y+.025,-3.08,'#d5ba87');box(tray,.035,.29,.65,x-.31,y+.16,-3.08,'#e5cda0');box(tray,.035,.29,.65,x+.31,y+.16,-3.08,'#e5cda0');box(tray,.65,.29,.035,x,y+.16,-3.4,'#d9c092');
  const props=fillDrawer(tray,i,x,y+.0425);
  tray.traverse(o=>{if(o.isMesh)o.userData.action=action;});
  if (i === 0) props.traverse(object => { if (object.isMesh) object.userData.action = 'comfortMachine'; });
  if (i === 1) props.traverse(object => { if (object.isMesh) object.userData.action = 'drawerCamera'; });
  if (props && (i === 3 || i === 4)) {
   const id = i === 3 ? 'arrangeLetter' : 'arrangeNotebook';
   const item = { group: props, home: tray, position: props.position.clone(), pivot };
   props.traverse(object => { if (object.isMesh) object.userData.action = id; });
   keepsakes.set(id, item);
  }
  parts.push({pivot,action,open:false,kind:'drawer'});
 }
 for(let i=0;i<2;i++){
  const action='storageBox'+i,pivot=new THREE.Group(),x=i?4.44:3.34,y=i?3.55:3.58,z=i?-3.82:-3.87;room.add(pivot);
  const lid=extract(i?166591:166303,i?166686:166398,action,pivot);lid.geometry.translate(-x,-y,-z);pivot.position.set(x,y,z);
  if(i===0){
   // Keep the original lid shape, but replace its dark painted vertex colors.
   const colors=lid.geometry.getAttribute('COLOR_0')||lid.geometry.getAttribute('color');
   if(colors){const lighter=new THREE.Color('#d4c5ad');for(let v=0;v<colors.count;v++)colors.setXYZ(v,lighter.r,lighter.g,lighter.b);colors.needsUpdate=true;}
  }
  // Remove the solid body and replace it with an open container.
  const a=i?166495:166207,b=i?166590:166302;for(const id of g.index.array)if(id>=a&&id<=b)removed.add(id);
  const body=new THREE.Group();room.add(body);const color=i?'#ddc8cd':'#cbb99e',cy=3.19,cx=i?4.44:3.34,cz=i?-3.41:-3.48;
  const inside=i?'#927b94':'#a99a8d',tint=i?'#46516e':'#929eb8';
  box(body,.92,.035,.72,cx,cy,cz,inside,tint);
  box(body,.035,.37,.72,cx-.44,cy+.20,cz,color,tint);box(body,.035,.37,.72,cx+.44,cy+.20,cz,color,tint);
  box(body,.92,.37,.035,cx,cy+.20,cz-.34,color,tint);box(body,.92,.37,.035,cx,cy+.20,cz+.34,color,tint);
  // The darker inner panels make the open top read as a hollow container.
  box(body,.85,.31,.008,cx,cy+.205,cz-.318,inside,tint);box(body,.85,.31,.008,cx,cy+.205,cz+.318,inside,tint);
  box(body,.008,.31,.63,cx-.416,cy+.205,cz,inside,tint);box(body,.008,.31,.63,cx+.416,cy+.205,cz,inside,tint);
  if(i===1){
   const key=new THREE.Group();key.position.set(cx,cy+.017,cz);key.rotation.y=-.28;body.add(key);
   const ring=part(key,new THREE.TorusGeometry(.105,.025,10,30),-.16,.025,0,'#eab75f');
   ring.rotation.x=-Math.PI/2;
   box(key,.32,.038,.043,.074,.025,0,'#dba34c');
   box(key,.044,.038,.083,.17,.025,.027,'#eab75f');
   box(key,.046,.038,.10,.23,.025,.034,'#eab75f');
   key.traverse(object=>{if(object.isMesh)object.userData.action='goldKey';});
  }
  body.traverse(o=>{if(o.isMesh&&!o.userData.action)o.userData.action=action;});parts.push({pivot,action,open:false,kind:'lid'});
 }
 room.add(roundCushion);
 extract(215404,220109,'pillow',roundCushion);
 for(const [id,base,first,top,last,position] of [
  ['plantWindow',220110,220653,220654,222445,[-4.99,1.73,1.42]],
  ['plantDesk',222446,222989,222990,224781,[-2.98,1.71,-3.48]],
  ['plantShelf',224782,225325,225326,233497,[-1.56,3.82,-3.94]],
 ]){
  const pot=new THREE.Group(),leaves=new THREE.Group();
  room.add(pot,leaves);
  extract(base,first,id,pot);
  const leaf=extract(top,last,id,leaves);
  leaves.position.set(...position);
  leaf.geometry.translate(...position.map(value=>-value));
  plants.set(id,leaves);
 }
 // Remove the small decorative purple block in front of the drawers.
 for(const id of g.index.array)if(id>=159879&&id<=160070)removed.add(id);
 const keep=[];for(let i=0;i<g.index.count;i+=3)if(!removed.has(g.index.array[i]))keep.push(g.index.array[i],g.index.array[i+1],g.index.array[i+2]);g.setIndex(keep);
 return {keepsakes,roundCushion,plants,comfortMachine,
  isOpen(action){return parts.some(part=>part.action===action&&part.open);},
  toggle(action){const p=parts.find(p=>p.action===action);if(p)p.open=!p.open;},
  setNight(amount){for(const c of colored)c.material.color.lerpColors(c.day,c.night,amount);},
  update(dt,reduced){for(const p of parts){const target=p.open?(p.kind==='drawer'?.66:-1.65):0;if(p.kind==='drawer')p.pivot.position.z=reduced?target:THREE.MathUtils.damp(p.pivot.position.z,target,9,dt);else p.pivot.rotation.x=reduced?target:THREE.MathUtils.damp(p.pivot.rotation.x,target,9,dt);}}
 };
}
