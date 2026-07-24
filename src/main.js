import * as THREE from 'three';
import './style.css';

// -----------------------------------------------------------------------------
// 1. Core Three.js setup
// -----------------------------------------------------------------------------
// A scene holds every 3D object. The camera decides what we see, and the
// renderer draws that view into the canvas on every animation frame.
const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.1,
  250,
);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// Build a simple two-color canvas texture for the sky. Later, this can be
// replaced with an HDR environment, a cube texture, or a custom GLSL shader.
function createGradientSky() {
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2;
  skyCanvas.height = 512;
  const context = skyCanvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, skyCanvas.height);

  gradient.addColorStop(0, '#111a45');
  gradient.addColorStop(0.55, '#3f5790');
  gradient.addColorStop(1, '#e9b37a');
  context.fillStyle = gradient;
  context.fillRect(0, 0, skyCanvas.width, skyCanvas.height);

  const texture = new THREE.CanvasTexture(skyCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

scene.background = createGradientSky();
scene.fog = new THREE.Fog('#7b83a0', 42, 130);

// -----------------------------------------------------------------------------
// 2. Lighting
// -----------------------------------------------------------------------------
// Ambient light softly fills every surface. Directional light behaves like a
// distant sun and creates the scene's stronger highlights and shadows.
const ambientLight = new THREE.AmbientLight('#9bb7ff', 1.2);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight('#fff1d2', 3.5);
sunLight.position.set(-18, 28, 14);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -45;
sunLight.shadow.camera.right = 45;
sunLight.shadow.camera.top = 45;
sunLight.shadow.camera.bottom = -45;
scene.add(sunLight);

// -----------------------------------------------------------------------------
// 3. The world: ground, road markings, and portfolio project stops
// -----------------------------------------------------------------------------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(180, 180),
  new THREE.MeshStandardMaterial({ color: '#20283a', roughness: 0.92 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// A few strips make the empty plane feel like a route through the portfolio.
const routeMaterial = new THREE.MeshStandardMaterial({
  color: '#80ffe8',
  emissive: '#1d8f82',
  emissiveIntensity: 0.35,
});

for (let z = -70; z <= 60; z += 8) {
  const marker = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 3.1), routeMaterial);
  marker.position.set(0, 0.02, z);
  scene.add(marker);
}

// Add future portfolio items here. Each object describes one visible project
// stop; changing this array is the easiest way to grow the starter scene.
const projectStops = [
  { name: 'Brand Identity', position: [-12, 2.5, -10], size: [7, 5, 7], color: '#ff7a59' },
  { name: 'Web Design', position: [12, 4, -24], size: [8, 8, 8], color: '#7c6cff' },
  { name: 'Motion', position: [-15, 3.5, -40], size: [9, 7, 7], color: '#ffd166' },
  { name: 'Experiments', position: [14, 5, -58], size: [7, 10, 7], color: '#4de1c1' },
  { name: 'About Me', position: [-11, 4, -72], size: [8, 8, 8], color: '#f26ca7' },
];

const stops = [];

projectStops.forEach((project) => {
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(...project.size),
    new THREE.MeshStandardMaterial({
      color: project.color,
      roughness: 0.45,
      metalness: 0.08,
    }),
  );

  building.position.set(...project.position);
  building.castShadow = true;
  building.receiveShadow = true;
  building.userData.name = project.name;
  scene.add(building);
  stops.push(building);

  // A glowing ring makes each box read as a destination rather than scenery.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(Math.max(project.size[0], project.size[2]) * 0.62, 0.08, 12, 48),
    new THREE.MeshBasicMaterial({ color: project.color }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(project.position[0], 0.12, project.position[2]);
  scene.add(ring);
});

// -----------------------------------------------------------------------------
// 4. Drive controls
// -----------------------------------------------------------------------------
// The camera acts like a lightweight car: forward/back keys add acceleration,
// left/right keys steer, and drag gradually slows the vehicle after release.
const pressedKeys = new Set();
const movement = {
  speed: 0,
  heading: Math.PI,
  acceleration: 15,
  reverseAcceleration: 10,
  maxForwardSpeed: 18,
  maxReverseSpeed: 7,
  drag: 5,
  turnSpeed: 1.65,
};

camera.position.set(0, 2.3, 10);

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
    event.preventDefault();
    pressedKeys.add(key);
  }
});

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.key.toLowerCase());
});

function updateMovement(deltaTime) {
  const movingForward = pressedKeys.has('w') || pressedKeys.has('arrowup');
  const movingBackward = pressedKeys.has('s') || pressedKeys.has('arrowdown');
  const turningLeft = pressedKeys.has('a') || pressedKeys.has('arrowleft');
  const turningRight = pressedKeys.has('d') || pressedKeys.has('arrowright');

  if (movingForward) movement.speed += movement.acceleration * deltaTime;
  if (movingBackward) movement.speed -= movement.reverseAcceleration * deltaTime;

  if (!movingForward && !movingBackward) {
    const slowdown = movement.drag * deltaTime;
    if (Math.abs(movement.speed) <= slowdown) movement.speed = 0;
    else movement.speed -= Math.sign(movement.speed) * slowdown;
  }

  movement.speed = THREE.MathUtils.clamp(
    movement.speed,
    -movement.maxReverseSpeed,
    movement.maxForwardSpeed,
  );

  // Steering reverses naturally while backing up, similar to a simple car.
  if (Math.abs(movement.speed) > 0.08) {
    const steeringDirection = Math.sign(movement.speed);
    const steeringAmount = movement.turnSpeed * deltaTime * steeringDirection;
    if (turningLeft) movement.heading += steeringAmount;
    if (turningRight) movement.heading -= steeringAmount;
  }

  camera.position.x += Math.sin(movement.heading) * movement.speed * deltaTime;
  camera.position.z += Math.cos(movement.heading) * movement.speed * deltaTime;

  // Keep the starter camera inside the authored world until real collisions
  // are added with a physics library such as Rapier.
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -82, 82);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -82, 82);
  camera.rotation.set(0, movement.heading, 0);
}

// Update the small HTML status label when the camera approaches a project box.
const statusText = document.querySelector('#status-text');

function updateNearestStop() {
  let nearestStop = null;
  let nearestDistance = Infinity;

  stops.forEach((stop) => {
    const distance = camera.position.distanceTo(stop.position);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestStop = stop;
    }
  });

  statusText.textContent = nearestDistance < 13
    ? `Now approaching: ${nearestStop.userData.name}`
    : 'Explore the project stops';
}

// -----------------------------------------------------------------------------
// 5. Animation loop and responsive resizing
// -----------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  const deltaTime = Math.min(clock.getDelta(), 0.05);
  updateMovement(deltaTime);
  updateNearestStop();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
});
