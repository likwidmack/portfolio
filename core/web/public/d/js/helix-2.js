import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const NUM_BASE_PAIRS = 50;
const HELIX_RADIUS = 5;
const VERTICAL_SPACING = 0.8;
const ROTATION_PER_BP = 0.4; // Radians
const BACKBONE_RADIUS = 0.3;
const GROOVE_OFFSET = 2.1; // Approximately 120 degrees in radians (instead of Math.PI)

// --- 1. Scene & Renderer ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x010103); // Deep space black
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping; // Better for glow/HDR
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);

// --- 2. Post-Processing (The "Bloom" Effect) ---
const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.05, // Strength: High for that "neon" bleed
  0.02, // Radius: How far the glow spreads
  0.05 // Threshold: Only bright objects glow
);

// Add Focus (Depth of Field / Bokeh)
const bokehPass = new BokehPass(scene, camera, {
  focus: 20.0, // Distance to the focused area (matches camera.position.z)
  aperture: 0.02, // Smaller = more blur in background
  maxblur: 0.005, // Maximum amount of blur
  width: window.innerWidth,
  height: window.innerHeight,
});

composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(bokehPass);

// --- 3. Geometric Components (Refencing Image Aesthetic) ---
const dnaGroup = new THREE.Group();
scene.add(dnaGroup);

const createGlowMat = (color) =>
  new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: 2, // High intensity triggers the BloomPass
    roughness: 0.2,
  });

const baseMaterials = [
  createGlowMat(0xcc0044), // Adenine (Pink)
  createGlowMat(0x00cccc), // Thymine (Cyan)
  createGlowMat(0x7fff00), // Cytosine (Lime)
  createGlowMat(0xffaa00), // Guanine (Gold)
];

const backboneMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  transmission: 1.0,
  thickness: 0.5,
  roughness: 0.05,
  transparent: true,
  opacity: 0.6,
});

// Build the Helix
for (let i = 0; i < 80; i++) {
  const angle = i * 0.35;
  const y = i * 0.4 - 15;

  // Strands (Sugar-Phosphate Backbone)
  const pos1 = new THREE.Vector3(Math.cos(angle) * 5, y, Math.sin(angle) * 5);
  const pos2 = new THREE.Vector3(Math.cos(angle + Math.PI) * 5, y, Math.sin(angle + Math.PI) * 5);

  const node = new THREE.SphereGeometry(0.3, 16, 16);
  const s1 = new THREE.Mesh(node, backboneMat);
  const s2 = new THREE.Mesh(node, backboneMat);
  s1.position.copy(pos1);
  s2.position.copy(pos2);
  dnaGroup.add(s1, s2);

  // Complementary Rungs (Nitrogenous Bases)
  const mid = new THREE.Vector3().lerpVectors(pos1, pos2, 0.5);
  const pair = i % 2 === 0 ? [baseMaterials[0], baseMaterials[1]] : [baseMaterials[2], baseMaterials[3]];

  const rungGeom = new THREE.CylinderGeometry(0.08, 0.08, pos1.distanceTo(mid), 8);
  const r1 = new THREE.Mesh(rungGeom, pair[0]);
  const r2 = new THREE.Mesh(rungGeom, pair[1]);

  r1.position.copy(pos1).lerp(mid, 0.5);
  r1.lookAt(mid);
  r1.rotateX(Math.PI / 2);

  r2.position.copy(pos2).lerp(mid, 0.5);
  r2.lookAt(mid);
  r2.rotateX(Math.PI / 2);

  dnaGroup.add(r1, r2);
}

// --- 4. Floating Particle Field (Molecular Dust) ---
const particleCount = 1000;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i++) {
  particlePositions[i] = (Math.random() - 0.5) * 60; // Random spread
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
  size: 0.08,
  color: 0xffffff,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending, // Makes them glow when overlapping
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// --- 5. Final Polish & Animation ---
camera.position.set(10, 5, 20);
const controls = new OrbitControls(camera, renderer.domElement);

function animate() {
  requestAnimationFrame(animate);

  // Slow DNA rotation
  dnaGroup.rotation.y += 0.003;
  dnaGroup.rotation.z += 0.001;

  // Apply Brownian Motion to each part
  jitterParticles.forEach((particle) => {
    // Store original position if not already stored
    if (!particle.userData.origin) {
      particle.userData.origin = particle.position.clone();
    }

    // Apply a small random offset from the origin
    particle.position.x = particle.userData.origin.x + (Math.random() - 0.5) * VIBRATION_INTENSITY;
    particle.position.y = particle.userData.origin.y + (Math.random() - 0.5) * VIBRATION_INTENSITY;
    particle.position.z = particle.userData.origin.z + (Math.random() - 0.5) * VIBRATION_INTENSITY;
  });

  // Subtle particle drift
  particles.rotation.y += 0.0005;
  particles.position.y += Math.sin(Date.now() * 0.001) * 0.005;

  controls.update();
  composer.render(); // Use composer instead of renderer
}
animate();

// Handle resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
