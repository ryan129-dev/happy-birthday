import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParticleSystem from './ParticleSystem';
import { HandState } from '../types';

export default function Scene({ handState, isMobile }: { handState: HandState; isMobile: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, isMobile ? 50 : 30], fov: isMobile ? 60 : 45 }}>
      <color attach="background" args={['#050505']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <ParticleSystem handState={handState} isMobile={isMobile} />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}
