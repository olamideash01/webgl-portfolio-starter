import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

function createGradientSky() {
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2;
  skyCanvas.height = 512;
  const context = skyCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, skyCanvas.height);

  gradient.addColorStop(0, '#102351');
  gradient.addColorStop(0.48, '#557fc0');
  gradient.addColorStop(0.78, '#f0a269');
  gradient.addColorStop(1, '#ffd68a');
  context.fillStyle = gradient;
  context.fillRect(0, 0, skyCanvas.width, skyCanvas.height);

  const texture = new THREE.CanvasTexture(skyCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSignTexture(text, background, foreground = '#fff7df') {
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512;
  signCanvas.height = 160;
  const context = signCanvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, signCanvas.width, signCanvas.height);
  context.strokeStyle = foreground;
  context.lineWidth = 10;
  context.strokeRect(12, 12, signCanvas.width - 24, signCanvas.height - 24);
  context.fillStyle = foreground;
  context.font = '900 56px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text.toUpperCase(), signCanvas.width / 2, signCanvas.height / 2 + 3);

  const texture = new THREE.CanvasTexture(signCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

scene.background = createGradientSky();
scene.fog = new THREE.Fog('#b37e68', 70, 175);

const hemisphereLight = new THREE.HemisphereLight('#b9d7ff', '#8a4a2c', 1.8);
scene.add(hemisphereLight);

const sunLight = new THREE.DirectionalLight('#fff0c2', 3.8);
sunLight.position.set(-35, 48, 24);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -80;
sunLight.shadow.camera.right = 80;
sunLight.shadow.camera.top = 80;
sunLight.shadow.camera.bottom = -80;
sunLight.shadow.camera.far = 150;
scene.add(sunLight);

const world = new THREE.Group();
scene.add(world);
const solidColliders = [];
const animatedStreetLife = [];

function addBoxCollider(x, z, width, depth, padding = 0) {
  solidColliders.push({
    type: 'box',
    minX: x - width / 2 - padding,
    maxX: x + width / 2 + padding,
    minZ: z - depth / 2 - padding,
    maxZ: z + depth / 2 + padding,
  });
}

function addCircleCollider(x, z, radius) {
  solidColliders.push({ type: 'circle', x, z, radius });
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(190, 190),
  new THREE.MeshStandardMaterial({ color: '#b56f38', roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.08;
ground.receiveShadow = true;
world.add(ground);

const roadMaterial = new THREE.MeshStandardMaterial({ color: '#272930', roughness: 0.96 });
const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: '#d6b087', roughness: 0.9 });
const lineMaterial = new THREE.MeshBasicMaterial({ color: '#f5d75f' });

function addRoad(x, z, width, depth, horizontal = false) {
  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(width + 3.2, 0.18, depth + 3.2),
    sidewalkMaterial,
  );
  sidewalk.position.set(x, 0.02, z);
  sidewalk.receiveShadow = true;
  world.add(sidewalk);

  const road = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), roadMaterial);
  road.position.set(x, 0.12, z);
  road.receiveShadow = true;
  world.add(road);

  const routeLength = horizontal ? width : depth;
  for (let offset = -routeLength / 2 + 4; offset < routeLength / 2; offset += 8) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(horizontal ? 3.8 : 0.16, 0.025, horizontal ? 0.16 : 3.8),
      lineMaterial,
    );
    marker.position.set(horizontal ? x + offset : x, 0.235, horizontal ? z : z + offset);
    world.add(marker);
  }
}

addRoad(0, 0, 13, 176);
addRoad(0, -31, 176, 13, true);
addRoad(0, 31, 176, 13, true);
addRoad(-48, 0, 11, 62);
addRoad(48, 0, 11, 62);

function addBuilding({ x, z, width, height, depth, color, roof = '#332b2a', sign, signColor = '#145f55' }) {
  const building = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
  );
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  building.add(body);

  const roofMesh = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.55, 0.42, depth + 0.55),
    new THREE.MeshStandardMaterial({ color: roof, roughness: 0.82 }),
  );
  roofMesh.position.y = height + 0.21;
  roofMesh.castShadow = true;
  building.add(roofMesh);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: '#8bcdd4',
    emissive: '#4b7780',
    emissiveIntensity: 0.18,
    roughness: 0.25,
  });
  const windowRows = Math.max(1, Math.floor(height / 3.2));
  for (let row = 0; row < windowRows; row += 1) {
    for (const side of [-1, 1]) {
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.15, 0.12), windowMaterial);
      windowMesh.position.set(side * width * 0.25, 1.65 + row * 2.6, depth / 2 + 0.065);
      building.add(windowMesh);
    }
  }

  if (sign) {
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(width * 0.78, 7), 1.75),
      new THREE.MeshBasicMaterial({ map: createSignTexture(sign, signColor), transparent: true }),
    );
    signMesh.position.set(0, Math.min(height - 1.2, 3.4), depth / 2 + 0.08);
    building.add(signMesh);
  }

  building.position.set(x, 0.18, z);
  world.add(building);
  addBoxCollider(x, z, width, depth);
  return building;
}

const neighborhoodBuildings = [
  [-22, 62, 14, 8, 11, '#e95f3c', 'MAINLAND PRINTS', '#1d5a4c'],
  [22, 62, 17, 11, 11, '#f0bd36', 'ASH STUDIO', '#8e2635'],
  [-25, 48, 18, 6, 9, '#2c8d79', 'SUYA SPOT', '#bd412f'],
  [25, 47, 14, 8, 10, '#d95470', 'LAGOS LIVING', '#174c50'],
  [-24, 13, 17, 10, 11, '#e6a33e', 'YABA MARKET', '#1c6a59'],
  [24, 13, 16, 7, 12, '#3979a8', 'CREATIVE HUB', '#af352b'],
  [-24, -5, 15, 6, 10, '#d55a34', 'AREA BOYS FM', '#173f58'],
  [24, -7, 17, 12, 11, '#7d6bb1', 'DESIGN HOUSE', '#bd4a28'],
  [-70, 7, 16, 8, 12, '#2d8e75', 'DANFO DEPOT', '#bd3b2b'],
  [-68, -14, 14, 11, 11, '#de8739', 'BALOGUN', '#185a51'],
  [70, 9, 16, 10, 12, '#d54c5e', 'MAINLAND', '#174e59'],
  [68, -13, 14, 7, 10, '#3d8aaa', 'ISLAND BAR', '#b6342e'],
  [-73, -55, 17, 8, 13, '#7d9a45', 'PALM WINE', '#7e2630'],
  [-52, -55, 14, 12, 12, '#c95035', 'NO WAHALA', '#14544f'],
  [53, -55, 16, 9, 12, '#e1b542', 'CHOP LIFE', '#9e2f35'],
  [73, -55, 13, 13, 11, '#347f85', 'LEKKI LAB', '#ae3928'],
];

neighborhoodBuildings.forEach(([x, z, width, height, depth, color, sign, signColor]) => {
  addBuilding({ x, z, width, height, depth, color, sign, signColor });
});

function addTree(x, z, scale = 1) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 2.8 * scale, 7),
    new THREE.MeshStandardMaterial({ color: '#6c3f26', roughness: 1 }),
  );
  trunk.position.y = 1.4 * scale;
  trunk.castShadow = true;
  tree.add(trunk);

  const leavesMaterial = new THREE.MeshStandardMaterial({ color: '#2b7547', roughness: 0.92 });
  for (const [leafX, leafY, leafZ, leafScale] of [
    [0, 3.35, 0, 1.25],
    [-0.65, 3.05, 0.1, 0.86],
    [0.62, 3.08, -0.05, 0.9],
  ]) {
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(leafScale * scale, 1), leavesMaterial);
    leaves.position.set(leafX * scale, leafY * scale, leafZ * scale);
    leaves.castShadow = true;
    tree.add(leaves);
  }
  tree.position.set(x, 0.18, z);
  world.add(tree);
  addCircleCollider(x, z, 0.7 * scale);
}

function addStreetlight(x, z, rotation = 0) {
  const light = new THREE.Group();
  const metalMaterial = new THREE.MeshStandardMaterial({ color: '#393e43', metalness: 0.55, roughness: 0.48 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 5.4, 8), metalMaterial);
  pole.position.y = 2.7;
  pole.castShadow = true;
  light.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), metalMaterial);
  arm.position.set(0.6, 5.34, 0);
  light.add(arm);

  const lampMaterial = new THREE.MeshBasicMaterial({ color: '#ffe49a' });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.34), lampMaterial);
  lamp.position.set(1.25, 5.2, 0);
  light.add(lamp);
  light.position.set(x, 0.18, z);
  light.rotation.y = rotation;
  world.add(light);
  addCircleCollider(x, z, 0.48);
}

[
  [-9, 72], [9, 58], [-9, 43], [9, 17], [-9, 2], [9, -18], [-9, -46], [9, -68],
  [-75, -22], [-60, -40], [-38, -22], [-21, -40], [23, -22], [39, -40], [61, -22], [77, -40],
].forEach(([x, z], index) => addStreetlight(x, z, index > 7 ? Math.PI / 2 : index % 2 ? Math.PI : 0));

[
  [-39, 63], [39, 63], [-37, 49], [40, 47], [-35, 17], [37, 13], [-37, -4], [38, -8],
  [-82, 18], [-59, 17], [59, 18], [82, 18], [-81, -59], [-36, -58], [36, -58], [83, -58],
].forEach(([x, z], index) => addTree(x, z, 0.85 + (index % 3) * 0.12));

function addMarketStall(x, z, color) {
  const stall = new THREE.Group();
  const table = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 0.85, 1.8),
    new THREE.MeshStandardMaterial({ color: '#704127', roughness: 1 }),
  );
  table.position.y = 0.6;
  table.castShadow = true;
  stall.add(table);
  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(4.1, 0.18, 2.4),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 }),
  );
  canopy.position.y = 2.65;
  canopy.rotation.z = -0.05;
  canopy.castShadow = true;
  stall.add(canopy);
  for (const poleX of [-1.65, 1.65]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6),
      new THREE.MeshStandardMaterial({ color: '#ddd1b5' }),
    );
    pole.position.set(poleX, 1.45, 0);
    stall.add(pole);
  }
  stall.position.set(x, 0.18, z);
  world.add(stall);
  addBoxCollider(x, z, 4.1, 2.4, 0.12);
}

addMarketStall(-15, 20, '#f1bd25');
addMarketStall(-15, 15, '#2d8f72');
addMarketStall(15, 20, '#d8493c');
addMarketStall(15, 14.8, '#3979a8');

function addRoadsideUmbrella(x, z, color) {
  const umbrella = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 2.3, 6),
    new THREE.MeshStandardMaterial({ color: '#e7dcc0', roughness: 0.8 }),
  );
  pole.position.y = 1.15;
  umbrella.add(pole);
  const shade = new THREE.Mesh(
    new THREE.ConeGeometry(1.4, 0.48, 8, 1, true),
    new THREE.MeshStandardMaterial({ color, roughness: 0.86, side: THREE.DoubleSide }),
  );
  shade.position.y = 2.32;
  shade.rotation.y = Math.PI / 8;
  shade.castShadow = true;
  umbrella.add(shade);
  umbrella.position.set(x, 0.18, z);
  world.add(umbrella);
  addCircleCollider(x, z, 1.05);
}

function addBillboard(x, z, text, color, rotation = 0) {
  const billboard = new THREE.Group();
  const postMaterial = new THREE.MeshStandardMaterial({ color: '#34393f', metalness: 0.5, roughness: 0.55 });
  for (const postX of [-2.1, 2.1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.7, 0.16), postMaterial);
    post.position.set(postX, 2.35, 0);
    billboard.add(post);
  }
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(5.8, 2.1),
    new THREE.MeshBasicMaterial({ map: createSignTexture(text, color), side: THREE.DoubleSide }),
  );
  board.position.y = 4.25;
  billboard.add(board);
  billboard.position.set(x, 0.18, z);
  billboard.rotation.y = rotation;
  world.add(billboard);
  addBoxCollider(x, z, rotation ? 0.8 : 5.2, rotation ? 5.2 : 0.8);
}

[
  [-15.2, 7, '#ee4f42'], [-15.2, -12, '#f1bd25'], [15.3, 5, '#2d8f72'], [15.2, -16, '#3979a8'],
  [-57, -23, '#d95470'], [57, -22, '#f1bd25'], [-38, 40, '#2d8f72'], [38, 40, '#ee4f42'],
].forEach(([x, z, color]) => addRoadsideUmbrella(x, z, color));

addBillboard(-18, 35, 'BRANDING', '#b93238');
addBillboard(18, -35, 'WEB + MOTION', '#17635d', Math.PI);
addBillboard(54, 22, '3D LAB', '#9b6228', -Math.PI / 2);

function addMarketCrates(x, z, color = '#d77b28') {
  const crateGroup = new THREE.Group();
  const crateMaterial = new THREE.MeshStandardMaterial({ color: '#8a552e', roughness: 1 });
  const produceMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });

  for (let index = 0; index < 3; index += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.9), crateMaterial);
    crate.position.set((index - 1) * 0.78, 0.28 + (index === 1 ? 0.45 : 0), index === 1 ? 0.08 : 0);
    crate.castShadow = true;
    crateGroup.add(crate);
    for (let produceIndex = 0; produceIndex < 4; produceIndex += 1) {
      const produce = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 5), produceMaterial);
      produce.position.set(crate.position.x + (produceIndex % 2 ? 0.18 : -0.18), crate.position.y + 0.36, (produceIndex > 1 ? 0.17 : -0.17));
      crateGroup.add(produce);
    }
  }

  crateGroup.position.set(x, 0.18, z);
  world.add(crateGroup);
  addBoxCollider(x, z, 2.6, 1.2, 0.08);
}

function addVendor(x, z, shirtColor, walkAxis = null, walkDistance = 0) {
  const vendor = new THREE.Group();
  const skinMaterial = new THREE.MeshStandardMaterial({ color: '#704126', roughness: 0.9 });
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.9 });
  const trouserMaterial = new THREE.MeshStandardMaterial({ color: '#25334a', roughness: 0.95 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.72, 4, 8), shirtMaterial);
  torso.position.y = 1.45;
  vendor.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinMaterial);
  head.position.y = 2.18;
  vendor.add(head);
  const legs = [];
  for (const legX of [-0.14, 0.14]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.82, 0.2), trouserMaterial);
    leg.position.set(legX, 0.58, 0);
    vendor.add(leg);
    legs.push(leg);
  }
  vendor.position.set(x, 0.18, z);
  vendor.scale.setScalar(0.92);
  world.add(vendor);
  animatedStreetLife.push({ vendor, legs, origin: walkAxis === 'x' ? x : z, axis: walkAxis, distance: walkDistance, phase: Math.random() * Math.PI * 2 });
  if (!walkAxis) addCircleCollider(x, z, 0.48);
}

[
  [-18, 18, '#f0b52f'], [-18, 13.5, '#cb3e48'], [18, 18, '#278f77'], [18, 13, '#3979a8'],
  [-61, -25, '#e9a22c'], [61, -24, '#cc4359'], [-42, 38, '#2d8f72'], [42, 38, '#ef6940'],
].forEach(([x, z, color], index) => {
  addMarketCrates(x, z, color);
  addVendor(x + (index % 2 ? 1.8 : -1.8), z + 0.4, index % 2 ? '#f4c343' : '#4ca98a');
});

addVendor(-5.2, 25, '#d94b51', 'z', 7);
addVendor(5.2, -7, '#f1b92f', 'z', 8);
addVendor(-32, -26.2, '#337fa5', 'x', 7);
addVendor(34, 35.8, '#2f916e', 'x', 8);

function createCar(bodyColor = '#e7a91e', scale = 1) {
  const car = new THREE.Group();
  const chassis = new THREE.Group();
  car.add(chassis);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.42, metalness: 0.12 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#172029', roughness: 0.35, metalness: 0.2 });
  const glassMaterial = new THREE.MeshStandardMaterial({ color: '#75aebc', roughness: 0.18, metalness: 0.12 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.65, 4.2), bodyMaterial);
  base.position.y = 0.75;
  base.castShadow = true;
  chassis.add(base);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.8, 2.15), glassMaterial);
  cabin.position.set(0, 1.42, -0.15);
  cabin.castShadow = true;
  chassis.add(cabin);

  const bonnet = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.24, 1.1), bodyMaterial);
  bonnet.position.set(0, 1.08, 1.62);
  chassis.add(bonnet);

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.18, 0.18), darkMaterial);
  bumper.position.set(0, 0.56, 2.15);
  chassis.add(bumper);

  const headlightMaterial = new THREE.MeshBasicMaterial({ color: '#fff0a8' });
  for (const x of [-0.7, 0.7]) {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.08), headlightMaterial);
    headlight.position.set(x, 0.88, 2.14);
    chassis.add(headlight);
  }

  const wheels = [];
  for (const x of [-1.12, 1.12]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.28, 14), darkMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.48, z);
      wheel.castShadow = true;
      car.add(wheel);
      wheels.push(wheel);
    }
  }
  car.scale.setScalar(scale);
  car.userData.wheels = wheels;
  car.userData.chassis = chassis;
  return car;
}

const playerCar = createCar('#f0ad16');
playerCar.position.set(0, 0.22, 67);
playerCar.rotation.y = Math.PI;
scene.add(playerCar);

const danfo = createCar('#f1b819', 1.28);
danfo.position.set(-76, 0.24, -31);
danfo.rotation.y = Math.PI / 2;
world.add(danfo);

const keke = createCar('#e2bd20', 0.72);
keke.position.set(48, 0.22, 25);
keke.rotation.y = Math.PI;
world.add(keke);

const taxi = createCar('#d34b3e', 0.9);
taxi.position.set(2.7, 0.22, -78);
world.add(taxi);

const blueCar = createCar('#2e7fa3', 0.84);
blueCar.position.set(-2.8, 0.22, 72);
blueCar.rotation.y = Math.PI;
world.add(blueCar);

const marketVan = createCar('#f3c332', 1.05);
marketVan.position.set(78, 0.22, 31);
marketVan.rotation.y = -Math.PI / 2;
world.add(marketVan);

const movingTraffic = [
  { object: danfo, axis: 'x', direction: 1, speed: 7.2, min: -82, max: 82, fixed: -31 },
  { object: keke, axis: 'z', direction: -1, speed: 5.4, min: -25, max: 25, fixed: 48 },
  { object: taxi, axis: 'z', direction: 1, speed: 6.4, min: -80, max: 80, fixed: 2.7 },
  { object: blueCar, axis: 'z', direction: -1, speed: 5.8, min: -80, max: 80, fixed: -2.8 },
  { object: marketVan, axis: 'x', direction: -1, speed: 6.8, min: -82, max: 82, fixed: 31 },
];

const projectStops = [
  {
    category: 'BRANDING / VISUAL DESIGN',
    name: 'Branding & Visual Design',
    description: 'A selection of identity and campaign work, including K.O.T.O. brand boards and the Sacerdoge event poster.',
    position: [-25, -52],
    size: [18, 11, 13],
    color: '#d63d3d',
    sign: 'BRANDING',
    panelImage: 'branding-koto-identity.webp',
    panelAspect: 680 / 1420,
    images: [
      { title: 'K.O.T.O. Identity System', file: 'branding-koto-identity.webp', aspect: 680 / 1420, note: 'Identity directions, marks, palette and applications.' },
      { title: 'K.O.T.O. Streetwear Campaign', file: 'branding-koto-streetwear.webp', aspect: 680 / 2100, note: 'Streetwear identity and campaign graphics.' },
      { title: 'Sacerdoge Event Poster', file: 'branding-sacerdoge-poster.webp', aspect: 1080 / 1350, note: 'Cinematic event key art for an SFC gathering.' },
    ],
  },
  {
    category: 'WEB / INTERACTIVE',
    name: 'Web Projects',
    description: 'Three interface concepts shown in Olamide’s existing portfolio; titles are carried over from its project cards.',
    position: [25, -51],
    size: [18, 9, 13],
    color: '#e7a927',
    sign: 'WEB STUDIO',
    panelImage: 'web-avia-dashboard.webp',
    panelAspect: 1,
    images: [
      { title: 'Avia — Dashboard UI', file: 'web-avia-dashboard.webp', aspect: 1, note: 'Dashboard concept shown on the existing portfolio card.' },
      { title: 'Inventory Tracker', file: 'web-inventory-tracker.webp', aspect: 1, note: 'Inventory management interface concept.' },
      { title: 'E-commerce Dashboard', file: 'web-ecommerce-dashboard.webp', aspect: 1, note: 'E-commerce analytics dashboard concept.' },
    ],
  },
  {
    category: '3D / EXPERIMENTS',
    name: '3D Experiments · In Progress',
    description: 'I found no clear finished 3D project export in the scanned portfolio folders, so this stop is marked honestly as a work in progress.',
    position: [26, 50],
    size: [17, 12, 12],
    color: '#257c78',
    sign: '3D + EXPERIMENTS',
    panelImage: '3d-experiments-preview.svg',
    panelAspect: 4 / 3,
    images: [
      { title: '3D Experiments — Work in Progress', file: '3d-experiments-preview.svg', aspect: 4 / 3, note: 'A placeholder until finished 3D work is ready to feature.' },
    ],
  },
];

const stops = [];
const beaconDots = [];
const textureLoader = new THREE.TextureLoader();
const portfolioAsset = (file) => `${import.meta.env.BASE_URL}artwork/${file}`;

projectStops.forEach((project) => {
  const building = addBuilding({
    x: project.position[0],
    z: project.position[1],
    width: project.size[0],
    height: project.size[1],
    depth: project.size[2],
    color: project.color,
    roof: '#262529',
    sign: project.sign,
    signColor: '#162d38',
  });
  building.userData.name = project.name;
  building.userData.description = project.description;
  building.userData.category = project.category;
  building.userData.images = project.images;
  stops.push(building);

  const maxPanelWidth = 6.5;
  const maxPanelHeight = 4.8;
  const panelWidth = Math.min(maxPanelWidth, maxPanelHeight * project.panelAspect);
  const panelHeight = panelWidth / project.panelAspect;
  const panelY = Math.min(project.size[1] - panelHeight / 2 - 1.15, 7.4);
  const panelZ = project.size[2] / 2 + 0.23;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(panelWidth + 0.34, panelHeight + 0.34, 0.26),
    new THREE.MeshStandardMaterial({ color: '#182129', metalness: 0.26, roughness: 0.58 }),
  );
  frame.position.set(0, panelY, panelZ - 0.08);
  frame.castShadow = true;
  building.add(frame);

  const panelTexture = textureLoader.load(portfolioAsset(project.panelImage));
  panelTexture.colorSpace = THREE.SRGBColorSpace;
  panelTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const artworkPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(panelWidth, panelHeight),
    new THREE.MeshBasicMaterial({ map: panelTexture, toneMapped: false }),
  );
  artworkPanel.position.set(0, panelY, panelZ + 0.06);
  building.add(artworkPanel);
  if (project.position[1] > 0) building.rotation.y = Math.PI;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6.2, 6.45, 48),
    new THREE.MeshBasicMaterial({ color: '#f8db52', side: THREE.DoubleSide, transparent: true, opacity: 0.86 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(project.position[0], 0.3, project.position[1]);
  world.add(ring);

  for (let dotIndex = 0; dotIndex < 6; dotIndex += 1) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshBasicMaterial({ color: '#fff07a' }),
    );
    dot.position.set(project.position[0], project.size[1] + 2 + dotIndex * 0.85, project.position[1]);
    dot.userData.phase = dotIndex * 0.55;
    beaconDots.push(dot);
    world.add(dot);
  }
});

const soundToggle = document.querySelector('#sound-toggle');
const soundToggleLabel = document.querySelector('#sound-toggle-label');
const soundNote = document.querySelector('#sound-note');

class LagosSoundscape {
  constructor() {
    this.context = null;
    this.master = null;
    this.started = false;
    this.muted = false;
    this.randomHornTimer = null;
  }

  createNoiseBuffer(seconds = 4) {
    const frameCount = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    let lastValue = 0;
    for (let index = 0; index < frameCount; index += 1) {
      const white = Math.random() * 2 - 1;
      lastValue = lastValue * 0.985 + white * 0.015;
      channel[index] = white * 0.22 + lastValue * 1.5;
    }
    return buffer;
  }

  createAmbientLayer({ frequency, gain, pan, playbackRate = 1 }) {
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const volume = this.context.createGain();
    const panner = this.context.createStereoPanner();
    source.buffer = this.createNoiseBuffer();
    source.loop = true;
    source.playbackRate.value = playbackRate;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.72;
    volume.gain.value = gain;
    panner.pan.value = pan;
    source.connect(filter).connect(volume).connect(panner).connect(this.master);
    source.start();
  }

  start() {
    if (this.started) {
      this.context.resume();
      this.setMuted(false);
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.48;
    this.master.connect(this.context.destination);
    this.createAmbientLayer({ frequency: 220, gain: 0.42, pan: -0.2, playbackRate: 0.74 });
    this.createAmbientLayer({ frequency: 950, gain: 0.12, pan: 0.35, playbackRate: 1.18 });
    this.createAmbientLayer({ frequency: 2100, gain: 0.05, pan: -0.5, playbackRate: 0.92 });

    const rumble = this.context.createOscillator();
    const rumbleGain = this.context.createGain();
    rumble.type = 'triangle';
    rumble.frequency.value = 46;
    rumbleGain.gain.value = 0.028;
    rumble.connect(rumbleGain).connect(this.master);
    rumble.start();

    this.started = true;
    this.setMuted(false);
    this.scheduleRandomHorn();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.48, this.context.currentTime, 0.04);
    }
    soundToggle.setAttribute('aria-pressed', String(this.started && !muted));
    soundToggleLabel.textContent = this.started && !muted ? 'Mute Lagos sound' : 'Start Lagos sound';
    soundNote.textContent = this.started
      ? muted ? 'Street sound muted' : 'Ambient traffic + random horns active'
      : 'Sound begins after your first click';
  }

  toggle() {
    if (!this.started) this.start();
    else this.setMuted(!this.muted);
  }

  horn(intensity = 1) {
    if (!this.started || this.muted || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const hornGain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const panner = this.context.createStereoPanner();
    filter.type = 'lowpass';
    filter.frequency.value = 1600;
    panner.pan.value = Math.random() * 1.4 - 0.7;
    hornGain.gain.setValueAtTime(0.0001, now);
    hornGain.gain.exponentialRampToValueAtTime(0.15 * intensity, now + 0.025);
    hornGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    hornGain.connect(filter).connect(panner).connect(this.master);
    [310, 390].forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      oscillator.type = index ? 'square' : 'sawtooth';
      oscillator.frequency.setValueAtTime(frequency * (0.96 + Math.random() * 0.08), now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.94, now + 0.4);
      oscillator.connect(hornGain);
      oscillator.start(now);
      oscillator.stop(now + 0.45);
    });
  }

  scheduleRandomHorn() {
    window.clearTimeout(this.randomHornTimer);
    this.randomHornTimer = window.setTimeout(() => {
      if (!this.muted) this.horn(0.45 + Math.random() * 0.35);
      this.scheduleRandomHorn();
    }, 4500 + Math.random() * 8500);
  }
}

const soundscape = new LagosSoundscape();
soundToggle.addEventListener('click', () => soundscape.toggle());

const pressedKeys = new Set();
const movement = {
  speed: 0,
  heading: Math.PI,
  steering: 0,
  velocity: new THREE.Vector2(),
  acceleration: 11.5,
  reverseAcceleration: 8,
  brakeStrength: 17,
  maxForwardSpeed: 21,
  maxReverseSpeed: 7.5,
  drag: 4.2,
  turnSpeed: 1.9,
};

const cameraLook = { yaw: 0, pitch: 0.24 };
const cameraTarget = new THREE.Vector3();
const desiredCameraPosition = new THREE.Vector3();
const forwardVector = new THREE.Vector3();
const targetVelocity = new THREE.Vector2();
const carCollisionRadius = 1.3;
let collisionMessageUntil = 0;

function collidesWithSolid(x, z) {
  const hitsStaticProp = solidColliders.some((collider) => {
    if (collider.type === 'circle') {
      const offsetX = x - collider.x;
      const offsetZ = z - collider.z;
      const combinedRadius = carCollisionRadius + collider.radius;
      return offsetX * offsetX + offsetZ * offsetZ < combinedRadius * combinedRadius;
    }
    const nearestX = THREE.MathUtils.clamp(x, collider.minX, collider.maxX);
    const nearestZ = THREE.MathUtils.clamp(z, collider.minZ, collider.maxZ);
    const offsetX = x - nearestX;
    const offsetZ = z - nearestZ;
    return offsetX * offsetX + offsetZ * offsetZ < carCollisionRadius * carCollisionRadius;
  });

  if (hitsStaticProp) return true;
  return movingTraffic.some(({ object }) => {
    const offsetX = x - object.position.x;
    const offsetZ = z - object.position.z;
    return offsetX * offsetX + offsetZ * offsetZ < 3.1 * 3.1;
  });
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (key === 'enter' && !event.repeat && nearbyStop && !activeStop) {
    event.preventDefault();
    showProjectPopup(nearbyStop);
    return;
  }
  if (key === 'escape' && activeStop) {
    event.preventDefault();
    hideProjectPopup();
    return;
  }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
    event.preventDefault();
    if (activeStop) return;
    pressedKeys.add(key);
  }
  if (key === 'h' && !event.repeat) {
    event.preventDefault();
    if (!soundscape.started) soundscape.start();
    soundscape.horn(1);
  }
});

window.addEventListener('keyup', (event) => pressedKeys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => pressedKeys.clear());

canvas.addEventListener('click', () => {
  if (!soundscape.started) soundscape.start();
  if (!projectPopup.classList.contains('is-visible') && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas) return;
  cameraLook.yaw -= event.movementX * 0.0024;
  cameraLook.pitch = THREE.MathUtils.clamp(cameraLook.pitch - event.movementY * 0.0018, 0.05, 0.62);
});

const mouseHint = document.querySelector('#mouse-hint');
document.addEventListener('pointerlockchange', () => {
  const isLocked = document.pointerLockElement === canvas;
  document.body.classList.toggle('is-driving', isLocked);
  mouseHint.textContent = isLocked ? 'Mouse look active · Esc to release' : 'Click the street to enable mouse look';
});

function updateMovement(deltaTime) {
  const movingForward = pressedKeys.has('w') || pressedKeys.has('arrowup');
  const movingBackward = pressedKeys.has('s') || pressedKeys.has('arrowdown');
  const turningLeft = pressedKeys.has('a') || pressedKeys.has('arrowleft');
  const turningRight = pressedKeys.has('d') || pressedKeys.has('arrowright');
  const throttle = Number(movingForward) - Number(movingBackward);
  const steeringTarget = Number(turningLeft) - Number(turningRight);
  movement.steering = THREE.MathUtils.lerp(movement.steering, steeringTarget, 1 - Math.exp(-8 * deltaTime));

  if (movingForward) {
    const acceleration = movement.speed < -0.5 ? movement.brakeStrength : movement.acceleration;
    movement.speed += acceleration * deltaTime;
  }
  if (movingBackward) {
    const acceleration = movement.speed > 0.5 ? movement.brakeStrength : movement.reverseAcceleration;
    movement.speed -= acceleration * deltaTime;
  }

  if (!movingForward && !movingBackward) {
    const slowdown = movement.drag * deltaTime;
    movement.speed = Math.abs(movement.speed) <= slowdown
      ? 0
      : movement.speed - Math.sign(movement.speed) * slowdown;
  }

  movement.speed = THREE.MathUtils.clamp(movement.speed, -movement.maxReverseSpeed, movement.maxForwardSpeed);

  if (Math.abs(movement.speed) > 0.1) {
    const speedRatio = THREE.MathUtils.clamp(Math.abs(movement.speed) / movement.maxForwardSpeed, 0.18, 1);
    const steeringGrip = THREE.MathUtils.lerp(1.2, 0.72, speedRatio);
    movement.heading += movement.steering * movement.turnSpeed * steeringGrip * deltaTime * Math.sign(movement.speed);
  }

  forwardVector.set(Math.sin(movement.heading), 0, Math.cos(movement.heading));
  targetVelocity.set(forwardVector.x * movement.speed, forwardVector.z * movement.speed);
  const speedRatio = THREE.MathUtils.clamp(Math.abs(movement.speed) / movement.maxForwardSpeed, 0, 1);
  const grip = 1 - Math.exp(-THREE.MathUtils.lerp(8.5, 3.2, speedRatio) * deltaTime);
  movement.velocity.lerp(targetVelocity, grip);
  const nextX = THREE.MathUtils.clamp(playerCar.position.x + movement.velocity.x * deltaTime, -86, 86);
  const nextZ = THREE.MathUtils.clamp(playerCar.position.z + movement.velocity.y * deltaTime, -86, 86);
  let hitSolid = false;

  if (!collidesWithSolid(nextX, playerCar.position.z)) playerCar.position.x = nextX;
  else {
    movement.velocity.x *= -0.16;
    hitSolid = true;
  }

  if (!collidesWithSolid(playerCar.position.x, nextZ)) playerCar.position.z = nextZ;
  else {
    movement.velocity.y *= -0.16;
    hitSolid = true;
  }

  if (hitSolid) {
    movement.speed *= -0.16;
    collisionMessageUntil = performance.now() + 850;
  }
  playerCar.rotation.y = movement.heading;
  const chassis = playerCar.userData.chassis;
  const bodySmoothing = 1 - Math.exp(-7 * deltaTime);
  chassis.rotation.z = THREE.MathUtils.lerp(chassis.rotation.z, -movement.steering * speedRatio * 0.13, bodySmoothing);
  chassis.rotation.x = THREE.MathUtils.lerp(chassis.rotation.x, -throttle * 0.035 + Math.abs(movement.steering) * speedRatio * 0.018, bodySmoothing);
  chassis.position.y = Math.sin(performance.now() * 0.012) * Math.min(speedRatio * 0.018, 0.018);

  playerCar.userData.wheels.forEach((wheel) => {
    wheel.rotation.x += movement.speed * deltaTime * 1.8;
  });
}

function updateTraffic(deltaTime) {
  movingTraffic.forEach((vehicle) => {
    vehicle.object.position[vehicle.axis] += vehicle.direction * vehicle.speed * deltaTime;
    if (vehicle.object.position[vehicle.axis] > vehicle.max) vehicle.direction = -1;
    if (vehicle.object.position[vehicle.axis] < vehicle.min) vehicle.direction = 1;
    vehicle.object.position[vehicle.axis === 'x' ? 'z' : 'x'] = vehicle.fixed;
    vehicle.object.rotation.y = vehicle.axis === 'x'
      ? vehicle.direction > 0 ? Math.PI / 2 : -Math.PI / 2
      : vehicle.direction > 0 ? 0 : Math.PI;
    vehicle.object.userData.wheels.forEach((wheel) => {
      wheel.rotation.x += vehicle.speed * deltaTime * 1.6;
    });
  });
}

function updateStreetLife(elapsedTime, deltaTime) {
  animatedStreetLife.forEach((person) => {
    const walking = person.axis && person.distance > 0;
    const stride = walking ? Math.sin(elapsedTime * 3.2 + person.phase) : Math.sin(elapsedTime * 1.7 + person.phase) * 0.2;
    person.legs[0].rotation.x = stride * 0.5;
    person.legs[1].rotation.x = -stride * 0.5;
    person.vendor.rotation.z = THREE.MathUtils.lerp(person.vendor.rotation.z, Math.sin(elapsedTime * 2 + person.phase) * 0.015, 1 - Math.exp(-5 * deltaTime));
    if (walking) {
      person.vendor.position[person.axis] = person.origin + Math.sin(elapsedTime * 0.42 + person.phase) * person.distance;
      person.vendor.rotation.y = Math.cos(elapsedTime * 0.42 + person.phase) > 0
        ? person.axis === 'x' ? Math.PI / 2 : 0
        : person.axis === 'x' ? -Math.PI / 2 : Math.PI;
    }
  });
}

function updateCamera(deltaTime) {
  const orbitAngle = movement.heading + cameraLook.yaw;
  const horizontalDistance = 10.5 * Math.cos(cameraLook.pitch);
  desiredCameraPosition.set(
    playerCar.position.x - Math.sin(orbitAngle) * horizontalDistance,
    playerCar.position.y + 3.3 + Math.sin(cameraLook.pitch) * 8,
    playerCar.position.z - Math.cos(orbitAngle) * horizontalDistance,
  );
  const cameraSmoothing = 1 - Math.exp(-6 * deltaTime);
  camera.position.lerp(desiredCameraPosition, cameraSmoothing);
  cameraTarget.copy(playerCar.position).add(new THREE.Vector3(0, 1.25, 0));
  camera.lookAt(cameraTarget);
}

const statusText = document.querySelector('#status-text');
const projectPopup = document.querySelector('#project-popup');
const projectPopupEyebrow = document.querySelector('#project-popup-eyebrow');
const projectPopupTitle = document.querySelector('#project-popup-title');
const projectPopupDescription = document.querySelector('#project-popup-description');
const projectPopupGallery = document.querySelector('#project-popup-gallery');
const projectPopupClose = document.querySelector('#project-popup-close');
const stopPrompt = document.querySelector('#stop-prompt');
const stopPromptLabel = document.querySelector('#stop-prompt-label');
const stopTriggerDistance = 14;
let activeStop = null;
let nearbyStop = null;

function showProjectPopup(stop) {
  activeStop = stop;
  projectPopupEyebrow.textContent = stop.userData.category;
  projectPopupTitle.textContent = stop.userData.name;
  projectPopupDescription.textContent = stop.userData.description;
  projectPopupGallery.replaceChildren(...stop.userData.images.map((image) => {
    const card = document.createElement('article');
    card.className = 'project-card';
    const figure = document.createElement('figure');
    figure.className = 'project-card__image';
    const img = document.createElement('img');
    img.src = portfolioAsset(image.file);
    img.alt = image.title;
    img.loading = 'lazy';
    figure.append(img);
    const title = document.createElement('h3');
    title.textContent = image.title;
    const note = document.createElement('p');
    note.textContent = image.note;
    card.append(figure, title, note);
    return card;
  }));
  projectPopup.classList.add('is-visible');
  projectPopup.setAttribute('aria-hidden', 'false');
  stopPrompt.classList.remove('is-visible');
  stopPrompt.setAttribute('aria-hidden', 'true');
  pressedKeys.clear();
  movement.speed = 0;
  movement.velocity.set(0, 0);
  if (document.pointerLockElement === canvas) document.exitPointerLock();
}

function hideProjectPopup() {
  activeStop = null;
  projectPopup.classList.remove('is-visible');
  projectPopup.setAttribute('aria-hidden', 'true');
}

projectPopupClose.addEventListener('click', () => {
  hideProjectPopup();
});

function updateNearestStop() {
  let nearestStop = null;
  let nearestDistance = Infinity;

  stops.forEach((stop) => {
    const distance = playerCar.position.distanceTo(stop.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStop = stop;
    }
  });

  const isInsideStop = nearestDistance < stopTriggerDistance;
  nearbyStop = isInsideStop ? nearestStop : null;
  statusText.textContent = performance.now() < collisionMessageUntil
    ? 'Easy! Lagos traffic is tight here'
    : isInsideStop
      ? `Portfolio stop nearby · ${nearestStop.userData.name}`
      : `Cruising Lagos · ${Math.round(Math.abs(movement.speed) * 5)} km/h`;

  if (!isInsideStop) {
    if (activeStop) hideProjectPopup();
  }

  if (isInsideStop && !activeStop) {
    stopPromptLabel.textContent = `Browse ${nearestStop.userData.name}`;
    stopPrompt.classList.add('is-visible');
    stopPrompt.setAttribute('aria-hidden', 'false');
  } else {
    stopPrompt.classList.remove('is-visible');
    stopPrompt.setAttribute('aria-hidden', 'true');
  }
}

const clock = new THREE.Clock();

function animate() {
  const elapsedTime = clock.elapsedTime;
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  updateMovement(deltaTime);
  updateTraffic(deltaTime);
  updateStreetLife(elapsedTime, deltaTime);
  updateCamera(deltaTime);
  updateNearestStop();
  beaconDots.forEach((dot) => {
    dot.scale.setScalar(0.82 + Math.sin(elapsedTime * 3 + dot.userData.phase) * 0.22);
  });
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

camera.position.set(0, 7, 78);
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});
