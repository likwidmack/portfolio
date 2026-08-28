import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- 1. Chromatic Aberration Shader Definition ---
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.005 }, // Adjust for more/less color fringing
  },
  vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
  fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float amount;
        varying vec2 vUv;
        void main() {
            // Offset the RGB channels slightly
            vec2 offset = vec2(amount, 0.0);
            float r = texture2D(tDiffuse, vUv + offset).r;
            float g = texture2D(tDiffuse, vUv).g;
            float b = texture2D(tDiffuse, vUv - offset).b;
            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `,
};

// 1. Scene & Environment Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 2. DNA Structural Parameters
const NUM_BASE_PAIRS = 50;
const HELIX_RADIUS = 5;
const VERTICAL_SPACING = 0.8;
const ROTATION_PER_BP = 0.4; // Radians
const BACKBONE_RADIUS = 0.3;
const GROOVE_OFFSET = 2.1; // Approximately 120 degrees in radians (instead of Math.PI)
const jitterParticles = [];
// --- 2. Thermal Vibration Logic ---
const VIBRATION_INTENSITY = 0.02; // Adjust for more/less "heat"

// --- Glass-like Material Settings ---
const glassProps = {
  transparent: true,
  opacity: 0.75, // High transparency
  metalness: 0.1, // Slight metallic sheen
  roughness: 0.05, // Very smooth surface
  transmission: 0.9, // Key for glass: allows light to pass through
  ior: 1.5, // Index of Refraction (1.5 is standard glass)
  thickness: 1, // Simulated volume
  specularIntensity: 1.0,
  clearcoat: 1.0, // Extra layer of shine
  clearcoatRoughness: 0.0,
};

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.1, // Strength: High for that "neon" bleed
  0.05, // Radius: How far the glow spreads
  0.25 // Threshold: Only bright objects glow
);
composer.addPass(bloomPass);

const bokehPass = new BokehPass(scene, camera, {
  focus: 40.0, // Distance to the center of the DNA
  aperture: 0.001, // Small aperture for shallow focus
  maxblur: 0.005, // Maximum blur for background proteins
  width: window.innerWidth,
  height: window.innerHeight,
});
composer.addPass(bokehPass);

const chromaticPass = new ShaderPass(ChromaticAberrationShader);
composer.addPass(chromaticPass);

const createGlowMat = (color, emissiveColor) =>
  new THREE.MeshPhysicalMaterial({
    ...glassProps,
    color,
    emissive: emissiveColor || color,
    emissiveIntensity: 0.4, // High intensity triggers the BloomPass
  });
//  new THREE.MeshStandardMaterial({
//    color: color,
//    emissive: color,
//    emissiveIntensity: 2, // High intensity triggers the BloomPass
//    roughness: 0.2
//  });

// 3. Materials (Color-coded by scientific convention)
const sugarPhosphateMaterial = createGlowMat(0xffffff);
const adenineMat = createGlowMat(0xff3333, 0x440000); // Red
const thymineMat = createGlowMat(0x3333ff, 0x000044); // Blue
const cytosineMat = createGlowMat(0x33ff33, 0x004400); // Green
const guanineMat = createGlowMat(0xffff33, 0x444400); // Yellow

// --- Solvation Shell (Hydration Layer) ---
const shellHeight = NUM_BASE_PAIRS * VERTICAL_SPACING;
const shellGeometry = new THREE.CylinderGeometry(
  HELIX_RADIUS + 2, // Radius slightly larger than the helix
  HELIX_RADIUS + 2,
  shellHeight,
  32,
  1,
  true // Open ended
);

const shellMaterial = new THREE.MeshPhongMaterial({
  color: 0x00aaff, // Light watery blue
  transparent: true,
  opacity: 0.25, // Very faint
  side: THREE.DoubleSide,
  shininess: 100,
});

const solvationShell = new THREE.Mesh(shellGeometry, shellMaterial);
const dnaHelixGroup = new THREE.Group();

// 1a. Arrays to store the path points for both strands
const strand1Points = [];
const strand2Points = [];

// --- Phosphodiester Bonds (Phosphate Groups) ---
const phosphateMaterial = new THREE.MeshStandardMaterial({
  color: 0xffff00, // Bright Yellow for Phosphorus
  emissive: 0x333300, // Slight glow
});
const phosphateGeometry = new THREE.SphereGeometry(0.2); // Smaller than the sugar spheres

const addPhosphateGroups = (points) => {
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    // Calculate the midpoint between two sugar molecules
    const midPoint = new THREE.Vector3().lerpVectors(p1, p2, 0.5);

    const phosphate = new THREE.Mesh(phosphateGeometry, phosphateMaterial);
    phosphate.position.copy(midPoint);

    dnaHelixGroup.add(phosphate);
  }
};

// Add to both strands
addPhosphateGroups(strand1Points);
addPhosphateGroups(strand2Points);

// Center the shell on the DNA group
solvationShell.position.y = 0;
dnaHelixGroup.add(solvationShell);

for (let i = 0; i < NUM_BASE_PAIRS; i++) {
  const angle = i * ROTATION_PER_BP;
  const yPos = i * VERTICAL_SPACING - (NUM_BASE_PAIRS * VERTICAL_SPACING) / 2;

  // --- Sugar-Phosphate Backbone (Asymmetric Offset) ---
  // Strand 1 (Reference)
  const x1 = Math.cos(angle) * HELIX_RADIUS;
  const z1 = Math.sin(angle) * HELIX_RADIUS;

  // Strand 2 (Offset to create Major/Minor grooves)
  const x2 = Math.cos(angle + GROOVE_OFFSET) * HELIX_RADIUS;
  const z2 = Math.sin(angle + GROOVE_OFFSET) * HELIX_RADIUS;

  // Store points for the curves
  strand1Points.push(new THREE.Vector3(x1, yPos, z1));
  strand2Points.push(new THREE.Vector3(x2, yPos, z2));

  const backbone1 = new THREE.Mesh(new THREE.SphereGeometry(BACKBONE_RADIUS), sugarPhosphateMaterial);
  backbone1.position.set(x1, yPos, z1);
  dnaHelixGroup.add(backbone1);

  const backbone2 = new THREE.Mesh(new THREE.SphereGeometry(BACKBONE_RADIUS), sugarPhosphateMaterial);
  backbone2.position.set(x2, yPos, z2);
  dnaHelixGroup.add(backbone2);

  // --- Nitrogenous Base Pairs (Connecting the asymmetric strands) ---
  const isATPair = Math.random() > 0.5;
  const leftBaseMat = isATPair ? adenineMat : cytosineMat;
  const rightBaseMat = isATPair ? thymineMat : guanineMat;

  // Calculate midpoint to split the "rung" into two colored halves
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;

  // Create Base 1 (From Strand 1 to Midpoint)
  const base1Geom = new THREE.CylinderGeometry(0.15, 0.15, 1); // Length will be scaled
  const base1 = new THREE.Mesh(base1Geom, leftBaseMat);

  // Position and stretch the base to bridge the gap
  const startVec = new THREE.Vector3(x1, yPos, z1);
  const midVec = new THREE.Vector3(midX, yPos, midZ);
  const dist = startVec.distanceTo(midVec);

  base1.scale.set(1, dist, 1);
  base1.position.copy(startVec.clone().lerp(midVec, 0.5));
  base1.lookAt(midVec);
  base1.rotateX(Math.PI / 2);
  dnaHelixGroup.add(base1);

  // Create Base 2 (From Midpoint to Strand 2)
  const endVec = new THREE.Vector3(x2, yPos, z2);
  const base2 = new THREE.Mesh(base1Geom, rightBaseMat);

  base2.scale.set(1, dist, 1);
  base2.position.copy(midVec.clone().lerp(endVec, 0.5));
  base2.lookAt(endVec);
  base2.rotateX(Math.PI / 2);
  dnaHelixGroup.add(base2);

  // --- Hydrogen Bonds (Connecting Nitrogenous Bases) ---
  const numBonds = isATPair ? 2 : 3; // A-T has 2, C-G has 3
  const bondMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bondGeometry = new THREE.SphereGeometry(0.05); // Tiny dots for the bond

  for (let j = 0; j < numBonds; j++) {
    const hydrogenBond = new THREE.Mesh(bondGeometry, bondMaterial);

    // Offset the bonds vertically so they don't overlap
    const verticalOffset = (j - (numBonds - 1) / 2) * 0.15;

    // Place exactly at the midpoint (the "Hydrogen Bond" interface)
    hydrogenBond.position.set((x1 + x2) / 2, yPos + verticalOffset, (z1 + z2) / 2);

    dnaHelixGroup.add(hydrogenBond);
  }
}

// 2a. Create the Continuous Backbone Tubes
const createBackboneTube = (points) => {
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeometry = new THREE.TubeGeometry(curve, NUM_BASE_PAIRS * 4, 0.15, 8, false);
  return new THREE.Mesh(tubeGeometry, sugarPhosphateMaterial);
};

const backboneLine1 = createBackboneTube(strand1Points);
const backboneLine2 = createBackboneTube(strand2Points);

dnaHelixGroup.add(backboneLine1, backboneLine2);

scene.add(dnaHelixGroup);

// 4. Lighting & Camera
//const pointLight = new THREE.PointLight(0xffffff, 1, 100);
//pointLight.position.set(10, 10, 10);
//scene.add(pointLight, new THREE.AmbientLight(0x404040));
camera.position.z = 40;

const clock = new THREE.Clock();
const bioLight = new THREE.PointLight(0x00ffff, 2, 50); // Cyan glow
bioLight.position.set(0, 0, 10);
scene.add(bioLight);

const ambientLight = new THREE.AmbientLight(0x112244, 0.5); // Deep blue fill
scene.add(ambientLight);

// --- 1. Nucleoplasm Fog (Depth & Atmosphere) ---
// Use a deep indigo or dark purple to represent the dense nuclear interior
scene.fog = new THREE.FogExp2(0x0a0515, 0.02);
scene.background = new THREE.Color(0x0a0515);

// --- 2. Nuclear Environment (Distant Chromatin) ---
const nucleusGeom = new THREE.SphereGeometry(60, 32, 32);
const nucleusMat = new THREE.MeshPhongMaterial({
  color: 0xaaaaaa, // 0x1a0a2a,
  side: THREE.BackSide, // View from the inside
  transparent: true,
  opacity: 0.8,
  shininess: 10,
});

const nuclearEnvelope = new THREE.Mesh(nucleusGeom, nucleusMat);
scene.add(nuclearEnvelope);

// --- 3. Distant "Floating" Proteins (Noise) ---
// Add small, blurry spheres to represent histones or other nuclear proteins
for (let i = 0; i < 100; i++) {
  const proteinGeom = new THREE.SphereGeometry(Math.random() * 0.5);
  const proteinMat = new THREE.MeshBasicMaterial({
    color: 0x442266,
    transparent: true,
    opacity: 0.4,
  });
  const protein = new THREE.Mesh(proteinGeom, proteinMat);

  // Randomly scatter in the background
  protein.position.set((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80);
  scene.add(protein);
}

// --- 5. Final Polish & Animation ---
camera.position.set(10, 5, 20);
const controls = new OrbitControls(camera, renderer.domElement);

// 5. Animation Loop
function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // --- Dynamic Bioluminescence ---
  // Intensity pulses between 1.0 and 3.0
  // bioLight.intensity = 2 + Math.sin(elapsed * 1.5) * 1.0;
  bioLight.intensity = 15;
  bioLight.distance = 100;
  bioLight.color.setHSL(0.5 + Math.sin(elapsed * 0.5) * 0.1, 1, 0.5);

  dnaHelixGroup.rotation.y += 0.005; // Slow rotation of the whole molecule
  dnaHelixGroup.rotation.x += 0.001;

  chromaticPass.uniforms.amount.value = 0.003 + Math.sin(elapsed * 2.0) * 0.001;

  // Apply Brownian Motion to each part
  jitterParticles.forEach((particle) => {
    // Store the original position if not already stored
    if (!particle.userData.origin) {
      particle.userData.origin = particle.position.clone();
    }

    // Apply a small random offset from the origin
    particle.position.x = particle.userData.origin.x + (Math.random() - 0.5) * VIBRATION_INTENSITY;
    particle.position.y = particle.userData.origin.y + (Math.random() - 0.5) * VIBRATION_INTENSITY;
    particle.position.z = particle.userData.origin.z + (Math.random() - 0.5) * VIBRATION_INTENSITY;
  });

  controls.update();
  composer.render();
  // renderer.render(scene, camera);
}
animate();

// Handle resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
