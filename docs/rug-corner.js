import * as THREE from 'three';

// The base, patchwork, binding, fringe and stitched flower share this range
// in the room mesh. Lift them together so the original fabric stays intact.
const firstRugVertex = 167089;
const lastRugVertex = 210964;
const crease = 5.16;
const hingeHeight = .135;
const diagonal = Math.SQRT1_2;

export function installRugCorner(room,onReveal){
  const source = room.getObjectByName('room');
  const geometry = new THREE.BufferGeometry();
  for(const [name,attribute] of Object.entries(source.geometry.attributes)){
    const start=firstRugVertex*attribute.itemSize;
    const end=(lastRugVertex+1)*attribute.itemSize;
    geometry.setAttribute(name,new THREE.BufferAttribute(attribute.array.slice(start,end),attribute.itemSize,attribute.normalized));
  }
  const rugIndices=[], remaining=[];
  const indices=source.geometry.index.array;
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i],b=indices[i+1],c=indices[i+2];
    if(Math.min(a,b,c)>=firstRugVertex&&Math.max(a,b,c)<=lastRugVertex)
      rugIndices.push(a-firstRugVertex,b-firstRugVertex,c-firstRugVertex);
    else remaining.push(a,b,c);
  }
  source.geometry.setIndex(remaining);
  geometry.setIndex(rugIndices);
  const fabric=new THREE.Mesh(geometry,source.material);
  fabric.name='Folding rug';
  fabric.userData.action='rugCorner';
  room.add(fabric);

  const position=geometry.getAttribute('position');
  position.setUsage(THREE.DynamicDrawUsage);
  const corner=[];
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    const distance=(x+z-crease)*diagonal;
    if(distance>0)corner.push({i,x,y,z,distance});
  }
  geometry.computeBoundingSphere();
  // Keep ray picking valid while the corner moves beyond the flat rug's bounds.
  geometry.boundingSphere.radius+=1.3;

  const slipper=new THREE.Group();
  slipper.name='Hidden slipper';
  slipper.position.set(2.52,.063,3.04);
  slipper.rotation.y=-.38;
  room.add(slipper);
  const finish=[];
  function oval(color,x,y,z,sx,sy,sz){
    const day=new THREE.Color(color);
    const material=new THREE.MeshBasicMaterial({color:day});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),material);
    mesh.position.set(x,y,z);
    mesh.scale.set(sx,sy,sz);
    mesh.raycast=()=>{};
    mesh.visible=false;
    slipper.add(mesh);
    finish.push({mesh,day,night:day.clone().multiply(new THREE.Color('#737b9d'))});
    return mesh;
  }
  oval('#917aa8',0,.031,0,.177,.036,.32);
  oval('#f2d7d8',0,.060,.021,.163,.027,.284);
  oval('#d4b9e9',0,.094,-.112,.168,.079,.183);
  oval('#f8e7c9',0,.167,-.125,.042,.011,.044);
  oval('#edc17f',0,.176,-.125,.021,.007,.021);

  let opened=false, progress=0, pendingReveal=false;
  return {
    get isOpen(){return opened;},
    toggle(){opened=!opened;pendingReveal=opened;return opened;},
    update(delta,reduced,night){
      const target=opened?1:0;
      if(progress!==target){
        const next=THREE.MathUtils.damp(progress,target,10,delta);
        progress=reduced||Math.abs(next-target)<.001?target:next;
        const angle=progress*1.91;
        const cos=Math.cos(angle),sin=Math.sin(angle);
        for(const {i,x,y,z,distance} of corner){
          const offset=(distance*cos-(y-hingeHeight)*sin-distance)*diagonal;
          position.setXYZ(i,x+offset,hingeHeight+distance*sin+(y-hingeHeight)*cos,z+offset);
        }
        position.needsUpdate=true;
      }
      for(const {mesh,day,night:shade} of finish){
        mesh.visible=progress>.51;
        if(mesh.visible)mesh.material.color.lerpColors(day,shade,night);
      }
      if(pendingReveal&&progress>=.96){pendingReveal=false;onReveal?.();}
    },
  };
}
