'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import styles from './Canvas3D.module.css';
import {
  getMugModelUrl,
  getMugOrbitExcludeNames,
  MUG_DESIGN_MESH_NAMES,
  MUG_INTERIOR_MESH_NAMES,
  MUG_ORBIT_CENTER_MESH_NAMES,
} from '@/config/mugModel';
import { loadMugFromGltf } from '@/lib/loadMugGltf';

interface MugDesign {
  cupColor: string;
}

interface Canvas3DProps {
  design: MugDesign;
  designTextureUrl: string | null;
}

const MATTE_ROUGHNESS = 0.92;
const INTERIOR_ROUGHNESS = 0.35;

/** Uniform scale for the mug in the viewport (GLB + procedural). */
const MUG_DISPLAY_SCALE = 0.82;

const ORBIT_RADIANS_PER_PIXEL = 0.004;
/** Angular damping after release (higher = stops sooner), ~rad/s decay scale. */
const SPIN_DAMPING = 3.2;
const MIN_SPIN_VELOCITY = 0.00015;
/** Idle turntable speed (rad/s), horizontal orbit only. */
const AUTO_ROTATE_SPEED = 0.58;

/** World Y of the ground surface (shadow receiver). */
const GROUND_SURFACE_Y = -0.92;

/** PCF soft shadow edge blur (higher = softer, Three.js `LightShadow.radius`). */
const SHADOW_BLUR_RADIUS = 16;

/** Procedural handle mesh: excluded from orbit pivot (cylinder axis only). */
const PROCEDURAL_HANDLE_ORBIT_NAME = '__mugOrbitExclude';

function meshNameMatchesList(meshName: string, patterns: string[]): boolean {
  const n = meshName.trim().toLowerCase();
  if (!n) return false;
  return patterns.some((p) => n === String(p).trim().toLowerCase());
}

function shouldExcludeMeshFromOrbitPivot(mesh: THREE.Mesh, excludePatterns: string[]): boolean {
  if (mesh.name === PROCEDURAL_HANDLE_ORBIT_NAME) return true;
  const n = mesh.name.trim().toLowerCase();
  if (n.includes('handle')) return true;
  return meshNameMatchesList(mesh.name, excludePatterns);
}

/**
 * Orbit target = center of cup cylinder (not handle).
 * Priority: MUG_ORBIT_CENTER_MESH_NAMES → union of MUG_DESIGN_MESH_NAMES →
 * center of largest non-excluded mesh by volume (body vs handle) → full model.
 */
function computeOrbitPivotFromMugBody(root: THREE.Object3D, out: THREE.Vector3): void {
  root.updateMatrixWorld(true);
  const orbitCenterNames = MUG_ORBIT_CENTER_MESH_NAMES;
  const designNames = MUG_DESIGN_MESH_NAMES;
  const excludePatterns = getMugOrbitExcludeNames();

  const meshBox = new THREE.Box3();
  const size = new THREE.Vector3();

  if (orbitCenterNames.length > 0) {
    const union = new THREE.Box3();
    let hasMesh = false;
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!meshNameMatchesList(obj.name, orbitCenterNames)) return;
      meshBox.setFromObject(obj);
      if (!hasMesh) {
        union.copy(meshBox);
        hasMesh = true;
      } else {
        union.union(meshBox);
      }
    });
    if (hasMesh) {
      union.getCenter(out);
      return;
    }
  }

  if (designNames.length > 0) {
    let hasMesh = false;
    const union = new THREE.Box3();
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (!meshNameMatchesList(obj.name, designNames)) return;
      meshBox.setFromObject(obj);
      if (!hasMesh) {
        union.copy(meshBox);
        hasMesh = true;
      } else {
        union.union(meshBox);
      }
    });
    if (hasMesh) {
      union.getCenter(out);
      return;
    }
  }

  let bestMesh: THREE.Mesh | null = null;
  let bestVol = -1;
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (shouldExcludeMeshFromOrbitPivot(obj, excludePatterns)) return;
    meshBox.setFromObject(obj);
    meshBox.getSize(size);
    const vol = Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z);
    if (vol > bestVol) {
      bestVol = vol;
      bestMesh = obj;
    }
  });

  if (bestMesh) {
    meshBox.setFromObject(bestMesh);
    meshBox.getCenter(out);
  } else {
    new THREE.Box3().setFromObject(root).getCenter(out);
  }
}

function restMugOnGround(root: THREE.Object3D, groundY: number, orbitTargetOut: THREE.Vector3): void {
  root.updateMatrixWorld(true);
  const fullBox = new THREE.Box3().setFromObject(root);
  root.position.y += groundY - fullBox.min.y;
  root.updateMatrixWorld(true);
  computeOrbitPivotFromMugBody(root, orbitTargetOut);
}

function createMatteBodyMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: color.clone(),
    roughness: MATTE_ROUGHNESS,
    metalness: 0,
  });
}

function createInteriorMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: INTERIOR_ROUGHNESS,
    metalness: 0,
  });
}

function applyColorToMaterials(
  materials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[],
  color: THREE.Color
): void {
  materials.forEach((mat) => {
    mat.color.copy(color);
    mat.needsUpdate = true;
  });
}

function setMeshesCastShadow(root: THREE.Object3D, cast: boolean): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = cast;
    }
  });
}

interface ProceduralMug {
  group: THREE.Group;
  designMaterials: THREE.MeshStandardMaterial[];
  bodyMaterials: THREE.MeshStandardMaterial[];
  geometries: THREE.BufferGeometry[];
  disposableMaterials: THREE.Material[];
}

function buildProceduralMug(cupColor: THREE.Color): ProceduralMug {
  const rTop = 1;
  const rBot = 0.9;
  const h = 1.5;
  const halfH = h / 2;
  const innerTopR = 0.88;
  const innerBotR = 0.85;
  const innerH = 1.44;

  const sideMaterial = createMatteBodyMaterial(cupColor);
  const bottomMaterial = createMatteBodyMaterial(cupColor);
  const rimOuterMaterial = createMatteBodyMaterial(cupColor);
  const handleMaterial = createMatteBodyMaterial(cupColor);

  const whiteInterior = createInteriorMaterial();
  const whiteRimInner = createInteriorMaterial();

  const designMaterials = [sideMaterial];
  const bodyMaterials = [bottomMaterial, rimOuterMaterial, handleMaterial];

  const mugGroup = new THREE.Group();

  const sideGeometry = new THREE.CylinderGeometry(rTop, rBot, h, 64, 1, true);
  const side = new THREE.Mesh(sideGeometry, sideMaterial);
  mugGroup.add(side);

  const bottomGeometry = new THREE.CircleGeometry(rBot, 64);
  bottomGeometry.rotateX(-Math.PI / 2);
  const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
  bottom.position.y = -halfH;
  mugGroup.add(bottom);

  const innerBottomGeometry = new THREE.CircleGeometry(innerBotR, 64);
  innerBottomGeometry.rotateX(-Math.PI / 2);
  const innerBottom = new THREE.Mesh(innerBottomGeometry, whiteInterior);
  innerBottom.position.y = -halfH + 0.002;
  mugGroup.add(innerBottom);

  const innerWallGeometry = new THREE.CylinderGeometry(innerTopR, innerBotR, innerH, 64, 1, true);
  const innerWall = new THREE.Mesh(innerWallGeometry, whiteInterior);
  innerWall.position.y = -halfH + innerH / 2 + 0.01;
  mugGroup.add(innerWall);

  const rimY = halfH - 0.004;
  const rimWhiteGeometry = new THREE.RingGeometry(0.88, 0.95, 64);
  const rimWhite = new THREE.Mesh(rimWhiteGeometry, whiteRimInner);
  rimWhite.rotation.x = -Math.PI / 2;
  rimWhite.position.y = rimY;
  mugGroup.add(rimWhite);

  const rimBlackGeometry = new THREE.RingGeometry(0.95, rTop, 64);
  const rimBlack = new THREE.Mesh(rimBlackGeometry, rimOuterMaterial);
  rimBlack.rotation.x = -Math.PI / 2;
  rimBlack.position.y = rimY + 0.001;
  mugGroup.add(rimBlack);

  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(rTop * 0.98, 0.5, 0),
    new THREE.Vector3(1.36, 0.1, 0),
    new THREE.Vector3(1.36, -0.12, 0),
    new THREE.Vector3(rTop * 0.98, -0.44, 0),
  ]);
  const handleGeometry = new THREE.TubeGeometry(handleCurve, 48, 0.068, 12, false);
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.name = PROCEDURAL_HANDLE_ORBIT_NAME;
  mugGroup.add(handle);

  const geometries: THREE.BufferGeometry[] = [
    sideGeometry,
    bottomGeometry,
    innerBottomGeometry,
    innerWallGeometry,
    rimWhiteGeometry,
    rimBlackGeometry,
    handleGeometry,
  ];

  const disposableMaterials: THREE.Material[] = [
    sideMaterial,
    bottomMaterial,
    rimOuterMaterial,
    handleMaterial,
    whiteInterior,
    whiteRimInner,
  ];

  return {
    group: mugGroup,
    designMaterials,
    bodyMaterials,
    geometries,
    disposableMaterials,
  };
}

const Canvas3D: React.FC<Canvas3DProps> = ({ design, designTextureUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const designMaterialsRef = useRef<(THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[]>([]);
  const bodyMaterialsRef = useRef<(THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[]>([]);
  const designRef = useRef(design);
  designRef.current = design;

  const modelUrl = getMugModelUrl();
  const [modelReady, setModelReady] = useState(() => !modelUrl);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    const orbitTarget = new THREE.Vector3(0, 0, 0);
    camera.position.set(2.85, 1.1, 2.85);
    camera.lookAt(orbitTarget);

    let orbitRadius = camera.position.distanceTo(orbitTarget);
    let orbitAzimuth = Math.atan2(camera.position.x, camera.position.z);
    let orbitElevation = Math.asin(
      THREE.MathUtils.clamp(camera.position.y / orbitRadius, -1, 1)
    );

    const applyOrbitCamera = () => {
      const horizontal = orbitRadius * Math.cos(orbitElevation);
      camera.position.set(
        orbitTarget.x + horizontal * Math.sin(orbitAzimuth),
        orbitTarget.y + orbitRadius * Math.sin(orbitElevation),
        orbitTarget.z + horizontal * Math.cos(orbitAzimuth)
      );
      camera.lookAt(orbitTarget);
    };

    const syncOrbitFromCamera = () => {
      const dx = camera.position.x - orbitTarget.x;
      const dy = camera.position.y - orbitTarget.y;
      const dz = camera.position.z - orbitTarget.z;
      orbitRadius = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (orbitRadius < 1e-4) orbitRadius = 4;
      orbitAzimuth = Math.atan2(dx, dz);
      orbitElevation = Math.asin(THREE.MathUtils.clamp(dy / orbitRadius, -1, 1));
      applyOrbitCamera();
    };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const fitRendererToContainer = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width < 1 || height < 1) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    fitRendererToContainer();
    container.appendChild(renderer.domElement);
    const canvasEl = renderer.domElement;
    canvasEl.style.touchAction = 'none';

    let pointerDragging = false;
    let lastPointerX = 0;
    let lastMoveTime = performance.now();
    let angularVelocity = 0;
    /** +1 / -1: idle auto-rotation follows last meaningful drag / spin direction. */
    let autoRotateSign = 1;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerDragging = true;
      angularVelocity = 0;
      lastPointerX = e.clientX;
      lastMoveTime = performance.now();
      canvasEl.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDragging) return;
      const now = performance.now();
      const dt = Math.min(Math.max((now - lastMoveTime) / 1000, 0.0001), 0.08);
      lastMoveTime = now;
      const dx = e.clientX - lastPointerX;
      lastPointerX = e.clientX;
      const deltaAzimuth = -dx * ORBIT_RADIANS_PER_PIXEL;
      angularVelocity = deltaAzimuth / dt;
      if (dx !== 0) {
        autoRotateSign = Math.sign(deltaAzimuth) || autoRotateSign;
      }
      orbitAzimuth += deltaAzimuth;
      applyOrbitCamera();
    };

    const endDrag = (e: PointerEvent) => {
      if (!pointerDragging) return;
      pointerDragging = false;
      if (Math.abs(angularVelocity) > MIN_SPIN_VELOCITY) {
        autoRotateSign = Math.sign(angularVelocity) || autoRotateSign;
      }
      try {
        canvasEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };

    const onLostPointerCapture = () => {
      pointerDragging = false;
    };

    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointermove', onPointerMove);
    canvasEl.addEventListener('pointerup', endDrag);
    canvasEl.addEventListener('pointercancel', endDrag);
    canvasEl.addEventListener('lostpointercapture', onLostPointerCapture);

    const resizeObserver = new ResizeObserver(() => fitRendererToContainer());
    resizeObserver.observe(container);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(ambientLight);

    const hemi = new THREE.HemisphereLight(0xb8c0cc, 0x3a3d44, 0.28);
    scene.add(hemi);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.95);
    directionalLight.position.set(4.2, 9.5, 4.5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    directionalLight.shadow.radius = SHADOW_BLUR_RADIUS;
    directionalLight.shadow.camera.near = 0.4;
    directionalLight.shadow.camera.far = 28;
    directionalLight.shadow.camera.left = -5;
    directionalLight.shadow.camera.right = 5;
    directionalLight.shadow.camera.top = 5;
    directionalLight.shadow.camera.bottom = -5;
    directionalLight.shadow.bias = -0.0002;
    directionalLight.shadow.normalBias = 0.02;
    scene.add(directionalLight);

    const fill = new THREE.DirectionalLight(0xaabbdd, 0.08);
    fill.position.set(-3.5, 3, -2.5);
    scene.add(fill);

    const groundRadius = 8;
    const groundGeometry = new THREE.CircleGeometry(groundRadius, 64);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.45 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_SURFACE_Y;
    ground.receiveShadow = true;
    scene.add(ground);

    let mugGroup: THREE.Group;
    let disposeMug: () => void = () => {};
    let proceduralGeometries: THREE.BufferGeometry[] = [];

    const cupColor = new THREE.Color(designRef.current.cupColor);

    if (modelUrl) {
      designMaterialsRef.current = [];
      bodyMaterialsRef.current = [];
      mugGroup = new THREE.Group();

      loadMugFromGltf(modelUrl, MUG_DESIGN_MESH_NAMES, MUG_INTERIOR_MESH_NAMES)
        .then((loaded) => {
          if (cancelled) {
            loaded.disposeModel();
            return;
          }
          designMaterialsRef.current = loaded.designMaterials;
          bodyMaterialsRef.current = loaded.bodyMaterials;
          mugGroup = loaded.root;
          mugGroup.scale.setScalar(MUG_DISPLAY_SCALE);
          disposeMug = loaded.disposeModel;
          scene.add(mugGroup);
          setMeshesCastShadow(mugGroup, true);
          restMugOnGround(mugGroup, GROUND_SURFACE_Y, orbitTarget);
          syncOrbitFromCamera();
          const c = new THREE.Color(designRef.current.cupColor);
          applyColorToMaterials(loaded.designMaterials, c);
          applyColorToMaterials(loaded.bodyMaterials, c);
          setModelReady(true);
        })
        .catch((err) => {
          console.error('[MugConfigurator] Failed to load GLTF:', modelUrl, err);
        });
    } else {
      const proc = buildProceduralMug(cupColor);
      proceduralGeometries = proc.geometries;
      designMaterialsRef.current = proc.designMaterials;
      bodyMaterialsRef.current = proc.bodyMaterials;
      mugGroup = proc.group;
      mugGroup.scale.setScalar(MUG_DISPLAY_SCALE);
      scene.add(mugGroup);
      setMeshesCastShadow(mugGroup, true);
      restMugOnGround(mugGroup, GROUND_SURFACE_Y, orbitTarget);
      syncOrbitFromCamera();
      disposeMug = () => {
        proc.disposableMaterials.forEach((m) => {
          const mm = m as THREE.MeshStandardMaterial;
          mm.map?.dispose();
          m.dispose();
        });
        proceduralGeometries.forEach((g) => g.dispose());
      };
      setModelReady(true);
    }

    let animationId: number;
    let lastFrameTime = performance.now();
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastFrameTime) / 1000, 0.1);
      lastFrameTime = now;

      if (!pointerDragging) {
        if (Math.abs(angularVelocity) > MIN_SPIN_VELOCITY) {
          angularVelocity *= Math.exp(-SPIN_DAMPING * dt);
        }
        const absV = Math.abs(angularVelocity);
        const omega =
          absV >= AUTO_ROTATE_SPEED ? angularVelocity : autoRotateSign * AUTO_ROTATE_SPEED;
        if (absV > MIN_SPIN_VELOCITY) {
          autoRotateSign = Math.sign(angularVelocity) || autoRotateSign;
        }
        orbitAzimuth += omega * dt;
        applyOrbitCamera();
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleWindowResize = () => fitRendererToContainer();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointermove', onPointerMove);
      canvasEl.removeEventListener('pointerup', endDrag);
      canvasEl.removeEventListener('pointercancel', endDrag);
      canvasEl.removeEventListener('lostpointercapture', onLostPointerCapture);
      cancelAnimationFrame(animationId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      const uniqueMaps = new Set<THREE.Texture>();
      designMaterialsRef.current.forEach((m) => {
        if (m.map) uniqueMaps.add(m.map);
      });
      uniqueMaps.forEach((t) => t.dispose());
      designMaterialsRef.current.forEach((m) => {
        m.map = null;
      });
      disposeMug();
      groundGeometry.dispose();
      groundMaterial.dispose();
      renderer.dispose();
      designMaterialsRef.current = [];
      bodyMaterialsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!modelReady) return;
    const color = new THREE.Color(design.cupColor);
    applyColorToMaterials(designMaterialsRef.current, color);
    applyColorToMaterials(bodyMaterialsRef.current, color);
  }, [design.cupColor, modelReady]);

  useEffect(() => {
    if (!modelReady) return;

    const mats = designMaterialsRef.current;
    if (mats.length === 0) return;

    let texCancelled = false;

    const clearMaps = () => {
      mats.forEach((sideMat) => {
        if (sideMat.map) {
          sideMat.map.dispose();
          sideMat.map = null;
        }
        sideMat.needsUpdate = true;
      });
    };

    if (!designTextureUrl) {
      clearMaps();
      return () => {
        texCancelled = true;
      };
    }

    const prevMaps = mats.map((m) => m.map);
    const loader = new THREE.TextureLoader();
    loader.load(
      designTextureUrl,
      (tex: THREE.Texture) => {
        if (texCancelled) {
          tex.dispose();
          return;
        }
        const current = designMaterialsRef.current;
        if (current.length !== mats.length || current.some((m, i) => m !== mats[i])) {
          tex.dispose();
          return;
        }
        prevMaps.forEach((pm, i) => {
          if (pm && pm !== tex) pm.dispose();
        });
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        mats.forEach((sideMat) => {
          sideMat.map = tex;
          sideMat.needsUpdate = true;
        });
      },
      undefined,
      () => {
        if (!texCancelled) clearMaps();
      }
    );

    return () => {
      texCancelled = true;
    };
  }, [designTextureUrl, modelReady]);

  return <div ref={containerRef} className={styles.canvas} />;
};

export default Canvas3D;
