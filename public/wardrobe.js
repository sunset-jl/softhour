import * as THREE from 'three';

export function installWardrobe(room) {
  const doors=[];
  room.traverse(mesh=>{
    const action=mesh.userData.action;
    if(mesh.isMesh && ['wardrobeDoorLeft','wardrobeDoorRight'].includes(action))doors.push({mesh,action});
  });
  for(const door of doors){
    const {mesh,action}=door;mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;
    const left=action==='wardrobeDoorLeft';
    const hinge=new THREE.Vector3(left?box.min.x:box.max.x,0,box.min.z+.04);
    const pivot=new THREE.Group();pivot.position.copy(hinge);room.add(pivot);
    mesh.geometry.translate(-hinge.x,-hinge.y,-hinge.z);pivot.add(mesh);
    door.pivot=pivot;door.sign=left?-1:1;door.target=0;
  }
  return {
    count:doors.length,
    isOpen(){return doors.some(d=>Math.abs(d.pivot.rotation.y)>.7);},
    open(){for(const d of doors)d.target=d.sign*Math.PI*.58;},
    toggle(){const shouldOpen=!doors.some(d=>d.target!==0);for(const door of doors)door.target=shouldOpen?door.sign*Math.PI*.58:0;},
    update(delta,reduced){for(const door of doors){door.pivot.rotation.y=reduced?door.target:THREE.MathUtils.damp(door.pivot.rotation.y,door.target,9,delta);if(Math.abs(door.pivot.rotation.y-door.target)<.0001)door.pivot.rotation.y=door.target;}}
  };
}
