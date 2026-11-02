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
 const liquid=piece(new THREE.CylinderGeometry(.115,.115,.012,24),mat('#8b6048','#604764'),1.07,1.555,-3.40);
 liquid.userData.action='coffeeMachine';liquid.visible=false;
 const stream=piece(new THREE.CylinderGeometry(.019,.013,.24,12),mat('#a47653','#9e8298'),1.07,1.69,-3.40);
 stream.visible=false;
 const foam=piece(new THREE.CylinderGeometry(.108,.108,.007,32),mat('#fff0cf','#c9b9d6'),1.07,1.564,-3.40);foam.visible=false;
 const pearls=[];
 for(const [x,z] of [[-.055,-.034],[.03,-.052],[.065,.025],[-.018,.062]]){const pearl=piece(new THREE.SphereGeometry(.018,10,8),mat('#514151','#353149'),1.07+x,1.566,-3.40+z);pearl.visible=false;pearls.push(pearl);}
 const ink=document.createElement('canvas');ink.width=128;ink.height=128;
 const decoration=new THREE.Mesh(new THREE.PlaneGeometry(.15,.15),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(ink),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 decoration.rotation.x=-Math.PI/2;decoration.position.set(1.07,1.574,-3.40);decoration.visible=false;decoration.userData.action='coffeeMachine';root.add(decoration);meshes.push(decoration);
 function paintDecoration(symbol,light){const context=ink.getContext('2d');context.clearRect(0,0,128,128);context.fillStyle=light?'#a46f86':'#fff0d3';if(symbol==='paw'){for(const [x,y,r] of [[34,39,11],[57,28,11],[81,31,11],[101,45,10],[66,76,27]]){context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();}}else{context.textAlign='center';context.textBaseline='middle';context.font='bold 86px serif';context.fillText(symbol,64,65);}decoration.material.map.needsUpdate=true;}
 let pourTime=0,liquidDay=new THREE.Color('#8b6048');
 return {
  brew(value){
   const recipe=typeof value==='string'?{base:value,extras:[],decoration:'heart'}:value||{};
   const base=recipe.base==='milkTea'?'#d5aa84':recipe.base==='milk'?'#eee0c7':'#8b6048';
   liquidDay.set(base);if(recipe.extras?.includes('milk'))liquidDay.lerp(new THREE.Color('#f2dfc7'),.35);
   pourTime=2.7;liquid.visible=true;liquid.scale.setScalar(.12);stream.visible=true;
   const hasCream=recipe.extras?.includes('cream'),hasPearls=recipe.extras?.includes('pearls');foam.visible=false;pearls.forEach(pearl=>pearl.visible=false);decoration.visible=false;
   paintDecoration(recipe.decoration==='star'?'✦':recipe.decoration==='paw'?'paw':'♥',hasCream);
   this.setNight(document.body.classList.contains('is-night')?1:0);
   foam.userData.showAfterPour=hasCream;pearls.forEach(pearl=>pearl.userData.showAfterPour=hasPearls);
  },
  setNight(amount){for(const c of colored){if(c.material===liquid.material||c.material===stream.material)continue;c.material.color.lerpColors(c.day,c.night,amount);}liquid.material.color.copy(liquidDay).lerp(new THREE.Color('#716781'),amount*.45);stream.material.color.copy(liquid.material.color);},
  update(dt){if(pourTime<=0)return;pourTime=Math.max(0,pourTime-dt);const progress=1-pourTime/2.7;liquid.scale.set(Math.min(1,.12+progress*1.3),1,Math.min(1,.12+progress*1.3));stream.visible=pourTime>.45;stream.scale.y=.7+Math.sin(progress*20)*.06;if(pourTime===0){foam.visible=!!foam.userData.showAfterPour;pearls.forEach(pearl=>pearl.visible=!!pearl.userData.showAfterPour);decoration.visible=true;}}
 };
}
