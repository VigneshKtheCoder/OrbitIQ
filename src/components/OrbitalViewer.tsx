import { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as satellite from 'satellite.js';

interface SatelliteData {
  name: string;
  position: [number, number, number];
  velocity: [number, number, number];
  altitude: number;
  inclination: number;
}

interface SatRecData {
  name: string;
  satrec: satellite.SatRec;
}

interface OrbitalViewerProps {
  satellites: SatelliteData[];
  satRecs: SatRecData[];
  loading: boolean;
  error: string | null;
}

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

// Satellite component with realistic orbital propagation
function Satellite({ 
  satrec, 
  name, 
  onClick 
}: { 
  satrec: satellite.SatRec; 
  name: string;
  onClick: (name: string, distance: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startTimeRef = useRef(Date.now());

  useFrame(() => {
    if (meshRef.current) {
      // Calculate elapsed time (scaled to make visible motion)
      // 1 second real time = 60 seconds orbital time (60x speed for visibility)
      const elapsedMs = Date.now() - startTimeRef.current;
      const simulatedDate = new Date(Date.now() + elapsedMs * 60);
      
      // Propagate satellite position using SGP4
      const positionAndVelocity = satellite.propagate(satrec, simulatedDate);
      
      if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
        const position = positionAndVelocity.position as satellite.EciVec3<number>;
        
        // Convert from km to scene units (Earth radius = 1 unit = 6371 km)
        const earthRadius = 6371;
        const scale = 1 / earthRadius;
        
        const x = position.x * scale;
        const y = position.y * scale;
        const z = position.z * scale;
        
        meshRef.current.position.set(x, y, z);
        
        // Store distance for click handler
        const distance = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
        (meshRef.current as any).userData = { name, distance };
      }
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      onClick={(e) => {
        e.stopPropagation();
        const userData = (e.object as any).userData;
        if (userData) {
          onClick(userData.name, userData.distance);
        }
      }}
    >
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

export function OrbitalViewer({ satellites, satRecs, loading, error }: OrbitalViewerProps) {
  const [selectedSatellite, setSelectedSatellite] = useState<{ name: string; distance: number } | null>(null);

  const handleSatelliteClick = (name: string, distance: number) => {
    // Convert distance from km to miles (1 km = 0.621371 miles)
    const distanceInMiles = distance * 0.621371;
    setSelectedSatellite({ name, distance: distanceInMiles });
  };

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
        
        <AxesDisplay />
        
        <Earth />
        
        {satRecs.slice(0, 1000).map((sat, index) => (
          <Satellite
            key={index}
            satrec={sat.satrec}
            name={sat.name}
            onClick={handleSatelliteClick}
          />
        ))}
        
        {satellites.slice(0, 50).map((sat, index) => (
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

      {/* Loading/Error States */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
          <div className="text-primary glow-text text-lg">Loading orbital data...</div>
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-4 bg-destructive/20 border border-destructive rounded-lg p-4 z-50">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Satellite Info Panel */}
      {selectedSatellite && (
        <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm border border-primary/20 rounded-lg p-4 glow-border z-50 max-w-sm">
          <button 
            onClick={() => setSelectedSatellite(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-primary"
          >
            ✕
          </button>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-primary">{selectedSatellite.name}</h3>
            <p className="text-xs text-muted-foreground">
              Distance from Earth Center: <span className="text-primary font-bold">{selectedSatellite.distance.toFixed(2)} miles</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Altitude from Surface: <span className="text-primary font-bold">{(selectedSatellite.distance - 3959).toFixed(2)} miles</span>
            </p>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm border border-primary/20 rounded-lg p-3 glow-border z-40">
        <div className="text-xs space-y-1">
          <p className="text-muted-foreground">Total Objects: <span className="text-primary font-bold">{satellites.length}</span></p>
          <p className="text-muted-foreground">Displaying: <span className="text-primary font-bold">{Math.min(1000, satellites.length)}</span></p>
          <p className="text-muted-foreground">Orbits Shown: <span className="text-primary font-bold">50</span></p>
        </div>
      </div>
    </div>
  );
}
