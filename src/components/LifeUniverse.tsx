"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Mesh } from "three";
import type { SceneEdge, SceneGraph, SceneNode } from "@/lib/types";

type Props = {
  scene: SceneGraph;
  onSelect: (node: SceneNode) => void;
  selectedId?: string | null;
};

function EdgeLines({ edges, nodes }: { edges: SceneEdge[]; nodes: SceneNode[] }) {
  const map = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  return (
    <>
      {edges.map((e) => {
        const a = map[e.from];
        const b = map[e.to];
        if (!a || !b) return null;
        const color =
          e.kind === "blocked" ? "#e06c75" : e.kind === "unlock" ? "#4ade80" : "#8a6a2f";
        return (
          <Line
            key={e.id}
            points={[
              [a.x, a.y, a.z],
              [b.x, b.y, b.z],
            ]}
            color={color}
            transparent
            opacity={0.12 + e.strength * 0.45}
            lineWidth={1}
          />
        );
      })}
    </>
  );
}

function NodeMesh({
  node,
  selected,
  onSelect,
}: {
  node: SceneNode;
  selected: boolean;
  onSelect: (n: SceneNode) => void;
}) {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (node.kind === "life_core") {
      ref.current.rotation.y += dt * 0.15;
      ref.current.rotation.x += dt * 0.04;
    } else if (node.momentum > 0.3) {
      ref.current.rotation.y += dt * 0.35 * node.momentum;
    }
  });

  const radius = node.size * (node.kind === "life_core" ? 0.85 : 0.55);
  const emissive = selected ? "#ffffff" : node.color;

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={ref}
        onClick={(ev) => {
          ev.stopPropagation();
          onSelect(node);
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        {node.kind === "opportunity_portal" ? (
          <torusGeometry args={[radius * 1.1, radius * 0.18, 12, 48]} />
        ) : node.kind === "risk_zone" ? (
          <sphereGeometry args={[radius * 1.4, 24, 24]} />
        ) : node.kind === "constraint_barrier" ? (
          <boxGeometry args={[radius * 1.6, radius * 0.35, radius * 1.6]} />
        ) : node.kind === "asset_node" ? (
          <octahedronGeometry args={[radius, 0]} />
        ) : node.kind === "life_core" ? (
          <icosahedronGeometry args={[radius, 1]} />
        ) : (
          <sphereGeometry args={[radius, 28, 28]} />
        )}
        <meshStandardMaterial
          color={node.color}
          emissive={emissive}
          emissiveIntensity={selected ? 0.85 : node.kind === "life_core" ? 0.45 : 0.22}
          transparent
          opacity={node.kind === "risk_zone" ? 0.22 : node.opacity}
          roughness={0.35}
          metalness={0.35}
          wireframe={node.kind === "constraint_barrier"}
        />
      </mesh>
      {(node.kind === "domain_planet" ||
        node.kind === "life_core" ||
        node.kind === "opportunity_portal" ||
        node.kind === "risk_zone" ||
        selected) && (
        <Html center distanceFactor={18} style={{ pointerEvents: "none" }}>
          <div
            className="whitespace-nowrap rounded-full border border-white/10 bg-black/55 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/90"
            style={{ opacity: selected ? 1 : 0.8 }}
          >
            {node.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function FirstFrameSignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      onReady();
    }
  });
  return null;
}

function SceneBody({ scene, onSelect, selectedId, onReady }: Props & { onReady: () => void }) {
  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 4, 0]} intensity={18} color="#d4a853" distance={28} />
      <pointLight position={[12, 2, -8]} intensity={10} color="#3dcdc0" distance={30} />
      <pointLight position={[-10, -4, 10]} intensity={6} color="#e06c75" distance={24} />
      <Stars radius={80} depth={40} count={2500} factor={3} fade speed={0.4} />
      <EdgeLines edges={scene.edges} nodes={scene.nodes} />
      {scene.nodes.map((n) => (
        <NodeMesh key={n.id} node={n} selected={n.id === selectedId} onSelect={onSelect} />
      ))}
      <FirstFrameSignal onReady={onReady} />
    </>
  );
}

export function LifeUniverse({ scene, onSelect, selectedId }: Props) {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl">
      <Canvas camera={{ position: [0, 7.5, 18], fov: 50 }} dpr={[1, 1.75]}>
        <color attach="background" args={["#05060a"]} />
        <fog attach="fog" args={["#05060a", 18, 42]} />
        <SceneBody scene={scene} onSelect={onSelect} selectedId={selectedId} onReady={onReady} />
        <OrbitControls
          enablePan
          enableDamping
          dampingFactor={0.08}
          minDistance={6}
          maxDistance={36}
        />
      </Canvas>
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-void font-mono text-xs uppercase tracking-[0.3em] text-mute">
          assembling universe
        </div>
      )}
      {ready && (
        <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.22em] text-mute">
          drag to orbit · scroll to zoom · click a body
        </div>
      )}
    </div>
  );
}
