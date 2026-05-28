/**
 * room-3d-scene.js — Three.js 3D 場景建構（ES Module）
 * 使用程序化幾何建立廚房 / 臥室 / 衛浴場景，支援即時材質切換
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==================== Global Refs ====================
let scene, camera, renderer, controls;
let meshRegistry = {};    // name → THREE.Mesh
let animFrameId;

const ROOM = { w: 10, h: 3.2, d: 8 }; // 房間尺寸（米）

// ==================== Texture Generator ====================
function generateWoodTexture(baseColor, grainColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Grain lines
    ctx.strokeStyle = grainColor;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 60; i++) {
        ctx.beginPath();
        ctx.lineWidth = 0.5 + Math.random() * 2;
        const y = Math.random() * 512;
        ctx.moveTo(0, y + Math.random() * 20);
        ctx.bezierCurveTo(128, y + Math.random() * 30 - 15, 384, y + Math.random() * 30 - 15, 512, y + Math.random() * 20);
        ctx.stroke();
    }

    // Knots
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 512, 8 + Math.random() * 15, 0, Math.PI * 2);
        ctx.fillStyle = grainColor;
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
}

function generateStoneTexture(baseColor, speckleColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Speckles
    for (let i = 0; i < 800; i++) {
        ctx.fillStyle = speckleColor;
        ctx.globalAlpha = 0.1 + Math.random() * 0.2;
        const size = 1 + Math.random() * 3;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
    }

    // Veins
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#fff';
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        ctx.moveTo(Math.random() * 512, 0);
        ctx.bezierCurveTo(Math.random() * 512, 170, Math.random() * 512, 340, Math.random() * 512, 512);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function generateFloorTexture(baseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);

    // Plank pattern
    const plankHeight = 64;
    for (let y = 0; y < 512; y += plankHeight) {
        // Gap line
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();

        // Grain
        ctx.strokeStyle = 'rgba(0,0,0,0.04)';
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.lineWidth = 0.3 + Math.random() * 1;
            const gy = y + Math.random() * plankHeight;
            ctx.moveTo(0, gy);
            ctx.lineTo(512, gy + (Math.random() - 0.5) * 6);
            ctx.stroke();
        }
    }

    // Vertical joints (staggered)
    for (let y = 0; y < 512; y += plankHeight) {
        const offset = (y / plankHeight % 2 === 0) ? 256 : 128;
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(offset, y);
        ctx.lineTo(offset, y + plankHeight);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
}

function generateTileTexture(baseColor, groutColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = groutColor;
    ctx.fillRect(0, 0, 512, 512);

    const tileSize = 64;
    const gap = 3;
    for (let x = 0; x < 512; x += tileSize + gap) {
        for (let y = 0; y < 512; y += tileSize + gap) {
            ctx.fillStyle = baseColor;
            ctx.fillRect(x, y, tileSize, tileSize);
            // Subtle variation
            ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.02)`;
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
}

// ==================== Material Factory ====================
function makeMat(color, opts = {}) {
    const params = {
        color: new THREE.Color(color),
        roughness: opts.roughness ?? 0.7,
        metalness: opts.metalness ?? 0.0,
        side: THREE.DoubleSide,
    };
    if (opts.map) params.map = opts.map;
    return new THREE.MeshStandardMaterial(params);
}

// ==================== Scene Builder ====================
function buildRoom() {
    const group = new THREE.Group();

    // === Floor ===
    const floorGeo = new THREE.PlaneGeometry(ROOM.w, ROOM.d);
    const floorTex = generateFloorTexture('#d6cfc5');
    const floorMat = makeMat('#d6cfc5', { roughness: 0.6, map: floorTex });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.name = 'floor';
    meshRegistry['floor'] = floor;
    group.add(floor);

    // === Ceiling ===
    const ceilGeo = new THREE.PlaneGeometry(ROOM.w, ROOM.d);
    const ceilMat = makeMat('#fafafa', { roughness: 0.9 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = ROOM.h;
    ceil.name = 'ceiling';
    group.add(ceil);

    // === Walls ===
    // Back wall (kitchen wall)
    const backWallGeo = new THREE.PlaneGeometry(ROOM.w, ROOM.h);
    const backWallMat = makeMat('#f5f0eb', { roughness: 0.9 });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, ROOM.h / 2, -ROOM.d / 2);
    backWall.name = 'living_wall';
    meshRegistry['living_wall'] = backWall;
    group.add(backWall);

    // Left wall
    const leftWallGeo = new THREE.PlaneGeometry(ROOM.d, ROOM.h);
    const leftWallMat = makeMat('#f5f0eb', { roughness: 0.9 });
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.position.set(-ROOM.w / 2, ROOM.h / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.name = 'left_wall';
    group.add(leftWall);

    // Right wall (bedroom wall)
    const rightWallGeo = new THREE.PlaneGeometry(ROOM.d, ROOM.h);
    const rightWallMat = makeMat('#ffffff', { roughness: 0.9 });
    const rightWall = new THREE.Mesh(rightWallGeo, rightWallMat);
    rightWall.position.set(ROOM.w / 2, ROOM.h / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.name = 'bedroom_wall';
    meshRegistry['bedroom_wall'] = rightWall;
    group.add(rightWall);

    // === Kitchen Cabinets (against back-left wall) ===
    const cabinetColor = '#6b4c3b';
    const cabinetTex = generateWoodTexture('#6b4c3b', '#4a3325');

    // Lower cabinets
    const lowerCabGeo = new THREE.BoxGeometry(3.5, 0.85, 0.6);
    const lowerCabMat = makeMat(cabinetColor, { roughness: 0.5, map: cabinetTex });
    const lowerCab = new THREE.Mesh(lowerCabGeo, lowerCabMat);
    lowerCab.position.set(-2.5, 0.425, -ROOM.d / 2 + 0.3);
    lowerCab.castShadow = true;
    lowerCab.name = 'lower_cabinet';
    meshRegistry['lower_cabinet'] = lowerCab;
    group.add(lowerCab);

    // Countertop
    const ctopGeo = new THREE.BoxGeometry(3.6, 0.06, 0.65);
    const ctopTex = generateStoneTexture('#8a8078', '#6b6560');
    const ctopMat = makeMat('#8a8078', { roughness: 0.3, metalness: 0.05, map: ctopTex });
    const ctop = new THREE.Mesh(ctopGeo, ctopMat);
    ctop.position.set(-2.5, 0.88, -ROOM.d / 2 + 0.3);
    ctop.castShadow = true;
    ctop.name = 'countertop';
    meshRegistry['countertop'] = ctop;
    group.add(ctop);

    // Upper cabinets
    const upperCabGeo = new THREE.BoxGeometry(3.5, 0.7, 0.35);
    const upperCabMat = makeMat(cabinetColor, { roughness: 0.5, map: cabinetTex.clone() });
    const upperCab = new THREE.Mesh(upperCabGeo, upperCabMat);
    upperCab.position.set(-2.5, 2.2, -ROOM.d / 2 + 0.175);
    upperCab.castShadow = true;
    upperCab.name = 'upper_cabinet';
    meshRegistry['upper_cabinet'] = upperCab;
    group.add(upperCab);

    // Backsplash (烤玻)
    const bsGeo = new THREE.PlaneGeometry(3.5, 0.95);
    const bsMat = makeMat('#1a1a1a', { roughness: 0.1, metalness: 0.3 });
    const bs = new THREE.Mesh(bsGeo, bsMat);
    bs.position.set(-2.5, 1.4, -ROOM.d / 2 + 0.02);
    bs.name = 'backsplash';
    meshRegistry['backsplash'] = bs;
    group.add(bs);

    // Appliance cabinet (right side of kitchen)
    const appCabGeo = new THREE.BoxGeometry(0.6, 2.2, 0.6);
    const appCabMat = makeMat(cabinetColor, { roughness: 0.5, map: cabinetTex.clone() });
    const appCab = new THREE.Mesh(appCabGeo, appCabMat);
    appCab.position.set(-0.45, 1.1, -ROOM.d / 2 + 0.3);
    appCab.castShadow = true;
    appCab.name = 'appliance_cabinet';
    meshRegistry['appliance_cabinet'] = appCab;
    group.add(appCab);

    // === Island ===
    const islandBodyGeo = new THREE.BoxGeometry(2, 0.85, 0.8);
    const islandBodyMat = makeMat(cabinetColor, { roughness: 0.5, map: cabinetTex.clone() });
    const islandBody = new THREE.Mesh(islandBodyGeo, islandBodyMat);
    islandBody.position.set(-2, 0.425, -ROOM.d / 2 + 2);
    islandBody.castShadow = true;
    islandBody.name = 'island_body';
    meshRegistry['island_body'] = islandBody;
    group.add(islandBody);

    const islandTopGeo = new THREE.BoxGeometry(2.1, 0.05, 0.9);
    const islandTopMat = makeMat('#8a8078', { roughness: 0.3, metalness: 0.05, map: ctopTex.clone() });
    const islandTop = new THREE.Mesh(islandTopGeo, islandTopMat);
    islandTop.position.set(-2, 0.875, -ROOM.d / 2 + 2);
    islandTop.name = 'island_top';
    meshRegistry['island_top'] = islandTop;
    group.add(islandTop);

    // === Door (kitchen door on left wall) ===
    const doorGeo = new THREE.BoxGeometry(0.04, 2.1, 0.9);
    const doorTex = generateWoodTexture('#8b7355', '#6b5940');
    const doorMat = makeMat('#8b7355', { roughness: 0.4, map: doorTex });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(-ROOM.w / 2 + 0.02, 1.05, 1);
    door.castShadow = true;
    door.name = 'door';
    meshRegistry['door'] = door;
    group.add(door);

    // Door frame
    const frameGeo = new THREE.BoxGeometry(0.08, 2.2, 1.0);
    const frameMat = makeMat('#e8e0d6', { roughness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(-ROOM.w / 2 + 0.04, 1.1, 1);
    frame.name = 'door_frame';
    group.add(frame);

    // === Entrance Door ===
    const entDoorGeo = new THREE.BoxGeometry(1, 2.1, 0.06);
    const entDoorTex = generateWoodTexture('#d4b896', '#b89870');
    const entDoorMat = makeMat('#d4b896', { roughness: 0.4, map: entDoorTex });
    const entDoor = new THREE.Mesh(entDoorGeo, entDoorMat);
    entDoor.position.set(2, 1.05, -ROOM.d / 2 + 0.03);
    entDoor.name = 'entrance_door';
    meshRegistry['entrance_door'] = entDoor;
    group.add(entDoor);

    // === Bedroom Door ===
    const bedDoorGeo = new THREE.BoxGeometry(0.04, 2.1, 0.9);
    const bedDoorTex = generateWoodTexture('#5c3d2e', '#3e2920');
    const bedDoorMat = makeMat('#5c3d2e', { roughness: 0.4, map: bedDoorTex });
    const bedDoor = new THREE.Mesh(bedDoorGeo, bedDoorMat);
    bedDoor.position.set(ROOM.w / 2 - 0.02, 1.05, -1);
    bedDoor.name = 'bedroom_door';
    meshRegistry['bedroom_door'] = bedDoor;
    group.add(bedDoor);

    // === Bedroom Floor (a slightly different floor on the right side) ===
    const bedFloorGeo = new THREE.PlaneGeometry(3, 3);
    const bedFloorTex = generateFloorTexture('#9e9590');
    const bedFloorMat = makeMat('#9e9590', { roughness: 0.6, map: bedFloorTex });
    const bedFloor = new THREE.Mesh(bedFloorGeo, bedFloorMat);
    bedFloor.rotation.x = -Math.PI / 2;
    bedFloor.position.set(3.2, 0.005, -1.5);
    bedFloor.name = 'bedroom_floor';
    meshRegistry['bedroom_floor'] = bedFloor;
    group.add(bedFloor);

    // === Bathroom area (back-right) ===
    const bathWallGeo = new THREE.PlaneGeometry(2.5, ROOM.h);
    const bathTileTex = generateTileTexture('#c4a882', '#b0977a');
    const bathWallMat = makeMat('#c4a882', { roughness: 0.5, map: bathTileTex });
    const bathWall = new THREE.Mesh(bathWallGeo, bathWallMat);
    bathWall.position.set(3, ROOM.h / 2, -ROOM.d / 2 + 0.01);
    bathWall.name = 'bath_wall';
    meshRegistry['bath_wall'] = bathWall;
    group.add(bathWall);

    // Bath door
    const bathDoorGeo = new THREE.BoxGeometry(0.8, 2.0, 0.04);
    const bathDoorTex = generateWoodTexture('#5c3d2e', '#3e2920');
    const bathDoorMat = makeMat('#5c3d2e', { roughness: 0.4, map: bathDoorTex });
    const bathDoor = new THREE.Mesh(bathDoorGeo, bathDoorMat);
    bathDoor.position.set(3, 1, -ROOM.d / 2 + 1.2);
    bathDoor.name = 'bath_door';
    meshRegistry['bath_door'] = bathDoor;
    group.add(bathDoor);

    // === Decorative elements ===

    // Skirting boards (踢腳板)
    const skirtMat = makeMat('#d8d0c5', { roughness: 0.8 });
    [
        { pos: [0, 0.04, -ROOM.d / 2 + 0.02], geo: [ROOM.w, 0.08, 0.04] },
        { pos: [-ROOM.w / 2 + 0.02, 0.04, 0], geo: [0.04, 0.08, ROOM.d] },
        { pos: [ROOM.w / 2 - 0.02, 0.04, 0], geo: [0.04, 0.08, ROOM.d] },
    ].forEach(({ pos, geo }) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(...geo), skirtMat);
        m.position.set(...pos);
        group.add(m);
    });

    // Crown molding (天花板線條)
    const crownMat = makeMat('#e8e0d6', { roughness: 0.8 });
    [
        { pos: [0, ROOM.h - 0.03, -ROOM.d / 2 + 0.02], geo: [ROOM.w, 0.06, 0.06] },
        { pos: [-ROOM.w / 2 + 0.02, ROOM.h - 0.03, 0], geo: [0.06, 0.06, ROOM.d] },
        { pos: [ROOM.w / 2 - 0.02, ROOM.h - 0.03, 0], geo: [0.06, 0.06, ROOM.d] },
    ].forEach(({ pos, geo }) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(...geo), crownMat);
        m.position.set(...pos);
        group.add(m);
    });

    // Simple bed frame (in bedroom area)
    const bedFrame = new THREE.Group();
    const bedBase = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.35, 2.2),
        makeMat('#c4b896', { roughness: 0.6 })
    );
    bedBase.position.y = 0.175;
    bedFrame.add(bedBase);

    const mattress = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.2, 2.1),
        makeMat('#f0ede8', { roughness: 0.9 })
    );
    mattress.position.y = 0.45;
    bedFrame.add(mattress);

    const headboard = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.8, 0.08),
        makeMat('#8b7355', { roughness: 0.5 })
    );
    headboard.position.set(0, 0.75, -1.05);
    bedFrame.add(headboard);

    bedFrame.position.set(3.5, 0, -2.5);
    group.add(bedFrame);

    // Pillow
    const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.12, 0.35),
        makeMat('#ffffff', { roughness: 0.9 })
    );
    pillow.position.set(3.5, 0.6, -3.1);
    group.add(pillow);

    return group;
}

// ==================== Lighting ====================
function setupLighting() {
    // Ambient
    const ambient = new THREE.AmbientLight(0xfaf8f5, 0.6);
    scene.add(ambient);

    // Hemisphere (sky/ground)
    const hemi = new THREE.HemisphereLight(0xf5f0eb, 0xd6cfc5, 0.4);
    scene.add(hemi);

    // Main directional (like window light)
    const dir = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dir.position.set(3, 5, 4);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 20;
    dir.shadow.camera.left = -8;
    dir.shadow.camera.right = 8;
    dir.shadow.camera.top = 8;
    dir.shadow.camera.bottom = -8;
    dir.shadow.bias = -0.002;
    scene.add(dir);

    // Fill light
    const fill = new THREE.DirectionalLight(0xe8e0f0, 0.3);
    fill.position.set(-4, 3, -2);
    scene.add(fill);

    // Spot on kitchen
    const kitchenSpot = new THREE.SpotLight(0xfff8f0, 0.8, 8, Math.PI / 6, 0.5);
    kitchenSpot.position.set(-2.5, ROOM.h - 0.1, -ROOM.d / 2 + 1.5);
    kitchenSpot.target.position.set(-2.5, 0, -ROOM.d / 2 + 0.5);
    scene.add(kitchenSpot);
    scene.add(kitchenSpot.target);

    // Spot on island
    const islandSpot = new THREE.SpotLight(0xfff8f0, 0.5, 6, Math.PI / 5, 0.5);
    islandSpot.position.set(-2, ROOM.h - 0.1, -ROOM.d / 2 + 2);
    islandSpot.target.position.set(-2, 0.9, -ROOM.d / 2 + 2);
    scene.add(islandSpot);
    scene.add(islandSpot.target);
}

// ==================== Camera Presets ====================
const CAMERA_PRESETS = {
    kitchen: { pos: [0, 2.5, 1], target: [-2.5, 1, -ROOM.d / 2 + 1] },
    bedroom: { pos: [1, 2, 1], target: [3.5, 0.5, -2] },
    bathroom: { pos: [1, 2, -1], target: [3, 1.5, -ROOM.d / 2 + 0.5] },
    top:     { pos: [0, 8, 0.5], target: [0, 0, -1] },
    default: { pos: [2, 3.5, 5], target: [-0.5, 0.8, -1] },
};

function animateCamera(preset, duration = 800) {
    const { pos, target } = CAMERA_PRESETS[preset] || CAMERA_PRESETS.default;
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = new THREE.Vector3(...pos);
    const endTarget = new THREE.Vector3(...target);
    const startTime = performance.now();

    function ease(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function tick() {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const e = ease(t);

        camera.position.lerpVectors(startPos, endPos, e);
        controls.target.lerpVectors(startTarget, endTarget, e);
        controls.update();

        if (t < 1) requestAnimationFrame(tick);
    }
    tick();
}

// ==================== Material Updater ====================
/**
 * Change a mesh's material by color.
 * @param {string} meshName — key in meshRegistry
 * @param {string} hexColor — CSS hex color
 * @param {string} textureHint — texture type hint
 */
window.updateMeshMaterial = function(meshName, hexColor, textureHint) {
    const mesh = meshRegistry[meshName];
    if (!mesh) return;

    const color = new THREE.Color(hexColor);
    let tex = null;
    let roughness = 0.7;
    let metalness = 0.0;

    if (textureHint.startsWith('wood-')) {
        const darker = color.clone().multiplyScalar(0.7);
        tex = generateWoodTexture(hexColor, '#' + darker.getHexString());
        roughness = 0.5;
    } else if (textureHint.startsWith('stone-')) {
        const speckle = color.clone().multiplyScalar(0.8);
        tex = generateStoneTexture(hexColor, '#' + speckle.getHexString());
        roughness = 0.3;
        metalness = 0.05;
    } else if (textureHint.startsWith('floor-')) {
        tex = generateFloorTexture(hexColor);
        roughness = 0.6;
    } else if (textureHint.startsWith('tile-')) {
        const grout = color.clone().multiplyScalar(0.85);
        tex = generateTileTexture(hexColor, '#' + grout.getHexString());
        roughness = 0.5;
    } else if (textureHint.startsWith('glass-')) {
        roughness = 0.1;
        metalness = 0.3;
    } else if (textureHint.startsWith('paint-')) {
        roughness = 0.9;
    }

    const newMat = new THREE.MeshStandardMaterial({
        color: color,
        roughness,
        metalness,
        side: THREE.DoubleSide,
    });
    if (tex) newMat.map = tex;

    // Dispose old material
    if (mesh.material) {
        if (mesh.material.map) mesh.material.map.dispose();
        mesh.material.dispose();
    }
    mesh.material = newMat;
};

// ==================== Init ====================
function init() {
    const container = document.getElementById('three-canvas-container');
    const canvas = document.getElementById('three-canvas');

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#242424');
    scene.fog = new THREE.Fog('#242424', 15, 25);

    // Camera
    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(...CAMERA_PRESETS.default.pos);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Controls
    controls = new OrbitControls(camera, canvas);
    controls.target.set(...CAMERA_PRESETS.default.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.5;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.update();

    // Build
    setupLighting();
    const room = buildRoom();
    scene.add(room);

    // Ground plane (shadow catcher)
    const groundGeo = new THREE.PlaneGeometry(30, 30);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.15 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Resize handler
    function onResize() {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onResize);

    // Animation loop
    function animate() {
        animFrameId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Hide loader
    setTimeout(() => {
        document.getElementById('viewport-loader')?.classList.add('hidden');
    }, 600);

    // Hide hint after first interaction
    canvas.addEventListener('pointerdown', () => {
        document.querySelector('.viewport-hint')?.classList.add('hidden');
    }, { once: true });
}

// ==================== Expose camera control ====================
window.moveCamera = function(preset) {
    animateCamera(preset);
};

// ==================== Boot ====================
document.addEventListener('DOMContentLoaded', () => {
    // Slight delay so CSS layout is calculated
    requestAnimationFrame(() => {
        requestAnimationFrame(init);
    });
});
