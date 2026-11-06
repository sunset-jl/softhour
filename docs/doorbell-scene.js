import * as THREE from 'three';
import { doorbellState } from './doorbell-presence.js?v=1';

export function installDoorbell(room, camera, area){
  const mount = new THREE.Group();
  mount.name = 'Window doorbell';
  mount.position.set(-5.19,3.02,3.74);
  mount.rotation.y = Math.PI / 2;
  mount.userData.action = 'doorbell';
  room.add(mount);

  function piece(parent,geometry,color,x,y,z){
    const tint = new THREE.Color(color);
    const colors = new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3)tint.toArray(colors,i);
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const mesh = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true}));
    mesh.position.set(x,y,z);
    parent.add(mesh);
    return mesh;
  }
  piece(mount,new THREE.BoxGeometry(.38,.47,.058),'#d6b58d',0,-.12,0);
  piece(mount,new THREE.CylinderGeometry(.042,.042,.19,12),'#8c6a63',0,0,.115).rotation.x=Math.PI/2;
  const swing = new THREE.Group();
  swing.position.set(0,0,.205);
  mount.add(swing);
  piece(swing,new THREE.SphereGeometry(.052,12,8),'#e8bd76',0,-.025,0);
  const profile = [[.023,.0],[.068,-.02],[.107,-.07],[.12,-.16],[.169,-.215],[.168,-.236],[.139,-.23],[.099,-.171],[.082,-.088],[.022,-.021]];
  piece(swing,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),24),'#c7a1ce',0,-.047,0);
  piece(swing,new THREE.TorusGeometry(.154,.018,8,24),'#f4d08d',0,-.282,0).rotation.x=Math.PI/2;
  piece(swing,new THREE.SphereGeometry(.041,12,8),'#d7a86b',0,-.305,0);

  const marker = document.createElement('div');
  marker.className='doorbell-marker';
  marker.hidden=true;
  marker.innerHTML='<span class="doorbell-star" aria-label="J 和 K 都在小屋里" role="img">✦</span><span class="doorbell-paper" role="status" hidden></span>';
  area.append(marker);
  const paper = marker.querySelector('.doorbell-paper');
  const projected = new THREE.Vector3();
  return {
    update(reduced){
      const state=doorbellState();
      const ringing=Math.max(0,state.ringUntil-performance.now())/750;
      swing.rotation.z=reduced?0:Math.sin((1-ringing)*Math.PI*7)*.23*ringing;
      marker.hidden=!state.together;
      if(!state.together)return;
      const fresh=state.arrivalAt!==0&&Date.now()-state.arrivalAt<4500;
      paper.hidden=!fresh;
      if(fresh&&!paper.textContent)paper.textContent='你等的人，刚刚到了。✦';
      else if(!fresh&&paper.textContent)paper.textContent='';
      projected.set(0,.13,.25);
      mount.localToWorld(projected).project(camera);
      const width=area.clientWidth,height=area.clientHeight,edge=Math.min(108,width/2);
      marker.style.left=`${THREE.MathUtils.clamp((projected.x+1)*width/2,edge,width-edge)}px`;
      marker.style.top=`${THREE.MathUtils.clamp((1-projected.y)*height/2,90,Math.max(90,height-50))}px`;
    },
  };
}
