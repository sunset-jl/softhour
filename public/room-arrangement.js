import * as THREE from 'three';
import { placementSound, roomSound } from './room-sounds.js?v=drawer-camera-soft-cat-1';

const table = [
  new THREE.Vector3(.53, 1.198, -2.96),
  new THREE.Vector3(1.06, 1.198, -2.96),
];
const sill = [
  new THREE.Vector3(-5.04, 1.424, -1.28),
  new THREE.Vector3(-5.04, 1.424, -.68),
];
const cupSill = [
  new THREE.Vector3(-5.04, 1.424, .4),
  new THREE.Vector3(-5.04, 1.424, 1.02),
];
const slots = [...table, ...sill];
const messages = {
  arrangeLetter: '这封信没长腿，怎么自己跑出来了？',
  arrangeNotebook: '先占个位置，今天的故事还没写完。',
};
const layoutKey = 'soft-hours-arrangement-v1';

export function installArrangement({ room, camera, canvas, controls, keepsakes, hitAt, coffeeMachine, notify }) {
  let layout = {};
  try {
    const saved = JSON.parse(localStorage.getItem(layoutKey));
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) layout = saved;
  } catch {}

  function save() {
    try { localStorage.setItem(layoutKey, JSON.stringify(layout)); } catch {}
  }

  function closest(event, points) {
    const bounds = canvas.getBoundingClientRect();
    const radius = Math.min(44, Math.max(22, bounds.width * .045));
    let nearest = -1;
    let best = radius;
    points.forEach((point, index) => {
      const projected = room.localToWorld(point.clone()).project(camera);
      if (projected.z < -1 || projected.z > 1) return;
      const x = bounds.left + (projected.x + 1) * bounds.width / 2;
      const y = bounds.top + (1 - projected.y) * bounds.height / 2;
      const distance = Math.hypot(event.clientX - x, event.clientY - y);
      if (distance < best) { best = distance; nearest = index; }
    });
    return nearest;
  }

  function put(item, index) {
    room.add(item.group);
    item.group.position.copy(slots[index]);
    item.group.rotation.y = index >= table.length ? Math.PI / 2 : -.12;
  }

  function goHome(item) {
    item.home.add(item.group);
    item.group.position.copy(item.position);
    item.group.rotation.y = item.angle;
  }

  const occupied = (id, index) => [...keepsakes.keys()].some(other => other !== id && layout[other] === index);
  const ring = new THREE.RingGeometry(.104, .125, 32);
  const ink = new THREE.MeshBasicMaterial({ color: '#e9c884', side: THREE.DoubleSide });
  function marker(position) {
    const mesh = new THREE.Mesh(ring, ink);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y += .012;
    mesh.visible = false;
    room.add(mesh);
    return mesh;
  }
  const markers = slots.map(marker);
  const cupMarkers = cupSill.map(marker);
  for (const [id, item] of keepsakes) {
    item.angle = item.group.rotation.y;
    const index = layout[id];
    if (Number.isInteger(index) && slots[index] && !occupied(id, index)) put(item, index);
    else delete layout[id];
  }
  for (let index = 0; index < cupSill.length; index++) {
    const saved = layout['cup' + index];
    if (saved === 'window') {
      const { x, y, z } = cupSill[index];
      coffeeMachine.setDisplayPosition(index, x, y, z);
    } else if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.z)) {
      coffeeMachine.moveCup(index, saved.x, saved.z);
    }
  }

  let drag = null;
  const plane = new THREE.Plane();
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const point = new THREE.Vector3();

  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  canvas.addEventListener('pointerdown', event => {
    if (drag || !event.isPrimary || event.button !== 0 || !controls.enabled) return;
    const id = hitAt(event.clientX, event.clientY);
    const item = keepsakes.get(id);
    if (!item || (item.group.parent === item.home && item.pivot.position.z < .45)) return;
    const anchor = item.group.getWorldPosition(new THREE.Vector3());
    plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), anchor);
    drag = { id, item, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    controls.enabled = false;
    canvas.setPointerCapture(event.pointerId);
    consume(event);
  }, true);

  canvas.addEventListener('pointermove', event => {
    if (drag?.pointerId !== event.pointerId) return;
    consume(event);
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
    if (!drag.moved) {
      room.attach(drag.item.group);
      roomSound('page');
      markers.forEach((mesh, index) => { mesh.visible = !occupied(drag.id, index); });
    }
    drag.moved = true;
    const bounds = canvas.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
      1 - (event.clientY - bounds.top) / bounds.height * 2);
    ray.setFromCamera(pointer, camera);
    if (ray.ray.intersectPlane(plane, point)) drag.item.group.position.copy(room.worldToLocal(point));
  }, true);

  function finish(event) {
    if (drag?.pointerId !== event.pointerId) return;
    const { id, item, moved } = drag;
    drag = null;
    markers.forEach(mesh => { mesh.visible = false; });
    controls.enabled = true;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    consume(event);
    if (event.type === 'pointerup' && !moved) {
      if (slots[layout[id]]) {
        delete layout[id];
        goHome(item);
        placementSound();
        save();
        notify('收好啦，抽屉替你保管。');
      } else notify('试着把它拖到桌面或窗台上。');
      return;
    }
    const index = event.type === 'pointerup' ? closest(event, slots) : -1;
    if (index >= 0 && !occupied(id, index)) {
      put(item, index);
      layout[id] = index;
      placementSound();
      save();
      notify(messages[id]);
    } else if (slots[layout[id]]) put(item, layout[id]);
    else goHome(item);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, finish, true);
  }

  return {
    showCupTarget(index, visible) {
      cupMarkers[index].visible = visible;
    },
    tryCupWindow(event, index) {
      if (closest(event, [cupSill[index]]) < 0) return false;
      const { x, y, z } = cupSill[index];
      coffeeMachine.setDisplayPosition(index, x, y, z);
      layout['cup' + index] = 'window';
      save();
      placementSound();
      notify('窗边留了个座位，给这杯饮料。');
      return true;
    },
    saveCupOnTable(index) {
      const { x, z } = coffeeMachine.getPosition(index);
      layout['cup' + index] = { x, z };
      save();
    },
  };
}
