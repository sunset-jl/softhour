import {installOpenStorage} from './open-storage.js?v=capsule-draw-2';
import {installCoffeeMachine} from './coffee-machine.js?v=room-finds-2';
import {installArrangement} from './room-arrangement.js?v=room-finds-2';
import {prepareCat} from './cat.js';
import {removeLampPlants} from './remove-lamp-plants.js';
import {prepareBed,installBed} from './bed.js';
import {installSnowglobe} from './snowglobe.js?v=room-finds-2';
import {prepareLittleThings,installLittleThings} from './little-scene.js?v=room-finds-2';
import { installTurntable } from './turntable.js';
import { installWardrobe } from './wardrobe.js?v=together-1';
import { prepareWardrobeClothes } from './wardrobe-clothes.js';
import { installCurtains } from './curtains.js?v=room-finds-2';
import { meowSound, pourSound, sipSound, roomSound } from './room-sounds.js?v=room-finds-2';
import { installRoomProps } from './room-props.js?v=room-finds-2';
import { installRugCorner } from './rug-corner.js?v=3';
import { armSlapAudio, openRugRoachGame } from './rug-roach-game.js?v=1';
import { installDoorbell } from './doorbell-scene.js?v=3';
import { ringDoorbell } from './doorbell-presence.js?v=1';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';

const canvas = document.getElementById('roomCanvas');
const area = document.getElementById('sceneArea');
const loader = document.getElementById('sceneLoader');
const hoverLabel = document.getElementById('hoverLabel');
const zoomLevel = document.getElementById('zoomLevel');
const labels = {teaCupJ:'茶杯',teaCupK:'茶杯',coffeeMachine:'饮品机',drawer0:'抽屉',drawer1:'抽屉',drawer2:'抽屉',drawer3:'抽屉',drawer4:'抽屉',drawer5:'抽屉',storageBox0:'收纳箱',storageBox1:'收纳箱',cat: '小猫',wardrobeAlbum:'相册 · 翻看照片',bed:'床铺',pillow:'抱枕 · 轻轻碰一下',letters:'信封 · 未来来信',presence:'J & K · 两杯热茶', wardrobeDoorLeft: '左柜门 · 点击开合', wardrobeDoorRight: '右柜门 · 点击开合', curtainLeft: '窗帘 · 左右拖动开合', curtainRight: '窗帘 · 左右拖动开合', wardrobe: '衣柜 · 翻看照片', record: '唱片机 · 听听我们的声音', lamp: '台灯 · 切换昼夜', board: '公告板 · 收藏回忆' };

async function startRoom() {
  Object.assign(labels, { arrangeLetter: '信封 · 拖到桌面或窗台', arrangeNotebook: '笔记本 · 拖到桌面或窗台' });
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = false;
  // True two-point perspective: level camera, vertical lens shift, two finite horizontal vanishing points.
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 150);
  const target = new THREE.Vector3(0, 8.5, 0);
  const initialPosition = new THREE.Vector3(16, 8.5, 20);
  const initialDistance = initialPosition.distanceTo(target);
  let viewHeight = 15.6, compositionCenter = .56;
  const roomFocus = new THREE.Vector3(0, 1.68, 0);
  const viewFocus = new THREE.Vector3();
  function updateProjection() {
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    viewFocus.copy(roomFocus).applyMatrix4(camera.matrixWorldInverse);
    camera.projectionMatrix.elements[9] = camera.projectionMatrix.elements[5] * viewFocus.y / -viewFocus.z + (compositionCenter * 2 - 1);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }
  camera.position.copy(initialPosition); camera.lookAt(target);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableDamping = true; controls.dampingFactor = .1;
  controls.enablePan = false; controls.enableZoom = true;
  const roomMaxZoom = 4;
  controls.minZoom = .65; controls.maxZoom = roomMaxZoom; controls.zoomSpeed = .85;
  controls.minDistance = initialDistance; controls.maxDistance = initialDistance;
  controls.rotateSpeed = .5;
  controls.minPolarAngle = .35; controls.maxPolarAngle = 1.68;
  controls.minAzimuthAngle = -Infinity; controls.maxAzimuthAngle = Infinity;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  controls.update();
  const zoomIn = document.getElementById('zoomIn'), zoomOut = document.getElementById('zoomOut');
  function zoomStatus() {
    const zoom = camera.zoom;
    zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
    zoomIn.disabled = zoom >= controls.maxZoom - .001;
    zoomOut.disabled = zoom <= controls.minZoom + .001;
    updateProjection();
  }
  let wheelZoomTarget = null;
  function zoomBy(factor) {
    wheelZoomTarget = null;
    const nextZoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom);
    if (nextZoom !== camera.zoom) roomSound(factor > 1 ? 'zoomIn' : 'zoomOut');
    camera.zoom = nextZoom;
    zoomStatus();
  }
  // Adapt the bundled OrbitControls dolly hooks so wheel, pinch and middle-drag
  // use lens magnification, never moving the viewpoint toward the furniture.
  controls._dollyOut = factor => zoomBy(factor);
  controls._dollyIn = factor => zoomBy(1 / factor);
  controls._handleMouseWheel = ({ deltaY }) => {
    if (!deltaY) return;
    const wheelSensitivity = 2.5;
    const scale = controls._getZoomScale(deltaY * wheelSensitivity);
    const previousZoom = wheelZoomTarget ?? camera.zoom;
    wheelZoomTarget = THREE.MathUtils.clamp(
      previousZoom * (deltaY < 0 ? 1 / scale : scale),
      controls.minZoom, controls.maxZoom
    );
    if (wheelZoomTarget !== previousZoom) roomSound(deltaY < 0 ? 'zoomIn' : 'zoomOut');
  };
  controls.addEventListener('change', zoomStatus);
  zoomIn.addEventListener('click', () => zoomBy(1.15));
  zoomOut.addEventListener('click', () => zoomBy(1 / 1.15));
  let focusedItem=null, savedView=null, focusTween=null;
  function reset() {
    roomSound('reset');
    wheelZoomTarget = null;
    focusedItem=null; savedView=null; focusTween=null; controls.maxZoom=roomMaxZoom; controls.enabled=true; roomFocus.set(0,1.68,0);
    controls.enableDamping = false; controls.update();
    camera.position.copy(initialPosition); camera.zoom = 1;
    controls.target.copy(target); camera.updateProjectionMatrix(); controls.update();
    controls.enableDamping = true; zoomStatus();
  }
  window.addEventListener('soft-hours:reset-view', reset);
  canvas.addEventListener('keydown', event => {
    if (['+', '=', '-', '0'].includes(event.key)) {
      event.preventDefault(); event.key === '0' ? reset() : zoomBy(event.key === '-' ? 1 / 1.15 : 1.15);
    }
    if (event.key.startsWith('Arrow')) {
      roomSound('turn');
      event.preventDefault();
      const sphere = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      if (event.key === 'ArrowLeft') sphere.theta -= .1;
      if (event.key === 'ArrowRight') sphere.theta += .1;
      if (event.key === 'ArrowUp') sphere.phi -= .08;
      if (event.key === 'ArrowDown') sphere.phi += .08;
      sphere.phi = THREE.MathUtils.clamp(sphere.phi, controls.minPolarAngle, controls.maxPolarAngle);
      sphere.theta = THREE.MathUtils.clamp(sphere.theta, controls.minAzimuthAngle, controls.maxAzimuthAngle);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sphere)); controls.update();
    }
  });
  const gltf = await new GLTFLoader().loadAsync('./assets/soft-hours-room.glb', event => {
    loader.textContent = event.total ? `正在打开小屋… ${Math.min(100, Math.max(0, Math.round(event.loaded / event.total * 100)))}%` : '正在打开小屋…';
  });
  const room = gltf.scene; const meshes = []; const materials = [];
  room.scale.y = 1 / .92;
  const nightUniform = { value: document.body.classList.contains('is-night') ? 1 : 0 };
  let nightTarget = nightUniform.value;
  const curtainOpening = {value:new THREE.Vector2(-3.15,3.15)};
  removeLampPlants(room);
  const bedParts = await prepareBed(room);
  const cat = prepareCat(room);
  const catObject = room.getObjectByName('Cream kitten');
  const catWords = [
    '摸一下可以，两下要加罐头。','本喵正在上班，工作内容是躺着。','你刚刚点到我的可爱了。',
    '今天的烦恼，放这里，我压住了。','刚才跑那两步，消耗了三个罐头。','我没有偷懒，我在保存体力。',
    '你负责想念，我负责打盹。','别急，我的尾巴还没想好去哪。','这个房间有点小，刚好装下我的威风。',
    '听见了吗？那是罐头在呼唤我。','如果找不到我，就看看最舒服的地方。','今天也允许你摸摸我的头。',
    '我只是路过，顺便接受一下夸奖。','刚刚的飞奔，是给你看的表演。','你坐一会儿，我替你巡视小屋。',
    '小声一点，我正在和阳光聊天。','本喵的日程：巡逻、发呆、再巡逻。','你笑一下，我就假装没看见。',
    '不是我在等你，是这个房间在等你。','这个角落不错，暂时归我了。','今晚的月亮，闻起来像小鱼干。',
    '我宣布：现在是休息时间。','你来了？那我就再待一会儿。','喵。翻译一下：欢迎回来。'
  ];
  const catPlaceWords = {
    window:['正在监视一只很可疑的鸟。','窗外的云，今天走得比我还慢。','嘘，我快和那只鸟成为朋友了。'],
    high:['站得高，欠的罐头看得清。','这里视野不错，适合指挥全屋。','先别抱我，我还没巡视完。'],
    bed:['烤鱼女士禁止睡觉，本喵除外。','枕头已经被我预订了。','床铺检查完毕：适合打盹。'],
    rug:['这块地毯已被我征用了。','我和地毯的花纹，谁更可爱？','这里软软的，适合突然停下来。']
  };
  const catLandingWords=['喵！我刚刚飞起来了吗？','落地成功，罐头奖励在哪里？','这次着陆，我给自己满分。','人类，下次起飞记得先通知我。','呼，四只爪爪都还在。','我不是掉下来，是优雅地降落。','刚才那一下，算你陪我玩。','本喵宣布：地板也挺舒服。'];
  const catBubble=document.createElement('div');catBubble.className='cat-bubble';catBubble.hidden=true;catBubble.setAttribute('role','status');area.append(catBubble);
  let catBubbleUntil=0,lastCatWord='';
  function talkToCat(){
    meowSound();
    const y=catObject.position.y,x=catObject.position.x,z=catObject.position.z;
    const place=y>1.4?'window':y>.8?(x>0?'high':'bed'):z>1.3?'rug':null;
    const words=place?catPlaceWords[place]:catWords;
    const choices=words.filter(word=>word!==lastCatWord);
    const next=choices[Math.floor(Math.random()*choices.length)];
    lastCatWord=next;catBubble.textContent=next;catBubble.hidden=false;catBubbleUntil=performance.now()+3400;
  }
  function talkAfterLanding(){const choices=catLandingWords.filter(word=>word!==lastCatWord),next=choices[Math.floor(Math.random()*choices.length)];lastCatWord=next;catBubble.textContent=next;catBubble.hidden=false;catBubbleUntil=performance.now()+3400;}
  const envelope = prepareLittleThings(room);
  const doorbell = installDoorbell(room,camera,area);
  prepareWardrobeClothes(room);
  room.traverse(object => {
    if (!object.isMesh) return;
    const surfaceMap=object.material.map; object.material.dispose();
    object.material = new THREE.MeshBasicMaterial({ vertexColors: true, map: surfaceMap, side: THREE.DoubleSide });
    object.material.onBeforeCompile = shader => {
      shader.uniforms.uNight = nightUniform;
      shader.uniforms.uCurtainOpening = curtainOpening;
      shader.vertexShader = 'varying vec3 vRoomPosition;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvRoomPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = 'uniform float uNight; uniform vec2 uCurtainOpening; varying vec3 vRoomPosition;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float distanceFromWindow = max(0.0, vRoomPosition.x + 5.3);
        float windowY = vRoomPosition.y + distanceFromWindow * .52;
        float windowZ = vRoomPosition.z - distanceFromWindow * .18;
        float opening = smoothstep(1.5,1.75,windowY) * (1.0-smoothstep(3.8,4.1,windowY));
        opening *= 1.0-smoothstep(2.6,3.15,abs(windowZ));
        float mullions = smoothstep(.03,.14,abs(sin(windowZ * 1.904)));
        mullions *= smoothstep(.035,.15,abs(windowY-2.91));
        float curtainGap = max(0.0, uCurtainOpening.y-uCurtainOpening.x);
        float curtainMask = smoothstep(uCurtainOpening.x-.08,uCurtainOpening.x+.08,windowZ)
                          * (1.0-smoothstep(uCurtainOpening.y-.08,uCurtainOpening.y+.08,windowZ));
        float curtainTransmission = smoothstep(0.0,.35,curtainGap);
        float moon = opening * curtainMask * curtainTransmission * mix(.35,1.0,mullions) * exp(-distanceFromWindow*.16);
        vec3 nightColor = outgoingLight * vec3(.24,.30,.49) + vec3(.12,.20,.32) * moon;
        outgoingLight = mix(outgoingLight, nightColor, uNight);
        #include <opaque_fragment>
      `);
    };
    materials.push(object.material); meshes.push(object);
  });
  // The mural belongs to the outside of the back wall, so it follows the room
  // when visitors rotate it without covering the noticeboard on the inside.
  const muralTexture = await new THREE.TextureLoader().loadAsync('./assets/wall-mural.webp');
  muralTexture.colorSpace = THREE.SRGBColorSpace;
  const muralMaterial = new THREE.MeshBasicMaterial({
    map: muralTexture, transparent: true, opacity: .88,
    side: THREE.FrontSide, depthWrite: false, toneMapped: false
  });
  const muralDayColor = new THREE.Color(0xffffff), muralNightColor = new THREE.Color(0x52617e);
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(10.65, 3.85), muralMaterial);
  mural.rotation.y = Math.PI;
  mural.position.set(0, 2.08, -4.43);
  mural.renderOrder = 1;
  room.add(mural);
  scene.add(room);
  const bed = installBed(bedParts);
  const little = installLittleThings(room,envelope);
  window.dispatchEvent(new Event('soft-hours:things-ready'));
  const storage=installOpenStorage(room);
  const rug=installRugCorner(room,openRugRoachGame);
  const rugHint=document.createElement('button');
  rugHint.type='button';
  rugHint.className='rug-corner-hint';
  rugHint.textContent='敢不敢看看下面有什么？';
  rugHint.hidden=true;
  area.append(rugHint);
  const hintPoint=new THREE.Vector3();
  function positionRugHint(){
    room.localToWorld(hintPoint.set(2.75,.20,3.29)).project(camera);
    const width=area.clientWidth,height=area.clientHeight;
    const edge=Math.min(width/2,103);
    rugHint.style.left=`${THREE.MathUtils.clamp((hintPoint.x+1)*width/2,edge,width-edge)}px`;
    rugHint.style.top=`${THREE.MathUtils.clamp((1-hintPoint.y)*height/2,75,Math.max(75,height-25))}px`;
  }
  function tapRug(){
    if(!rug.isOpen&&rugHint.hidden){
      positionRugHint();rugHint.hidden=false;roomSound('page');return;
    }
    rugHint.hidden=true;
    if(rug.toggle())armSlapAudio();
    roomSound('fabric');
  }
  rugHint.onclick=tapRug;
  if (little.pillowPivot) storage.roundCushion.add(little.pillowPivot);
  room.traverse(o=>{if(o.isMesh&&!meshes.includes(o))meshes.push(o);});
  const wardrobe = installWardrobe(room);
  // Every album entry waits for physically open wardrobe doors.
  window.addEventListener('soft-hours:open',e=>{
    if(e.detail==='wardrobe'&&!wardrobe.isOpen()){
      e.stopImmediatePropagation();wardrobe.open();roomSound('door');
    }
  },true);
  const turntable = installTurntable(room);
  const coffeeMachine=installCoffeeMachine(room,meshes);
  window.addEventListener('soft-hours:brew', e => {
    if (coffeeMachine.brew(e.detail)) pourSound();
  });
  window.addEventListener('soft-hours:pillow', () => roomSound('pillow'));
  window.addEventListener('soft-hours:record-playback',e=>turntable.setPlaying(e.detail.playing));
  window.addEventListener('soft-hours:record-anchor',e=>{room.updateMatrixWorld(true);const p=turntable.anchor.project(camera),r=canvas.getBoundingClientRect();e.detail.x=r.left+(p.x+1)*r.width/2;e.detail.y=r.top+(1-p.y)*r.height/2;});
  const curtains = installCurtains({room,camera,canvas,controls,meshes,hoverLabel,shouldApproach:()=>focusedItem!=='curtains',onApproach:()=>approach('curtains')});
  curtainOpening.value.fromArray(curtains.lightOpening);
  const windowGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.35,2.45),new THREE.MeshBasicMaterial({color:0x92afd9,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  windowGlow.rotation.y = Math.PI/2; windowGlow.position.set(-5.48,2.58,.05); room.add(windowGlow);
  function nightMode(night) { nightTarget = night ? 1 : 0; }
  nightMode(document.body.classList.contains('is-night'));
  window.addEventListener('soft-hours:night', event => nightMode(event.detail));
  function category(action){return action==='curtainLeft'||action==='curtainRight'?'curtains':action==='coffeeMachine'?'coffeeMachine':action?.startsWith('drawer')?'drawers':action?.startsWith('storageBox')?'storageBoxes':action?.startsWith('wardrobe')?'wardrobe':action==='record'?'record':action==='letters'?'letters':null;}
  function moveView(to){
    wheelZoomTarget = null;
    controls.enableDamping=false; controls.update(); controls.enableDamping=true;
    focusTween={time:0,from:{position:camera.position.clone(),target:controls.target.clone(),focus:roomFocus.clone(),zoom:camera.zoom},to};
    controls.enabled=false; hoverLabel.hidden=true;
  }
  function approach(name, action){
    if(focusTween)return true;
    if(focusedItem===name)return false;
    if(!savedView)savedView={position:camera.position.clone(),target:controls.target.clone(),focus:roomFocus.clone(),zoom:camera.zoom};
    focusedItem=name; controls.maxZoom=3.5;
    roomSound('focus');
    room.updateMatrixWorld(true);
    const center=name==='curtains'?new THREE.Vector3(-5.15,2.55,0):name==='letters'?envelope.getWorldPosition(new THREE.Vector3()):name==='coffeeMachine'?new THREE.Vector3(1.55,1.75,-3.25):name==='wardrobe'?new THREE.Vector3(3.9,1.72,-3.1):name==='storageBoxes'?new THREE.Vector3(3.9,3.55,-3.45):name==='drawers'?new THREE.Vector3(.76,.85,-2.75):new THREE.Vector3(-.65,1.3,-3.15);
    const height=name==='storageBoxes'?28:action==='drawer0'?13:8.5;
    const aim=new THREE.Vector3(center.x,height,center.z);
    moveView({position:aim.clone().add(name==='curtains'?new THREE.Vector3(24.5,0,3):new THREE.Vector3(7,0,24.65)),target:aim,focus:center,zoom:name==='curtains'?2.35:name==='letters'?3.5:name==='coffeeMachine'?3.2:name==='drawers'||name==='storageBoxes'?Math.min(3.5,camera.aspect<.8?3.3:3.1):Math.min(3.5,Math.max(2.3,camera.aspect<.8?3.3:2.7))});
    return true;
  }
  function returnView(){if(!savedView||focusTween)return;const view=savedView;savedView=null;focusedItem=null;controls.maxZoom=roomMaxZoom;roomSound('reset');moveView(view);}
  function restoreRoomView() {
    if (!focusedItem && wheelZoomTarget === null && camera.zoom === 1 &&
        camera.position.equals(initialPosition) && controls.target.equals(target)) return;
    roomSound('reset');
    focusedItem = null;
    savedView = null;
    controls.maxZoom = roomMaxZoom;
    moveView({
      position: initialPosition,
      target,
      focus: new THREE.Vector3(0, 1.68, 0),
      zoom: 1,
    });
  }
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('modalShell').hidden)returnView();},true);
  window.addEventListener('soft-hours:approach',e=>{if(!approach(e.detail))window.dispatchEvent(new CustomEvent('soft-hours:open',{detail:e.detail}));});
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function hitAt(x, y) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((x - rect.left) / rect.width * 2 - 1, -(y - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    // Distinguish the empty background from non-interactive room surfaces.
    if (!hit) return undefined;
    let object = hit.object;
    while (object && !object.userData.action) object = object.parent;
    const action=object?.userData.action;
    if(action==='goldKey'&&!storage.isOpen('storageBox1'))return 'storageBox1';
    if(action==='comfortMachine'&&!storage.isOpen('drawer0'))return 'drawer0';
    return labels[action] ? action : null;
  }
  const reaction = document.createElement('div');
  reaction.className = 'little-toast';
  reaction.setAttribute('role', 'status');
  reaction.hidden = true;
  document.body.append(reaction);
  let reactionTimer;
  function notify(message) {
    clearTimeout(reactionTimer);
    reaction.textContent = message;
    reaction.hidden = false;
    reactionTimer = setTimeout(() => { reaction.hidden = true; }, 3300);
  }
  Object.assign(labels, {drawerCamera:'相机 · 拍照', comfortMachine:'抽奖机', goldKey:'金钥匙', doorbell:'窗边门铃', rugCorner:'地毯', plantWindow:'窗边植物', plantDesk:'桌边植物', plantShelf:'书架植物', arrangeNotebook:'记账本 · 点击打开', pillow:'拖动圆抱枕'});
  const roomProps = installRoomProps({
    room, camera, canvas, controls, hitAt, cushion: storage.roundCushion, plants: storage.plants,
    tapPillow: () => { little.tap(); roomSound('pillow'); }, notify,
  });
  window.addEventListener('soft-hours:camera-frame', event => {
    renderer.render(scene,camera);
    event.detail.frame=canvas;
  });
  window.addEventListener('soft-hours:comfort-preview', event => {
    const preview=event.detail;
    const crop=Math.min(canvas.width,canvas.height);
    if(!crop)return;
    const width=.177*canvas.width/crop,height=.177*canvas.height/crop;
    const previewCamera=new THREE.OrthographicCamera(-width,width,height,-height,.1,3);
    previewCamera.position.set(.09,.31,1.1);
    previewCamera.lookAt(0,.14,0);
    const previewScene=new THREE.Scene();
    const model=storage.comfortMachine.clone();
    model.position.set(0,0,0);
    model.rotation.y=.06;
    previewScene.add(model);
    try{
      renderer.render(previewScene,previewCamera);
      preview.getContext('2d').drawImage(canvas,(canvas.width-crop)/2,(canvas.height-crop)/2,crop,crop,0,0,preview.width,preview.height);
    }finally{
      renderer.render(scene,camera);
    }
  });
  const arrangement = installArrangement({
    room, camera, canvas, controls, keepsakes: storage.keepsakes, hitAt, coffeeMachine, notify,
  });
  let catDrag=null;
  const catPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  function dragPoint(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.ray.intersectPlane(catPlane,new THREE.Vector3());}
  canvas.addEventListener('pointerdown',e=>{
    if(catDrag||e.button!==0||hitAt(e.clientX,e.clientY)!=='cat')return;
    const world=catObject.getWorldPosition(new THREE.Vector3());catPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),world);const p=dragPoint(e);if(!p)return;
    cat.stop();catBubble.hidden=true;hoverLabel.hidden=true;
    catDrag={id:e.pointerId,x:e.clientX,y:e.clientY,offset:world.sub(p),enabled:controls.enabled,moved:false};controls.enabled=false;canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';e.preventDefault();e.stopImmediatePropagation();
  },true);
  canvas.addEventListener('pointermove',e=>{
    if(!catDrag||catDrag.id!==e.pointerId)return;
    if(!catDrag.moved&&Math.hypot(e.clientX-catDrag.x,e.clientY-catDrag.y)>6){catDrag.moved=true;meowSound();}
    if(catDrag.moved){cat.lift();const p=dragPoint(e);if(p){const local=room.worldToLocal(p.add(catDrag.offset));local.x=THREE.MathUtils.clamp(local.x,-4.2,4.2);local.z=THREE.MathUtils.clamp(local.z,-3.5,3.5);local.y=THREE.MathUtils.clamp(local.y,.035,5);catObject.position.copy(local);}}
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  function endCatDrag(e){if(!catDrag||catDrag.id!==e.pointerId)return;const d=catDrag;catDrag=null;controls.enabled=d.enabled;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);canvas.style.cursor='grab';if(d.moved){
      room.updateMatrixWorld(true);
      const origin=catObject.getWorldPosition(new THREE.Vector3());
      const downRay=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0));
      const surfaces=[];room.traverse(o=>{if(o.isMesh&&o.visible&&!catObject.getObjectById(o.id))surfaces.push(o);});
      const hit=downRay.intersectObjects(surfaces,false).find(h=>h.face&&h.face.normal.clone().transformDirection(h.object.matrixWorld).y>.65);
      const y=hit?room.worldToLocal(hit.point.clone()).y+.035:.035;cat.drop(Math.min(catObject.position.y,y));
    }else if(e.type==='pointerup'){talkToCat();cat.tap();}e.preventDefault();e.stopImmediatePropagation();}
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,endCatDrag,true);
  let cupDrag=null;
  const cupPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-room.localToWorld(new THREE.Vector3(0,1.198,0)).y);
  function cupPoint(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.ray.intersectPlane(cupPlane,new THREE.Vector3());}
  canvas.addEventListener('pointerdown',e=>{
    const action=hitAt(e.clientX,e.clientY);
    if(cupDrag||!e.isPrimary||!controls.enabled||e.button!==0||(action!=='teaCupJ'&&action!=='teaCupK'))return;
    const index=action==='teaCupK'?1:0,p=cupPoint(e);if(!p)return;
    const origin=coffeeMachine.getPosition(index);
    if (!coffeeMachine.canMove(index)) return;
    cupDrag={id:e.pointerId,index,startX:e.clientX,startY:e.clientY,offsetX:origin.x-p.x,offsetZ:origin.z-p.z,moved:false,enabled:controls.enabled};
    controls.enabled=false;canvas.setPointerCapture(e.pointerId);hoverLabel.hidden=true;e.preventDefault();e.stopImmediatePropagation();
  },true);
  canvas.addEventListener('pointermove',e=>{
    if(!cupDrag||cupDrag.id!==e.pointerId)return;
    if(!cupDrag.moved&&Math.hypot(e.clientX-cupDrag.startX,e.clientY-cupDrag.startY)>6){cupDrag.moved=true;roomSound('cup');}
    if (cupDrag.moved) {
      const p = cupPoint(e);
      arrangement.showCupTarget(cupDrag.index, true);
      if (p && p.x > .08 && p.x < 1.5 && p.z > -3.9 && p.z < -2.92) {
        window.softHoursDockedCup = null;
        coffeeMachine.moveCup(cupDrag.index, p.x + cupDrag.offsetX, p.z + cupDrag.offsetZ);
        cupDrag.movedOnTable = true;
      }
      canvas.style.cursor = 'grabbing';
    }
    e.preventDefault();e.stopImmediatePropagation();
  },true);
  function endCupDrag(e){if(!cupDrag||cupDrag.id!==e.pointerId)return;const d=cupDrag;cupDrag=null;controls.enabled=d.enabled;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);canvas.style.cursor='grab';
    if (d.moved) {
      drinkButton.hidden = true;
      clearTimeout(cupButtonTimer);
      arrangement.showCupTarget(d.index, false);
      if (e.type === 'pointerup' && arrangement.tryCupWindow(e, d.index)) {
        window.softHoursDockedCup = null;
      } else if (d.movedOnTable) {
        const docked = e.type === 'pointerup' && coffeeMachine.releaseCup(d.index);
        arrangement.saveCupOnTable(d.index);
        if (e.type === 'pointerup') roomSound('cup');
        if (docked) {
          window.softHoursDockedCup = d.index;
          window.dispatchEvent(new CustomEvent('soft-hours:open',{detail:'coffeeMachine'}));
        }
      }
    }
    else if(e.type==='pointerup'){const action=d.index?'teaCupK':'teaCupJ',now=performance.now();if(lastCupClick===action&&now-lastCupAt<460&&coffeeMachine.spill(d.index)){clearTimeout(cupButtonTimer);drinkButton.hidden=true;lastCupClick='';setTimeout(()=>window.dispatchEvent(new CustomEvent('soft-hours:open',{detail:'spilledTea'})),1000);}else if(coffeeMachine.hasDrink(d.index)){lastCupClick=action;lastCupAt=now;clearTimeout(cupButtonTimer);const rect=area.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;cupButtonTimer=setTimeout(()=>{selectedCup=d.index;drinkButton.style.left=`${Math.max(75,Math.min(rect.width-75,x))}px`;drinkButton.style.top=`${Math.max(60,y-58)}px`;drinkButton.hidden=false;lastCupClick='';},470);}}
    e.preventDefault();e.stopImmediatePropagation();
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,endCupDrag,true);
  const drinkButton=document.createElement('button');drinkButton.type='button';drinkButton.className='tea-cup-drink';drinkButton.textContent='一饮而尽！';drinkButton.hidden=true;area.append(drinkButton);
  let selectedCup=0,cupButtonTimer=0;
  drinkButton.onclick=()=>{
    if (coffeeMachine.drink(selectedCup)) {
      sipSound();
      notify('咕嘟。杯子说：续杯也不是不行。');
    }
    drinkButton.hidden=true;
  };
  const fingers = new Set(); let down = null; let dragged = false,lastCupClick='',lastCupAt=0;
  canvas.addEventListener('pointerdown', event => {
    fingers.add(event.pointerId); if (fingers.size > 1) dragged = true;
    if (fingers.size === 1) { down = { x: event.clientX, y: event.clientY }; dragged = false; }
    canvas.classList.add('is-dragging'); hoverLabel.hidden = true;
  });
  canvas.addEventListener('pointermove', event => {
    if (down) {
      if (!dragged && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) {
        dragged = true;
        if (controls.enabled) roomSound('turn');
      }
      return;
    }
    if (event.pointerType === 'touch') return;
    const action = hitAt(event.clientX, event.clientY);
    const isCurtain = action === 'curtainLeft' || action === 'curtainRight';
    curtains.hover(event,isCurtain);
    if (!isCurtain) canvas.style.cursor = action ? 'pointer' : 'grab';
    hoverLabel.hidden = !action || isCurtain;
    if (action) {
      const rect = area.getBoundingClientRect(); hoverLabel.textContent = category(action)&&focusedItem!==category(action)?(category(action)==='wardrobe'?'衣柜 · 靠近看看':category(action)==='letters'?'信封':'唱片 · 靠近看看'):labels[action];
      hoverLabel.style.left = `${Math.min(event.clientX - rect.left, rect.width - 205)}px`;
      hoverLabel.style.top = `${event.clientY - rect.top}px`;
    }
  });
  canvas.addEventListener('pointerup', event => {
    fingers.delete(event.pointerId);
    if (down && !dragged && !fingers.size && (event.button === 0 || event.pointerType === 'touch')) {
      const action = hitAt(event.clientX, event.clientY);
      if (focusTween) {}
      else if(action==='teaCupJ'||action==='teaCupK') {}
      else if(category(action)&&approach(category(action),action)) {}
      else if (action === undefined) {
        drinkButton.hidden = true;
        roomProps.hideSprayer();
        restoreRoomView();
      }
      else if (action === 'wardrobeDoorLeft' || action === 'wardrobeDoorRight') { wardrobe.toggle(action); roomSound('door'); }
      else if((action==='wardrobe'||action==='wardrobeAlbum')&&!wardrobe.isOpen()) { wardrobe.open(); roomSound('door'); }
      else if(action==='wardrobeAlbum') window.dispatchEvent(new CustomEvent('soft-hours:open',{detail:'wardrobe'}));
      else if (action === 'cat') {talkToCat();cat.tap();}
      else if (action === 'doorbell') ringDoorbell();
      else if (action === 'drawerCamera') window.dispatchEvent(new CustomEvent('soft-hours:open',{detail:'camera'}));
      else if(action?.startsWith('drawer')||action?.startsWith('storageBox')) {
        storage.toggle(action);
        roomSound(action.startsWith('drawer') ? 'drawer' : 'box');
      }
      else if (action === 'bed') { bed.toggle(); roomSound('fabric'); }
      else if (action === 'rugCorner') tapRug();
      else if (storage.plants.has(action)) roomProps.showPlant(action);
      else if (action === 'lamp') window.dispatchEvent(new Event('soft-hours:lamp'));
      else if (action) window.dispatchEvent(new CustomEvent('soft-hours:open', { detail: action }));
    }
    if (!fingers.size) { down = null; canvas.classList.remove('is-dragging'); }
  });
  canvas.addEventListener('pointercancel', event => { fingers.delete(event.pointerId); down = null; dragged = true; canvas.classList.remove('is-dragging'); });
  canvas.addEventListener('pointerleave', () => { hoverLabel.hidden = true; });
  canvas.addEventListener('wheel', () => { hoverLabel.hidden = true; }, { passive: true });
  function resize() {
    const width = area.clientWidth, height = area.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    viewHeight = Math.max(15.6, 17.2 / aspect);
    // Compose within a full-screen canvas; zoom never meets an interior crop box.
    compositionCenter = width < 600 ? .55 : .56;
    camera.aspect = aspect;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(viewHeight / (2 * initialDistance)));
    updateProjection(); renderer.setSize(width, height, false);
  }
  new ResizeObserver(resize).observe(area); resize(); zoomStatus();
  let previousTime = performance.now();
  const modal = document.getElementById("modalShell");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  renderer.setAnimationLoop(() => {
    const now = performance.now(), delta = Math.min((now-previousTime)/1000,.1); previousTime=now;
    if (document.hidden || document.body.classList.contains('is-globe') || (modal && !modal.hidden)) return;
    const reduced = motionPreference.matches;
    if (wheelZoomTarget !== null && controls.enabled && !focusTween) {
      const next = THREE.MathUtils.damp(camera.zoom, wheelZoomTarget, 22, delta);
      const settled = reduced || Math.abs(next - wheelZoomTarget) < 0.001;
      camera.zoom = settled ? wheelZoomTarget : next;
      if (settled) wheelZoomTarget = null;
      zoomStatus();
    }
    if(focusTween){
      const t=focusTween;t.time+=delta;const p=reduced?1:Math.min(1,t.time/.65),e=p*p*(3-2*p);
      camera.position.lerpVectors(t.from.position,t.to.position,e);controls.target.lerpVectors(t.from.target,t.to.target,e);roomFocus.lerpVectors(t.from.focus,t.to.focus,e);camera.zoom=THREE.MathUtils.lerp(t.from.zoom,t.to.zoom,e);camera.lookAt(controls.target);zoomStatus();
      if(p===1){focusTween=null;controls.enabled=true;controls.update();}
    }
    wardrobe.update(delta,reduced);storage.update(delta,reduced);coffeeMachine.update(delta);
    roomProps.update(delta,reduced);
    little.update(delta,reduced); bed.update(delta,reduced);
    if(cat.update(delta,reduced)){roomSound('paws');talkAfterLanding();}
    if(!catBubble.hidden){
      if(performance.now()>catBubbleUntil)catBubble.hidden=true;
      else {const anchor=catObject.localToWorld(new THREE.Vector3(0,1.05,0)).project(camera),rect=area.getBoundingClientRect(),edge=rect.width<600?88:115;catBubble.style.left=`${Math.max(edge,Math.min(rect.width-edge,(anchor.x+1)*rect.width/2))}px`;catBubble.style.top=`${Math.max(42,Math.min(rect.height-42,(1-anchor.y)*rect.height/2))}px`;}
    }
    turntable.update(delta,reduced);
    nightUniform.value = reduced ? nightTarget : THREE.MathUtils.damp(nightUniform.value,nightTarget,5,delta);
    muralMaterial.color.lerpColors(muralDayColor,muralNightColor,nightUniform.value);
    storage.setNight(nightUniform.value);coffeeMachine.setNight(nightUniform.value);
    rug.update(delta,reduced,nightUniform.value);
    const aperture = curtains.lightOpening;
    curtainOpening.value.x = reduced ? aperture[0] : THREE.MathUtils.damp(curtainOpening.value.x,aperture[0],14,delta);
    curtainOpening.value.y = reduced ? aperture[1] : THREE.MathUtils.damp(curtainOpening.value.y,aperture[1],14,delta);
    const gap = Math.max(0,curtainOpening.value.y-curtainOpening.value.x);
    windowGlow.material.opacity = nightUniform.value * .36 * THREE.MathUtils.smoothstep(gap,0,4.6);
    if (!curtains.dragging && !focusTween) controls.update();
    if(!rugHint.hidden)positionRugHint();
    doorbell.update(reduced);
    renderer.render(scene, camera);
  });
  loader.hidden = true;
  installSnowglobe(room);
  canvas.dataset.modelReady = 'true';
}
startRoom().catch(error => {
  console.error('Unable to open the 3D room', error);
  loader.replaceChildren(document.createTextNode('小屋暂时没有加载成功。'));
  const retry = document.createElement('button'); retry.textContent = '重新加载'; retry.type = 'button';
  retry.addEventListener('click', () => location.reload()); loader.append(retry);
});
