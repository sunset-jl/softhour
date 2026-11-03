import * as THREE from 'three';

export function installCoffeeMachine(room,meshes){
 const root=new THREE.Group();root.name='Coffee machine';room.add(root);
 const colored=[];
 const mat=(day,night)=>{const material=new THREE.MeshBasicMaterial({color:day});colored.push({material,day:new THREE.Color(day),night:new THREE.Color(night)});return material;};
 const cream=mat('#f4e8d2','#66728a'),blue=mat('#a9c4d6','#506786'),wood=mat('#bb8b61','#63526a'),gold=mat('#c8a773','#79718b'),dark=mat('#736c7b','#3c455e');
 function piece(geometry,material,x,y,z){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.userData.action='coffeeMachine';root.add(mesh);meshes.push(mesh);return mesh;}
 function block(w,h,d,m,x,y,z){return piece(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
 function roundedBox(w,h,d,m,x,y,z){const s=new THREE.Shape(),r=.075;s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);const g=new THREE.ExtrudeGeometry(s,{depth:d-.06,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.03,bevelThickness:.03,curveSegments:4});g.translate(0,0,-d/2+.03);return piece(g,m,x,y,z);}
 const cx=1.84,cz=-3.43;
 // Replace the opaque Blender mugs with two open, translucent glass tumblers.
 for(const name of ['cupJ','cupK']){const old=room.getObjectByName(name);if(old){old.visible=false;const hit=meshes.indexOf(old);if(hit!==-1)meshes.splice(hit,1);}}
 const glass=new THREE.MeshBasicMaterial({color:'#e9f3f4',transparent:true,opacity:.27,depthWrite:false,side:THREE.DoubleSide});
 const glassEdge=new THREE.MeshBasicMaterial({color:'#f8ffff',transparent:true,opacity:.78,depthWrite:false});
 const cups=[1.07,.69].map((x,index)=>{
  const z=-3.40,base=1.228,height=.25;
  const contact=new THREE.Mesh(new THREE.CircleGeometry(.15,32),new THREE.MeshBasicMaterial({color:'#6b5d74',transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide}));contact.rotation.x=-Math.PI/2;contact.position.set(x,base-.004,z);root.add(contact);
  const group=new THREE.Group();group.position.set(x,base,z);root.add(group);
  const cupPart=(geometry,material,y,zOffset=0)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(0,y,zOffset);mesh.userData.action=index?'teaCupK':'teaCupJ';group.add(mesh);meshes.push(mesh);return mesh;};
  const shell=cupPart(new THREE.CylinderGeometry(.127,.112,height,32,1,true),glass,height/2);
  shell.name=index?'glassCupK':'glassCupJ';
  cupPart(new THREE.CylinderGeometry(.112,.112,.014,32),glassEdge,.008);
  const rim=cupPart(new THREE.TorusGeometry(.127,.009,8,32),glassEdge,height);rim.rotation.x=Math.PI/2;
  const labelCanvas=document.createElement('canvas');labelCanvas.width=128;labelCanvas.height=72;const labelInk=labelCanvas.getContext('2d');labelInk.fillStyle='#faf4e8';labelInk.fillRect(3,3,122,66);labelInk.strokeStyle='#c7abb8';labelInk.lineWidth=4;labelInk.strokeRect(3,3,122,66);labelInk.fillStyle='#79637d';labelInk.textAlign='center';labelInk.textBaseline='middle';labelInk.font='bold 44px Georgia';labelInk.fillText(index?'K':'J',64,37);
  cupPart(new THREE.PlaneGeometry(.14,.079),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(labelCanvas),transparent:true,side:THREE.DoubleSide,depthWrite:false}),.135,.13);
  return {x,z,base,height,group};
 });
 roundedBox(.68,.65,.51,cream,cx,1.74,cz-.08);
 block(.61,.31,.035,blue,cx,1.88,cz+.195);
 block(.74,.065,.58,cream,cx,1.39,cz-.05);
 block(.47,.025,.35,dark,cx-.23,1.43,cz+.18);
 block(.22,.045,.33,gold,cx-.28,2.10,cz-.05);
 piece(new THREE.CylinderGeometry(.064,.064,.15,16),wood,cx+.1,2.19,cz-.05);
 // A short horizontal arm brings the spout over the cup already on the cabinet.
 block(.79,.09,.12,cream,cx-.385,1.91,cz+.03);
 piece(new THREE.CylinderGeometry(.043,.035,.15,12),gold,1.07,1.80,-3.40);
 piece(new THREE.CylinderGeometry(.055,.055,.018,16),gold,cx-.13,1.90,cz+.224).rotation.x=Math.PI/2;
 piece(new THREE.CylinderGeometry(.055,.055,.018,16),gold,cx+.13,1.90,cz+.224).rotation.x=Math.PI/2;
 piece(new THREE.CylinderGeometry(.026,.026,.02,12),wood,cx-.13,1.90,cz+.239).rotation.x=Math.PI/2;
 piece(new THREE.SphereGeometry(.027,10,8),wood,cx+.13,1.90,cz+.239);
 block(.065,.31,.08,wood,cx+.385,1.78,cz+.04);
 piece(new THREE.SphereGeometry(.068,12,10),wood,cx+.385,1.98,cz+.04);
 // The existing right-hand cup stays in place; liquid appears inside it.
 // The cup's handle extends rightward; the bowl itself is centered at x=1.07.
 const liquid=piece(new THREE.CylinderGeometry(.108,.10,.17,32),mat('#8b6048','#604764'),cups[0].x,1.323,cups[0].z);
 liquid.userData.action='teaCupJ';liquid.visible=false;
 const liquidK=liquid.clone();liquidK.position.x=cups[1].x;liquidK.userData.action='teaCupK';root.add(liquidK);meshes.push(liquidK);
 const stream=piece(new THREE.CylinderGeometry(.019,.013,.40,12),mat('#a47653','#9e8298'),1.07,1.63,-3.40);
 stream.visible=false;
 const foam=piece(new THREE.CylinderGeometry(.105,.105,.007,32),mat('#fff0cf','#c9b9d6'),1.07,1.411,-3.40);foam.visible=false;
 const foamK=foam.clone();foamK.position.x=cups[1].x;root.add(foamK);meshes.push(foamK);
 const pearls=[];
 for(const [x,z] of [[-.055,-.034],[.03,-.052],[.065,.025],[-.018,.062]]){const pearl=piece(new THREE.SphereGeometry(.018,10,8),mat('#514151','#353149'),1.07+x,1.414,-3.40+z);pearl.visible=false;pearls.push(pearl);}
 const pearlsK=pearls.map(pearl=>{const copy=pearl.clone();copy.position.x+=cups[1].x-cups[0].x;root.add(copy);meshes.push(copy);return copy;});
 const ink=document.createElement('canvas');ink.width=128;ink.height=128;
 const decoration=new THREE.Mesh(new THREE.PlaneGeometry(.15,.15),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(ink),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 decoration.rotation.x=-Math.PI/2;decoration.position.set(1.07,1.424,-3.40);decoration.visible=false;decoration.userData.action='coffeeMachine';root.add(decoration);meshes.push(decoration);
 const decorationK=decoration.clone();decorationK.position.x=cups[1].x;root.add(decorationK);meshes.push(decorationK);
 function paintDecoration(symbol,light){const context=ink.getContext('2d');context.clearRect(0,0,128,128);context.fillStyle=light?'#a46f86':'#fff0d3';if(symbol==='paw'){for(const [x,y,r] of [[34,39,11],[57,28,11],[81,31,11],[101,45,10],[66,76,27]]){context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();}}else{context.textAlign='center';context.textBaseline='middle';context.font='bold 86px serif';context.fillText(symbol,64,65);}decoration.material.map.needsUpdate=true;}
 let pourTime=0,liquidDay=new THREE.Color('#8b6048');
 const spills=cups.map((cup,index)=>{const material=new THREE.MeshBasicMaterial({color:'#b9895d',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});const flow=new THREE.Mesh(new THREE.CylinderGeometry(.012,.025,.21,12),material);flow.rotation.z=index?-.55:.55;flow.position.set(cup.x+(index?-.15:.15),1.34,cup.z);flow.visible=false;root.add(flow);const puddle=new THREE.Mesh(new THREE.CircleGeometry(.15,32),material.clone());puddle.rotation.x=-Math.PI/2;puddle.position.set(cup.x+(index?-.22:.22),cup.base+.003,cup.z);puddle.visible=false;root.add(puddle);return {flow,puddle,time:0};});
 return {
  brew(value){
   const recipe=typeof value==='string'?{base:value,extras:[],decoration:'heart'}:value||{};
   const base=recipe.base==='jasmine'?'#b7bb88':recipe.base==='green'?'#91b579':recipe.base==='oolong'?'#b9895d':recipe.base==='black'?'#a56f56':recipe.base==='milkTea'?'#d5aa84':recipe.base==='milk'?'#eee0c7':'#8b6048';
   liquidDay.set(base);if(recipe.flavor==='peach')liquidDay.lerp(new THREE.Color('#f29c9f'),.82);if(recipe.flavor==='grape')liquidDay.lerp(new THREE.Color('#9374b9'),.82);if(recipe.flavor==='lemon')liquidDay.lerp(new THREE.Color('#e9d269'),.82);
   pourTime=2.7;for(const tea of [liquid,liquidK]){tea.visible=true;tea.scale.set(.94,.08,.94);tea.position.y=1.248;}stream.visible=true;
   const hasCream=recipe.extras?.includes('cream'),hasPearls=recipe.extras?.includes('pearls');foam.visible=foamK.visible=false;[...pearls,...pearlsK].forEach(pearl=>pearl.visible=false);decoration.visible=decorationK.visible=false;
   paintDecoration(recipe.flavor==='peach'?'♥':recipe.flavor==='grape'?'✦':recipe.flavor==='lemon'?'✿':'paw',hasCream);
   this.setNight(document.body.classList.contains('is-night')?1:0);
   foam.userData.showAfterPour=hasCream;[...pearls,...pearlsK].forEach(pearl=>pearl.userData.showAfterPour=hasPearls);
   for(const cup of cups)cup.group.rotation.z=0;
   for(const effect of spills){effect.time=0;effect.flow.visible=effect.puddle.visible=false;effect.flow.material.color.copy(liquidDay);effect.puddle.material.color.copy(liquidDay);}
  },
  hasDrink(index){return (index?liquidK:liquid).visible&&pourTime===0&&spills[index].time===0;},
  drink(index){const tea=index?liquidK:liquid;if(!this.hasDrink(index))return false;tea.visible=false;(index?foamK:foam).visible=false;(index?pearlsK:pearls).forEach(p=>p.visible=false);(index?decorationK:decoration).visible=false;return true;},
  spill(index){const tea=index?liquidK:liquid;if(!this.hasDrink(index))return false;spills[index].time=.95;spills[index].flow.visible=true;spills[index].puddle.visible=true;return true;},
  setNight(amount){for(const c of colored){if(c.material===liquid.material||c.material===stream.material)continue;c.material.color.lerpColors(c.day,c.night,amount);}glass.color.lerpColors(new THREE.Color('#e9f3f4'),new THREE.Color('#9ba8bf'),amount);glassEdge.color.lerpColors(new THREE.Color('#f8ffff'),new THREE.Color('#b6c3d8'),amount);liquid.material.color.copy(liquidDay).lerp(new THREE.Color('#716781'),amount*.45);stream.material.color.copy(liquid.material.color);},
  update(dt){if(pourTime>0){pourTime=Math.max(0,pourTime-dt);const progress=1-pourTime/2.7;for(const tea of [liquid,liquidK]){tea.scale.y=Math.max(.08,progress);tea.position.y=1.248+tea.scale.y*.075;}stream.visible=pourTime>.45;stream.scale.y=1+Math.sin(progress*20)*.04;if(pourTime===0){foam.visible=foamK.visible=!!foam.userData.showAfterPour;[...pearls,...pearlsK].forEach(pearl=>pearl.visible=!!pearl.userData.showAfterPour);decoration.visible=decorationK.visible=true;}}
   spills.forEach((effect,index)=>{if(effect.time<=0)return;effect.time=Math.max(0,effect.time-dt);const progress=1-effect.time/.95,tea=index?liquidK:liquid;tea.scale.y=Math.max(.01,1-progress);tea.position.y=1.248+tea.scale.y*.075;cups[index].group.rotation.z=(index?1:-1)*Math.sin(progress*Math.PI/2)*.72;effect.flow.material.opacity=Math.sin(progress*Math.PI)*.8;effect.puddle.material.opacity=Math.min(.6,progress*.6);effect.puddle.scale.setScalar(.2+progress*.8);if(effect.time===0){tea.visible=false;effect.flow.visible=false;(index?foamK:foam).visible=false;(index?pearlsK:pearls).forEach(p=>p.visible=false);(index?decorationK:decoration).visible=false;}});
  }
 };
}
