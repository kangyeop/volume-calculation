'use client';

import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges } from '@react-three/drei';
import type { PalletLayout3D } from '@/lib/algorithms/pallet-layout';

interface Props {
  layout: PalletLayout3D;
}

function tierColor(tier: number, totalTiers: number): string {
  const hue = (tier * 360) / Math.max(totalTiers, 1);
  return `hsl(${hue}, 65%, 60%)`;
}

export default function PalletPacking3DView({ layout }: Props) {
  const { pallet, carton, layerRects, layerCount } = layout;
  const PW = pallet.width;
  const PL = pallet.length;
  const H = carton.height;

  const boxes = useMemo(() => {
    const out: Array<{
      key: string;
      position: [number, number, number];
      size: [number, number, number];
      color: string;
    }> = [];
    for (let tier = 0; tier < layerCount; tier++) {
      const color = tierColor(tier, layerCount);
      for (let i = 0; i < layerRects.length; i++) {
        const r = layerRects[i];
        out.push({
          key: `${tier}-${i}`,
          position: [
            r.x - PW / 2 + r.w / 2,
            tier * H + H / 2 + 2,
            r.y - PL / 2 + r.h / 2,
          ],
          size: [r.w, H, r.h],
          color,
        });
      }
    }
    return out;
  }, [layerRects, layerCount, PW, PL, H]);

  const maxDim = Math.max(PW, PL, layerCount * H);
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
