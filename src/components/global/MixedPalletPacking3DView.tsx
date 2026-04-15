'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import type { PlacedCarton } from '@/hooks/queries';
import { EXPORT_PALLET } from '@/lib/algorithms/pallet';

interface Props {
  items: PlacedCarton[];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function skuColor(sku: string): string {
  const hue = hashString(sku) % 360;
  return `hsl(${hue}, 65%, 60%)`;
}

export default function MixedPalletPacking3DView({ items }: Props) {
  const PW = EXPORT_PALLET.width;
  const PL = EXPORT_PALLET.length;

  const boxes = useMemo(() => {
    return items.map((p, idx) => ({
      key: `${p.sku}-${p.cartonIndex}-${idx}`,
      position: [
        p.x - PW / 2 + p.w / 2,
        p.z + p.h / 2 + 2,
        p.y - PL / 2 + p.l / 2,
      ] as [number, number, number],
      size: [p.w, p.h, p.l] as [number, number, number],
      color: skuColor(p.sku),
    }));
  }, [items, PW, PL]);

  const maxHeight = items.reduce((acc, p) => Math.max(acc, p.z + p.h), 0);
  const maxDim = Math.max(PW, PL, maxHeight);
  const cameraDistance = maxDim * 2.2;

  return (
    <Canvas
      camera={{
        position: [cameraDistance, cameraDistance, cameraDistance],
        fov: 40,
        near: 1,
        far: cameraDistance * 10,
      }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      shadows
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[200, 300, 200]} intensity={1.0} castShadow />
      <directionalLight position={[-200, 150, -100]} intensity={0.3} />

      <mesh position={[0, 1, 0]} receiveShadow>
        <boxGeometry args={[PW, 2, PL]} />
        <meshStandardMaterial color="#8b6f47" />
      </mesh>

      {boxes.map((b) => (
        <mesh key={b.key} position={b.position} castShadow receiveShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial
            color={b.color}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
          <Edges color="#0f172a" threshold={15} lineWidth={1.5} />
        </mesh>
      ))}

      <gridHelper args={[Math.max(PW, PL) * 2, 20, '#cbd5e1', '#e5e7eb']} />
      <OrbitControls enablePan enableZoom enableRotate makeDefault />
    </Canvas>
  );
}
