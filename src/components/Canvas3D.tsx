'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './Canvas3D.module.css';

interface MugDesign {
  cupColor: string;
}

interface Canvas3DProps {
  design: MugDesign;
  designTextureUrl: string | null;
}

const Canvas3D: React.FC<Canvas3DProps> = ({ design, designTextureUrl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cupRef = useRef<THREE.Mesh | null>(null);
  const handleRef = useRef<THREE.Mesh | null>(null);
  const sideMaterialRef = useRef<THREE.MeshPhongMaterial | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

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

    const resizeObserver = new ResizeObserver(() => fitRendererToContainer());
    resizeObserver.observe(container);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const cupColor = new THREE.Color(design.cupColor);
    const cupGeometry = new THREE.CylinderGeometry(1, 0.9, 1.5, 64, 1, false);
    const sideMaterial = new THREE.MeshPhongMaterial({
      color: cupColor.clone(),
      shininess: 100,
    });
    const capMaterial = new THREE.MeshPhongMaterial({
      color: cupColor.clone(),
      shininess: 100,
    });
    sideMaterialRef.current = sideMaterial;

    const cupMaterials: THREE.MeshPhongMaterial[] = [sideMaterial, capMaterial, capMaterial];
    const cup = new THREE.Mesh(cupGeometry, cupMaterials);
    cup.position.y = 0.2;
    scene.add(cup);
    cupRef.current = cup;

    const handleGeometry = new THREE.TorusGeometry(0.3, 0.08, 16, 16, Math.PI / 2);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: cupColor.clone(),
      shininess: 100,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(1.1, 0.3, 0);
    handle.rotation.y = Math.PI / 2;
    scene.add(handle);
    handleRef.current = handle;

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (cup) {
        cup.rotation.y += 0.01;
        handle.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.01);
      }
      renderer.render(scene, camera);
    };

    animate();

    const handleWindowResize = () => fitRendererToContainer();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sideMaterial.map?.dispose();
      sideMaterial.dispose();
      capMaterial.dispose();
      handleMaterial.dispose();
      cupGeometry.dispose();
      handleGeometry.dispose();
      renderer.dispose();
      sideMaterialRef.current = null;
      cupRef.current = null;
      handleRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const color = new THREE.Color(design.cupColor);
    const cup = cupRef.current;
    if (cup && Array.isArray(cup.material)) {
      cup.material.forEach((mat: THREE.Material) => {
        if (mat instanceof THREE.MeshPhongMaterial) {
          mat.color.copy(color);
          mat.needsUpdate = true;
        }
      });
    }
    const handleMesh = handleRef.current;
    if (handleMesh?.material instanceof THREE.MeshPhongMaterial) {
      handleMesh.material.color.copy(color);
      handleMesh.material.needsUpdate = true;
    }
  }, [design.cupColor]);

  useEffect(() => {
    const sideMat = sideMaterialRef.current;
    if (!sideMat) return;

    let cancelled = false;

    const clearMap = () => {
      if (sideMat.map) {
        sideMat.map.dispose();
        sideMat.map = null;
      }
      sideMat.needsUpdate = true;
    };

    if (!designTextureUrl) {
      clearMap();
      return () => {
        cancelled = true;
      };
    }

    const targetSideMat = sideMat;
    const prevMap = sideMat.map;
    const loader = new THREE.TextureLoader();
    loader.load(
      designTextureUrl,
      (tex: THREE.Texture) => {
        if (cancelled || sideMaterialRef.current !== targetSideMat) {
          tex.dispose();
          return;
        }
        if (prevMap && prevMap !== tex) prevMap.dispose();
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        sideMat.map = tex;
        sideMat.needsUpdate = true;
      },
      undefined,
      () => {
        if (!cancelled) clearMap();
      }
    );

    return () => {
      cancelled = true;
    };
  }, [designTextureUrl]);

  return <div ref={containerRef} className={styles.canvas} />;
};

export default Canvas3D;
