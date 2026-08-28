import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export const TESSERACT_REFERENCE_IMAGES = {
  schlegelWireframe: '/img/tesseract/schlegel-wireframe-8-cell.png',
  blueSimple: '/img/tesseract/blue-8-cell-simple.png',
} as const;

export interface TesseractModelOptions {
  outerSize?: number;
  innerSize?: number;
  rodRadius?: number;
  nodeRadius?: number;
  showReferenceImages?: boolean;
  referenceImageUrls?: readonly string[];
}

export interface TesseractSceneOptions extends TesseractModelOptions {
  autoRotate?: boolean;
  backgroundColor?: THREE.ColorRepresentation;
  cameraPosition?: THREE.Vector3Tuple;
}

export interface MountedTesseractScene {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  dispose: () => void;
  group: THREE.Group;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
}

const DEFAULT_REFERENCE_IMAGE_URLS = [
  TESSERACT_REFERENCE_IMAGES.schlegelWireframe,
  TESSERACT_REFERENCE_IMAGES.blueSimple,
];

const EDGE_INDICES: readonly [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 4],
  [1, 3],
  [1, 5],
  [2, 3],
  [2, 6],
  [3, 7],
  [4, 5],
  [4, 6],
  [5, 7],
  [6, 7],
];

export function createCubeVertices(size: number): THREE.Vector3[] {
  const half = size / 2;

  return [
    new THREE.Vector3(-half, -half, -half),
    new THREE.Vector3(half, -half, -half),
    new THREE.Vector3(-half, half, -half),
    new THREE.Vector3(half, half, -half),
    new THREE.Vector3(-half, -half, half),
    new THREE.Vector3(half, -half, half),
    new THREE.Vector3(-half, half, half),
    new THREE.Vector3(half, half, half),
  ];
}

export function createTesseractModel(options: TesseractModelOptions = {}): THREE.Group {
  const {
    innerSize = 2.7,
    nodeRadius = 0.16,
    outerSize = 5,
    referenceImageUrls = DEFAULT_REFERENCE_IMAGE_URLS,
    rodRadius = 0.055,
    showReferenceImages = true,
  } = options;

  const group = new THREE.Group();
  group.name = 'tesseract';

  const rodMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9c1d6,
    metalness: 0.82,
    roughness: 0.22,
  });
  const innerRodMaterial = new THREE.MeshStandardMaterial({
    color: 0x6fa3ff,
    emissive: 0x173b7f,
    emissiveIntensity: 0.35,
    metalness: 0.42,
    roughness: 0.18,
  });
  const nodeMaterial = new THREE.MeshStandardMaterial({
    color: 0xd5ad12,
    emissive: 0x3c2800,
    emissiveIntensity: 0.45,
    metalness: 0.9,
    roughness: 0.18,
  });

  const outerVertices = createCubeVertices(outerSize);
  const innerVertices = createCubeVertices(innerSize);

  addCubeEdges(group, outerVertices, rodRadius, rodMaterial);
  addCubeEdges(group, innerVertices, rodRadius * 0.8, innerRodMaterial);
  addConnectorEdges(group, outerVertices, innerVertices, rodRadius, rodMaterial);
  addNodes(group, outerVertices, nodeRadius * 1.35, nodeMaterial);
  addNodes(group, innerVertices, nodeRadius, nodeMaterial);

  if (showReferenceImages) {
    addReferenceImagePlanes(group, referenceImageUrls, outerSize);
  }

  return group;
}

export function mountTesseract(container: HTMLElement, options: TesseractSceneOptions = {}): MountedTesseractScene {
  const { autoRotate = true, backgroundColor = 0x05070c, cameraPosition = [5.5, 4.2, 7.5], ...modelOptions } = options;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);
  scene.fog = new THREE.Fog(backgroundColor, 8, 24);

  const camera = new THREE.PerspectiveCamera(55, getAspect(container), 0.1, 200);
  camera.position.set(...cameraPosition);

  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;

  const group = createTesseractModel(modelOptions);
  scene.add(group);

  scene.add(new THREE.AmbientLight(0xffffff, 0.42));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(6, 7, 8);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x7aa2ff, 0.7);
  rimLight.position.set(-8, 2, -5);
  scene.add(rimLight);

  let frameId = 0;
  const resize = () => {
    camera.aspect = getAspect(container);
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  };
  const animate = () => {
    frameId = window.requestAnimationFrame(animate);

    if (autoRotate) {
      group.rotation.x += 0.0018;
      group.rotation.y += 0.0032;
    }

    controls.update();
    renderer.render(scene, camera);
  };

  window.addEventListener('resize', resize);
  animate();

  return {
    camera,
    controls,
    group,
    renderer,
    scene,
    dispose: () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
      disposeObject(group);
    },
  };
}

function addCubeEdges(
  group: THREE.Group,
  vertices: readonly THREE.Vector3[],
  radius: number,
  material: THREE.Material
): void {
  for (const [startIndex, endIndex] of EDGE_INDICES) {
    group.add(createRod(vertices[startIndex], vertices[endIndex], radius, material));
  }
}

function addConnectorEdges(
  group: THREE.Group,
  outerVertices: readonly THREE.Vector3[],
  innerVertices: readonly THREE.Vector3[],
  radius: number,
  material: THREE.Material
): void {
  for (let index = 0; index < outerVertices.length; index++) {
    group.add(createRod(outerVertices[index], innerVertices[index], radius, material));
  }
}

function addNodes(
  group: THREE.Group,
  vertices: readonly THREE.Vector3[],
  radius: number,
  material: THREE.Material
): void {
  const geometry = new THREE.SphereGeometry(radius, 32, 16);

  for (const vertex of vertices) {
    const node = new THREE.Mesh(geometry, material);
    node.position.copy(vertex);
    group.add(node);
  }
}

function addReferenceImagePlanes(group: THREE.Group, imageUrls: readonly string[], outerSize: number): void {
  const loader = new THREE.TextureLoader();
  const planeWidth = outerSize * 0.55;
  const planeHeight = outerSize * 0.55;

  imageUrls.slice(0, 2).forEach((imageUrl, index) => {
    const texture = loader.load(imageUrl);
    texture.colorSpace = THREE.SRGBColorSpace;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(planeWidth, planeHeight),
      new THREE.MeshBasicMaterial({
        depthWrite: false,
        map: texture,
        opacity: 0.22,
        side: THREE.DoubleSide,
        transparent: true,
      })
    );
    plane.name = `tesseract-reference-${index + 1}`;
    plane.position.set(index === 0 ? -outerSize * 0.8 : outerSize * 0.8, -outerSize * 0.72, -outerSize * 0.9);
    plane.rotation.y = index === 0 ? Math.PI * 0.12 : -Math.PI * 0.12;
    group.add(plane);
  });
}

function createRod(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 18);
  const rod = new THREE.Mesh(geometry, material);

  rod.position.copy(midpoint);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

  return rod;
}

function getAspect(container: HTMLElement): number {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  return width / Math.max(height, 1);
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments)) {
      return;
    }

    child.geometry.dispose();
    disposeMaterial(child.material);
  });
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  const materials = Array.isArray(material) ? material : [material];

  for (const item of materials) {
    const texturedMaterial = item as THREE.Material & { map?: THREE.Texture };

    texturedMaterial.map?.dispose();
    item.dispose();
  }
}
