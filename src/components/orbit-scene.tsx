"use client";

import { Float, MeshDistortMaterial, OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

function Core() {
  return (
    <Float speed={1.6} rotationIntensity={0.8} floatIntensity={1.3}>
      <mesh rotation={[0.4, 0.7, 0.2]}>
        <icosahedronGeometry args={[1.55, 5]} />
        <MeshDistortMaterial
          color="#4ade80"
          distort={0.32}
          emissive="#123c2b"
          metalness={0.45}
          roughness={0.24}
          speed={1.8}
        />
      </mesh>
      <mesh rotation={[1.2, 0.2, 0.8]}>
        <torusGeometry args={[2.25, 0.018, 12, 120]} />
        <meshStandardMaterial color="#38bdf8" emissive="#075985" metalness={0.7} roughness={0.2} />
      </mesh>
      <mesh rotation={[0.5, 1.1, 1.4]}>
        <torusGeometry args={[2.75, 0.014, 12, 120]} />
        <meshStandardMaterial color="#fbbf24" emissive="#713f12" metalness={0.7} roughness={0.2} />
      </mesh>
    </Float>
  );
}

export function OrbitScene() {
  return (
    <div className="fixed inset-0 opacity-80">
      <Canvas camera={{ position: [0, 0, 7], fov: 42 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 3, 4]} intensity={2.2} />
        <pointLight position={[-3, -2, 2]} color="#fbbf24" intensity={2.5} />
        <Stars count={850} depth={30} factor={2.6} fade speed={0.35} />
        <Core />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.9} />
      </Canvas>
    </div>
  );
}
