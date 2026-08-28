import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 1. Scene Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 1. OrbitControls (Zoom/Rotate) ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; //

// --- 2. Raycaster for Selection ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dnaGroup = new THREE.Group();
scene.add(dnaGroup);

// 2. Constants for DNA Geometry
const numNucleotides = 50;
const helixRadius = 5;
const verticalSpacing = 0.6;
const rotationStep = 0.4; // Twist rate of the helix

// 3. Materials representing different components
const backboneMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc }); // Sugar-Phosphate
const adenineMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 }); // Adenine (Red)
const thymineMaterial = new THREE.MeshPhongMaterial({ color: 0x4444ff }); // Thymine (Blue)
const cytosineMaterial = new THREE.MeshPhongMaterial({ color: 0x44ff44 }); // Cytosine (Green)
const guanineMaterial = new THREE.MeshPhongMaterial({ color: 0xffff44 }); // Guanine (Yellow)

// 4. Helper to create a base pair (the "rungs")
const createBasePairRung = (pos1, pos2, mat1, mat2) => {
  const midPoint = new THREE.Vector3().addVectors(pos1, pos2).multiplyScalar(0.5);

  // Half-rung for first base
  const geom1 = new THREE.CylinderGeometry(0.15, 0.15, pos1.distanceTo(midPoint));
  const base1 = new THREE.Mesh(geom1, mat1);
  base1.position.copy(pos1).lerp(midPoint, 0.5);
  base1.lookAt(pos2);
  base1.rotateX(Math.PI / 2);
  scene.add(base1);

  // Half-rung for second base
  const geom2 = new THREE.CylinderGeometry(0.15, 0.15, pos2.distanceTo(midPoint));
  const base2 = new THREE.Mesh(geom2, mat2);
  base2.position.copy(pos2).lerp(midPoint, 0.5);
  base2.lookAt(pos1);
  base2.rotateX(Math.PI / 2);
  scene.add(base2);
};

// 5. Construct the Double Helix
for (let i = 0; i < numNucleotides; i++) {
  const angle = i * rotationStep;
  const y = i * verticalSpacing - (numNucleotides * verticalSpacing) / 2;

  // Strand 1 (5' to 3') Position
  const pos1 = new THREE.Vector3(Math.cos(angle) * helixRadius, y, Math.sin(angle) * helixRadius);
  const backboneNode1 = new THREE.Mesh(new THREE.SphereGeometry(0.4), backboneMaterial);
  backboneNode1.position.copy(pos1);
  scene.add(backboneNode1);

  // Strand 2 (3' to 5' - Antiparallel) Position
  const pos2 = new THREE.Vector3(Math.cos(angle + Math.PI) * helixRadius, y, Math.sin(angle + Math.PI) * helixRadius);
  const backboneNode2 = new THREE.Mesh(new THREE.SphereGeometry(0.4), backboneMaterial);
  backboneNode2.position.copy(pos2);
  scene.add(backboneNode2);

  // Assign Complementary Base Pairs (A-T or C-G)
  if (Math.random() > 0.5) {
    createBasePairRung(pos1, pos2, adenineMaterial, thymineMaterial);
  } else {
    createBasePairRung(pos1, pos2, cytosineMaterial, guanineMaterial);
  }
}

// --- 4. Click Interaction Logic ---
window.addEventListener('click', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(dnaGroup.children); //
  if (intersects.length > 0) {
    console.log('Clicked:', intersects[0].object.name); //
  }
});

// 6. Lighting and Camera
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(10, 10, 10);
scene.add(light, new THREE.AmbientLight(0x404040));
camera.position.z = 25;

// 7. Animation Loop
scene.add(new THREE.DirectionalLight(0xffffff, 1), new THREE.AmbientLight(0x404040));
//camera.position.set(15, 5, 20);
function animate() {
  requestAnimationFrame(animate);
  controls.update(); //
  scene.rotation.y += 0.01; // Spin the DNA
  renderer.render(scene, camera);
}
animate();
