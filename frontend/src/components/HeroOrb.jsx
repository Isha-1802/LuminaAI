import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles, Environment } from "@react-three/drei";
import * as THREE from "three";

const CORE_COLOR = "#c68b73";     // champagne gold
const EMISSIVE = "#7a3d35";        // warm brass
const RING_GOLD = "#d9a58f";
const RING_IVORY = "#f2ece0";

const Orb = () => {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.11;
      ref.current.rotation.y += delta * 0.14;
    }
  });
  return (
    <Float speed={1.1} rotationIntensity={0.4} floatIntensity={0.9}>
      <mesh ref={ref} scale={1.75}>
        <icosahedronGeometry args={[1, 7]} />
        <MeshDistortMaterial
          color={new THREE.Color(CORE_COLOR)}
          emissive={new THREE.Color(EMISSIVE)}
          emissiveIntensity={0.28}
          roughness={0.28}
          metalness={0.92}
          distort={0.34}
          speed={1.1}
        />
      </mesh>
      {/* Soft halo */}
      <mesh scale={1.35}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color="#3a201a" transparent opacity={0.08} />
      </mesh>
    </Float>
  );
};

const Rings = () => (
  <group>
    <group rotation={[Math.PI / 2.4, 0.15, 0]}>
      {[2.55, 3.05, 3.55].map((r, i) => (
        <mesh key={i} rotation={[0, 0, i * 0.35]}>
          <torusGeometry args={[r, 0.003, 8, 320]} />
          <meshBasicMaterial color={i === 1 ? RING_IVORY : RING_GOLD} transparent opacity={i === 1 ? 0.28 : 0.42} />
        </mesh>
      ))}
    </group>
    {/* orthogonal ring */}
    <group rotation={[0, Math.PI / 3, Math.PI / 5]}>
      <mesh>
        <torusGeometry args={[3.25, 0.002, 6, 300]} />
        <meshBasicMaterial color={RING_GOLD} transparent opacity={0.22} />
      </mesh>
    </group>
  </group>
);

export default function HeroOrb() {
  return (
    <div className="w-full h-[520px] md:h-[640px]" data-testid="hero-3d-canvas">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0, 6.2], fov: 38 }}>
        <color attach="background" args={["#0c0a09"]} />
        <ambientLight intensity={0.28} />
        <pointLight position={[5, 4, 6]} intensity={2.6} color="#e8b8a4" />
        <pointLight position={[-6, -2, 3]} intensity={1.4} color="#7a3d35" />
        <pointLight position={[0, 6, -6]} intensity={0.9} color="#fdf0ea" />
        <Suspense fallback={null}>
          <Orb />
          <Rings />
          <Sparkles count={120} size={2.4} scale={[10, 10, 10]} speed={0.25} color="#d9a58f" />
          <Sparkles count={40} size={1.1} scale={[16, 8, 16]} speed={0.15} color="#f2ece0" />
          <Environment preset="warehouse" />
        </Suspense>
      </Canvas>
    </div>
  );
}
