import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useSatelliteData } from '@/hooks/useSatelliteData';

// Earth component
function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0005; // Earth's rotation
    }
  });

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1e40af"
        emissive="#1e40af"
        emissiveIntensity={0.2}
        roughness={0.8}
        metalness={0.3}
      />
    </mesh>
  );
}

// Satellite component
function Satellite({ position, velocity }: { position: [number, number, number]; velocity: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [currentPos, setCurrentPos] = useState(position);

  useFrame(() => {
    if (meshRef.current) {
      // Simple orbital propagation (simplified for performance)
      const speed = 0.0001;
      const [x, y, z] = currentPos;
      const [vx, vy, vz] = velocity;
      
      // Update position based on velocity
      const newX = x + vx * speed;
      const newY = y + vy * speed;
      const newZ = z + vz * speed;
      
      setCurrentPos([newX, newY, newZ]);
      meshRef.current.position.set(newX, newY, newZ);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.02, 0.02, 0.05]} />
      <meshStandardMaterial
        color="#06b6d4"
        emissive="#06b6d4"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

// Orbit path component
function OrbitPath({ radius, inclination }: { radius: number; inclination: number }) {
  const points = useMemo(() => {
    const curve = new THREE.EllipseCurve(
      0, 0,
      radius, radius,
      0, 2 * Math.PI,
      false,
      0
    );
    const curvePoints = curve.getPoints(100);
    return curvePoints.map(p => {
      // Apply inclination
      const x = p.x * Math.cos(inclination);
      const y = p.y;
      const z = p.x * Math.sin(inclination);
      return new THREE.Vector3(x, y, z);
    });
  }, [radius, inclination]);

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#06b6d4" opacity={0.2} transparent />
    </line>
  );
}

// Axes helper component
function AxesDisplay() {
  return (
    <group>
      {/* X-axis (red) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([-5, 0, 0, 5, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ef4444" />
      </line>
      {/* Y-axis (green) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, -5, 0, 0, 5, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22c55e" />
      </line>
      {/* Z-axis (blue) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, -5, 0, 0, 5])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" />
      </line>
    </group>
  );
}

export function OrbitalViewer() {
  const { satellites, loading, error } = useSatelliteData();
  const [showOrbits, setShowOrbits] = useState(true);
  const [showAxes, setShowAxes] = useState(true);

  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{ position: [5, 3, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#0a0e1a']} />
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {showAxes && <AxesDisplay />}
        
        <Earth />
        
        {satellites.slice(0, 1000).map((sat, index) => (
          <Satellite
            key={index}
            position={sat.position}
            velocity={sat.velocity}
          />
        ))}
        
        {showOrbits && satellites.slice(0, 50).map((sat, index) => (
          <OrbitPath
            key={`orbit-${index}`}
            radius={sat.altitude}
            inclination={sat.inclination}
          />
        ))}
        
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={2}
          maxDistance={20}
        />
      </Canvas>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setShowOrbits(!showOrbits)}
          className="px-4 py-2 bg-card/80 backdrop-blur-sm border border-primary/20 rounded-lg text-sm hover:bg-card transition-colors glow-border"
        >
          {showOrbits ? 'Hide Orbits' : 'Show Orbits'}
        </button>
        <button
          onClick={() => setShowAxes(!showAxes)}
          className="px-4 py-2 bg-card/80 backdrop-blur-sm border border-primary/20 rounded-lg text-sm hover:bg-card transition-colors glow-border"
        >
          {showAxes ? 'Hide Axes' : 'Show Axes'}
        </button>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="text-primary glow-text text-lg">Loading orbital data...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-4 bg-destructive/20 border border-destructive rounded-lg p-4">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Info Panel */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-sm border border-primary/20 rounded-lg p-4 glow-border">
        <div className="text-xs space-y-1">
          <p className="text-muted-foreground">Total Objects: <span className="text-primary font-bold">{satellites.length}</span></p>
          <p className="text-muted-foreground">Displaying: <span className="text-primary font-bold">1000</span></p>
          <p className="text-muted-foreground">Orbits Shown: <span className="text-primary font-bold">50</span></p>
        </div>
      </div>
    </div>
  );
}
