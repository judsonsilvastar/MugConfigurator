'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './Canvas3D.module.css';

interface MugDesign {
  cupColor: string;
  textContent: string;
  textColor: string;
  textSize: number;
  uploadedImage: string | null;
  imageScale: number;
  imageRotation: number;
}

interface Canvas3DProps {
  design: MugDesign;
}

const Canvas3D: React.FC<Canvas3DProps> = ({ design }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cupRef = useRef<THREE.Mesh | null>(null);
  const textMeshRef = useRef<THREE.Mesh | null>(null);
  const imagePlaneRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 3;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create cup/mug
    const cupGeometry = new THREE.CylinderGeometry(1, 0.9, 1.5, 32);
    const cupMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(design.cupColor),
      shininess: 100,
    });
    const cup = new THREE.Mesh(cupGeometry, cupMaterial);
    cup.position.y = 0.2;
    scene.add(cup);
    cupRef.current = cup;

    // Create cup handle
    const handleGeometry = new THREE.TorusGeometry(0.3, 0.08, 16, 16, Math.PI / 2);
    const handleMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color(design.cupColor),
      shininess: 100,
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(1.1, 0.3, 0);
    handle.rotation.y = Math.PI / 2;
    scene.add(handle);

    // Add text to cup surface (using canvas texture)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = design.textColor;
    ctx.font = `bold ${design.textSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(design.textContent, 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const textMaterial = new THREE.MeshPhongMaterial({ map: texture });
    const textGeometry = new THREE.PlaneGeometry(2, 1);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 1.05;
    scene.add(textMesh);
    textMeshRef.current = textMesh;

    // Add image if uploaded
    if (design.uploadedImage) {
      const textureLoader = new THREE.TextureLoader();
      const imageTexture = new THREE.CanvasTexture(createImageCanvas(design.uploadedImage));
      const imageMaterial = new THREE.MeshPhongMaterial({ map: imageTexture });
      const imageGeometry = new THREE.PlaneGeometry(1.5 * design.imageScale, 1.5 * design.imageScale);
      const imageMesh = new THREE.Mesh(imageGeometry, imageMaterial);
      imageMesh.position.set(-0.5, 0.3, 1.05);
      imageMesh.rotation.z = (design.imageRotation * Math.PI) / 180;
      scene.add(imageMesh);
      imagePlaneRef.current = imageMesh;
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Slow rotation
      if (cup) {
        cup.rotation.y += 0.01;
        if (handle) {
          handle.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.01);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update cup color
  useEffect(() => {
    if (cupRef.current && cupRef.current.material instanceof THREE.MeshPhongMaterial) {
      cupRef.current.material.color.set(new THREE.Color(design.cupColor));
      cupRef.current.material.needsUpdate = true;
    }
  }, [design.cupColor]);

  // Update text
  useEffect(() => {
    if (textMeshRef.current && sceneRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = design.textColor;
      ctx.font = `bold ${design.textSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(design.textContent, 256, 128);

      const texture = new THREE.CanvasTexture(canvas);
      if (textMeshRef.current.material instanceof THREE.MeshPhongMaterial) {
        textMeshRef.current.material.map = texture;
        textMeshRef.current.material.needsUpdate = true;
      }
    }
  }, [design.textContent, design.textColor, design.textSize]);

  // Update image
  useEffect(() => {
    if (imagePlaneRef.current && sceneRef.current) {
      if (design.uploadedImage) {
        imagePlaneRef.current.scale.set(design.imageScale, design.imageScale, 1);
        imagePlaneRef.current.rotation.z = (design.imageRotation * Math.PI) / 180;
      }
    }
  }, [design.uploadedImage, design.imageScale, design.imageRotation]);

  return <div ref={containerRef} className={styles.canvas} />;
};

function createImageCanvas(imageData: string): HTMLCanvasElement {
  const img = new Image();
  img.src = imageData;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;

  img.onload = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, 512, 512);
  };

  return canvas;
}

export default Canvas3D;