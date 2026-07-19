import { Suspense, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Environment, Line, Trail, Instances, Instance } from "@react-three/drei";
import * as THREE from "three";

const GOLD = "#c68b73";
const GOLD_BRIGHT = "#e8b8a4";
const IVORY = "#f2ece0";
const OXBLOOD = "#5a1a24";

/* --- Central AI Core: wireframe icosahedron + inner solid --- */
const AICore = ({ mouse }) => {
  const outer = useRef();
  const inner = useRef();
  const wire = useRef();
  const innerMat = useRef();
  const haloMat = useRef();
  const coreLight = useRef();

  useFrame(({ clock }, dt) => {
    if (outer.current) {
      outer.current.rotation.x += dt * 0.08;
      outer.current.rotation.y += dt * 0.14;
    }
    if (inner.current) {
      inner.current.rotation.x -= dt * 0.18;
      inner.current.rotation.z += dt * 0.22;
    }
    if (wire.current) {
      wire.current.rotation.y -= dt * 0.05;
      wire.current.rotation.x += dt * 0.03;
    }
    // Mouse parallax on whole group + proximity-driven reactivity
    let proximity = 0;
    if (mouse?.current && outer.current?.parent) {
      const g = outer.current.parent;
      g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, mouse.current.x * 0.35, 0.05);
      g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -mouse.current.y * 0.25, 0.05);
      const dist = Math.hypot(mouse.current.x, mouse.current.y);
      proximity = THREE.MathUtils.clamp(1 - dist, 0, 1);
    }

    // Slow breathing pulse layered with cursor reactivity
    const breathe = 0.5 + Math.sin(clock.getElapsedTime() * 0.6) * 0.5;
    const glow = 0.5 + breathe * 0.25 + proximity * 0.55;
    if (innerMat.current) innerMat.current.emissiveIntensity = glow;
    if (coreLight.current) coreLight.current.intensity = 2.0 + breathe * 0.8 + proximity * 1.6;
    if (haloMat.current) haloMat.current.opacity = 0.04 + proximity * 0.05 + breathe * 0.015;
  });

  return (
    <group>
      {/* Outer wireframe icosahedron */}
      <mesh ref={outer} scale={2.1}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.55} />
      </mesh>

      {/* Middle wireframe octahedron */}
      <mesh ref={wire} scale={1.55}>
        <octahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color={IVORY} wireframe transparent opacity={0.28} />
      </mesh>

      {/* Inner emissive core — reacts to cursor proximity + breathes on its own */}
      <mesh ref={inner} scale={0.85}>
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          ref={innerMat}
          color={GOLD}
          emissive={new THREE.Color(GOLD_BRIGHT)}
          emissiveIntensity={0.55}
          roughness={0.15}
          metalness={0.98}
        />
      </mesh>

      {/* Reactive core light — brightens as the cursor nears */}
      <pointLight ref={coreLight} position={[0, 0, 0]} intensity={2.2} color={GOLD_BRIGHT} distance={6} />

      {/* Halo */}
      <mesh>
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshBasicMaterial ref={haloMat} color={OXBLOOD} transparent opacity={0.045} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

/* --- Orbital rings at different axes --- */
const OrbitalRings = () => {
  const g1 = useRef();
  const g2 = useRef();
  const g3 = useRef();
  const ringGlow = useRef();

  useFrame(({ clock }, dt) => {
    if (g1.current) g1.current.rotation.z += dt * 0.09;
    if (g2.current) g2.current.rotation.z -= dt * 0.06;
    if (g3.current) g3.current.rotation.y += dt * 0.12;
    if (ringGlow.current) {
      ringGlow.current.opacity = 0.45 + Math.sin(clock.getElapsedTime() * 0.5) * 0.15;
    }
  });

  return (
    <>
      <group ref={g1} rotation={[Math.PI / 2.6, 0, 0]}>
        <mesh>
          <torusGeometry args={[2.9, 0.004, 8, 320]} />
          <meshBasicMaterial ref={ringGlow} color={GOLD} transparent opacity={0.55} />
        </mesh>
        <mesh>
          <torusGeometry args={[3.15, 0.002, 8, 320]} />
          <meshBasicMaterial color={IVORY} transparent opacity={0.25} />
        </mesh>
      </group>
      <group ref={g2} rotation={[Math.PI / 2, Math.PI / 3, 0.2]}>
        <mesh>
          <torusGeometry args={[3.4, 0.003, 8, 320]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.35} />
        </mesh>
      </group>
      <group ref={g3} rotation={[0, 0, Math.PI / 3]}>
        <mesh>
          <torusGeometry args={[3.65, 0.002, 6, 300]} />
          <meshBasicMaterial color={GOLD_BRIGHT} transparent opacity={0.28} />
        </mesh>
      </group>
    </>
  );
};

/* --- Orbiting satellites with trails --- */
const Satellite = ({ radius, speed, phase, tilt, color }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + phase;
    if (ref.current) {
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.y = Math.sin(t) * radius * Math.sin(tilt);
      ref.current.position.z = Math.sin(t) * radius * Math.cos(tilt);
    }
  });
  return (
    <Trail width={0.6} length={4} color={color} attenuation={(w) => w * w}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </Trail>
  );
};

/* --- Point cloud shell around core --- */
const PointShell = ({ count = 1200, radius = 3.9 }) => {
  const points = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      const r = radius + (Math.random() - 0.5) * 0.35;
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, radius]);
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.03;
      ref.current.rotation.x += dt * 0.01;
    }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color={GOLD} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
};

/* --- Neural connection lines between random shell points --- */
const NeuralLinks = ({ pairs = 22, radius = 3.9 }) => {
  const lines = useMemo(() => {
    const list = [];
    for (let i = 0; i < pairs; i++) {
      const p = () => {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        return [
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi),
        ];
      };
      list.push([p(), p()]);
    }
    return list;
  }, [pairs, radius]);
  const g = useRef();
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.03;
  });
  return (
    <group ref={g}>
      {lines.map((pts, i) => (
        <Line key={i} points={pts} color={GOLD_BRIGHT} transparent opacity={0.18} lineWidth={1} />
      ))}
    </group>
  );
};

/* --- Bottom HUD grid floor --- */
const GridFloor = () => {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.02;
  });
  return (
    <group ref={ref} position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <gridHelper args={[14, 28, GOLD, GOLD]} />
    </group>
  );
};

/* --- Scanning ring plane --- */
const ScanRing = () => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      ref.current.position.y = Math.sin(t * 0.9) * 3.2;
      ref.current.rotation.z = t * 0.4;
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.2, 2.24, 128]} />
      <meshBasicMaterial color={GOLD_BRIGHT} transparent opacity={0.45} side={THREE.DoubleSide} />
    </mesh>
  );
};

export default function AISceneCore({ mouse }) {
  return (
    <div className="w-full h-[560px] md:h-[720px] relative" data-testid="hero-3d-canvas">
      {/* HUD corner brackets */}
      <div className="absolute inset-6 md:inset-10 pointer-events-none z-10">
        {[
          "top-0 left-0 border-l border-t",
          "top-0 right-0 border-r border-t",
          "bottom-0 left-0 border-l border-b",
          "bottom-0 right-0 border-r border-b",
        ].map((cls, i) => (
          <div key={i} className={`absolute ${cls} border-[#c68b73]/50 w-8 h-8`} />
        ))}
        <div className="absolute top-2 right-14 overline-gold text-[8px]">// COGNITIVE CORE · v1.4</div>
      </div>

      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 0.5, 8], fov: 40 }}>
        <color attach="background" args={["#0c0a09"]} />
        <fog attach="fog" args={["#0c0a09", 8, 20]} />
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 4, 6]} intensity={2.4} color={GOLD_BRIGHT} />
        <pointLight position={[-6, -3, 4]} intensity={1.4} color="#7a3d35" />
        <pointLight position={[0, 6, -6]} intensity={0.9} color={IVORY} />
        <Suspense fallback={null}>
          <group>
            <AICore mouse={mouse} />
            <OrbitalRings />
            <ScanRing />
            <PointShell />
            <NeuralLinks />
            {[
              { r: 2.9, s: 0.55, p: 0, t: 0.4, c: GOLD_BRIGHT },
              { r: 3.4, s: -0.4, p: 1.5, t: 0.9, c: GOLD },
              { r: 3.15, s: 0.7, p: 3.1, t: 0.2, c: IVORY },
              { r: 3.7, s: -0.32, p: 4.7, t: 0.6, c: GOLD },
              { r: 2.75, s: 0.85, p: 2.2, t: 0.5, c: GOLD_BRIGHT },
            ].map((sat, i) => (
              <Satellite key={i} radius={sat.r} speed={sat.s} phase={sat.p} tilt={sat.t} color={sat.c} />
            ))}
            <Sparkles count={220} size={2.5} scale={[12, 12, 12]} speed={0.22} color={GOLD} />
            <Sparkles count={80} size={1.2} scale={[16, 8, 16]} speed={0.15} color={IVORY} />
            <GridFloor />
            <Environment preset="warehouse" />
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
}
