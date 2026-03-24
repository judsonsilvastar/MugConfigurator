import * as THREE from 'three';

const TARGET_HEIGHT = 1.5;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function matchesAnyName(meshName: string, patterns: string[]): boolean {
  const n = norm(meshName);
  if (!n) return false;
  return patterns.some((p) => norm(p) === n);
}

function disposeMaterial(m: THREE.Material): void {
  m.dispose();
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) {
        mat.forEach(disposeMaterial);
      } else if (mat) {
        disposeMaterial(mat);
      }
    }
  });
}

function isPbrMaterial(
  m: THREE.Material
): m is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial;
}

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) meshes.push(o);
  });
  return meshes;
}

export interface LoadedGltfMug {
  root: THREE.Group;
  designMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[];
  bodyMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[];
  disposeModel: () => void;
}

export async function loadMugFromGltf(
  url: string,
  designMeshNames: string[],
  interiorMeshNames: string[]
): Promise<LoadedGltfMug> {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();

  const gltf = await new Promise<{
    scene: THREE.Group;
  }>((resolve, reject) => {
    loader.load(
      url,
      (g) => resolve(g as { scene: THREE.Group }),
      undefined,
      reject
    );
  });

  const root = gltf.scene;
  root.updateMatrixWorld(true);

  const meshes = collectMeshes(root);

  let designMeshes: THREE.Mesh[];
  if (designMeshNames.length > 0) {
    designMeshes = meshes.filter((m) => matchesAnyName(m.name, designMeshNames));
    if (designMeshes.length === 0) {
      console.warn(
        `[MugConfigurator] No mesh matched MUG_DESIGN_MESH_NAMES (${designMeshNames.join(', ')}). Using first mesh.`
      );
      designMeshes = meshes.length > 0 ? [meshes[0]] : [];
    }
  } else {
    if (meshes.length === 0) {
      throw new Error('[MugConfigurator] GLTF contains no meshes.');
    }
    console.warn(
      '[MugConfigurator] MUG_DESIGN_MESH_NAMES is empty; using the first mesh for the design texture. Set names in src/config/mugModel.ts.'
    );
    designMeshes = [meshes[0]];
  }

  const designMeshSet = new Set(designMeshes);

  const designMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[] = [];
  const bodyMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[] = [];

  for (const mesh of meshes) {
    const isInterior =
      interiorMeshNames.length > 0 && matchesAnyName(mesh.name, interiorMeshNames);
    const isDesign = designMeshSet.has(mesh);

    const sourceMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const newMats = sourceMats.map((mat) => {
      const m = mat.clone();
      if (!isPbrMaterial(m)) {
        return m;
      }
      m.needsUpdate = true;
      if (isInterior) {
        m.color.set(0xffffff);
        m.roughness = Math.min(m.roughness, 0.45);
        return m;
      }
      if (isDesign) {
        designMaterials.push(m);
        return m;
      }
      bodyMaterials.push(m);
      return m;
    });
    mesh.material = newMats.length === 1 ? newMats[0] : newMats;
  }

  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1e-6);
  const scale = TARGET_HEIGHT / maxDim;

  root.position.sub(center);
  root.scale.setScalar(scale);

  const wrapper = new THREE.Group();
  wrapper.add(root);

  return {
    root: wrapper,
    designMaterials,
    bodyMaterials,
    disposeModel: () => {
      disposeObject3D(wrapper);
    },
  };
}
