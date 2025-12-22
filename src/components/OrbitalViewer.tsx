import { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as satellite from 'satellite.js';
import { DebrisHeatmap } from './DebrisHeatmap';
import { realSpaceDataService } from '@/services/realSpaceData';

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

// Realistic Earth component with detailed textures
function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0003;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.0004;
    }
  });

  // High-detail Earth texture with realistic features
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    
    // Deep ocean gradient
    const oceanGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    oceanGradient.addColorStop(0, '#1a4b7c');
    oceanGradient.addColorStop(0.3, '#0d3a5c');
    oceanGradient.addColorStop(0.5, '#0a2d47');
    oceanGradient.addColorStop(0.7, '#0d3a5c');
    oceanGradient.addColorStop(1, '#1a4b7c');
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add ocean depth variation
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 100 + 20;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(8, 45, 80, 0.3)');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    // Continent colors with terrain variation
    const drawContinent = (path: Path2D, baseColor: string, highlightColor: string) => {
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, highlightColor);
      gradient.addColorStop(0.5, baseColor);
      gradient.addColorStop(1, highlightColor);
      ctx.fillStyle = gradient;
      ctx.fill(path);
      
      ctx.strokeStyle = 'rgba(34, 85, 34, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke(path);
    };

    // Africa
    const africa = new Path2D();
    africa.moveTo(1050, 350);
    africa.bezierCurveTo(1020, 400, 980, 500, 1000, 600);
    africa.bezierCurveTo(1020, 720, 1100, 780, 1150, 700);
    africa.bezierCurveTo(1200, 600, 1220, 480, 1180, 380);
    africa.bezierCurveTo(1140, 320, 1080, 340, 1050, 350);
    drawContinent(africa, '#2d5a27', '#4a7c42');
    
    // Europe
    const europe = new Path2D();
    europe.moveTo(1000, 280);
    europe.bezierCurveTo(980, 220, 1050, 180, 1120, 200);
    europe.bezierCurveTo(1200, 220, 1250, 280, 1200, 340);
    europe.bezierCurveTo(1150, 380, 1050, 360, 1000, 280);
    drawContinent(europe, '#3d6b32', '#5a8f4d');
    
    // Asia
    const asia = new Path2D();
    asia.moveTo(1200, 200);
    asia.bezierCurveTo(1300, 150, 1500, 120, 1650, 180);
    asia.bezierCurveTo(1800, 250, 1850, 400, 1750, 500);
    asia.bezierCurveTo(1600, 580, 1400, 550, 1300, 480);
    asia.bezierCurveTo(1200, 400, 1150, 300, 1200, 200);
    drawContinent(asia, '#2d5a27', '#4a7c42');
    
    // North America
    const northAmerica = new Path2D();
    northAmerica.moveTo(200, 200);
    northAmerica.bezierCurveTo(150, 250, 100, 350, 180, 450);
    northAmerica.bezierCurveTo(280, 550, 450, 520, 550, 420);
    northAmerica.bezierCurveTo(620, 320, 580, 200, 480, 150);
    northAmerica.bezierCurveTo(380, 100, 280, 130, 200, 200);
    drawContinent(northAmerica, '#3d6b32', '#5a8f4d');
    
    // South America
    const southAmerica = new Path2D();
    southAmerica.moveTo(420, 520);
    southAmerica.bezierCurveTo(380, 580, 350, 700, 400, 820);
    southAmerica.bezierCurveTo(450, 900, 520, 880, 550, 780);
    southAmerica.bezierCurveTo(580, 680, 560, 560, 500, 520);
    southAmerica.bezierCurveTo(460, 500, 440, 510, 420, 520);
    drawContinent(southAmerica, '#2d5a27', '#4a7c42');
    
    // Australia
    const australia = new Path2D();
    australia.moveTo(1580, 680);
    australia.bezierCurveTo(1520, 720, 1500, 800, 1560, 850);
    australia.bezierCurveTo(1650, 900, 1780, 860, 1800, 780);
    australia.bezierCurveTo(1820, 700, 1750, 660, 1660, 660);
    australia.bezierCurveTo(1620, 660, 1600, 670, 1580, 680);
    drawContinent(australia, '#8b6914', '#a67c00');
    
    // Antarctica
    const antarctica = new Path2D();
    antarctica.moveTo(0, 920);
    antarctica.lineTo(canvas.width, 920);
    antarctica.lineTo(canvas.width, canvas.height);
    antarctica.lineTo(0, canvas.height);
    antarctica.closePath();
    ctx.fillStyle = '#e8e8f0';
    ctx.fill(antarctica);
    
    // Ice cap north
    ctx.beginPath();
    ctx.arc(1024, 50, 180, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240, 245, 255, 0.7)';
    ctx.fill();
    
    // Cloud patterns
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 60 + 20;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Clouds texture
  const cloudsTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 80 + 30;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group>
      {/* Main Earth sphere */}
      <mesh ref={earthRef}>
        <sphereGeometry args={[1, 128, 128]} />
        <meshPhongMaterial
          map={earthTexture}
          bumpScale={0.02}
          specular={new THREE.Color('#333344')}
          shininess={15}
        />
      </mesh>
      
      {/* Cloud layer */}
      <mesh ref={cloudsRef} scale={1.01}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          map={cloudsTexture}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      
      {/* Inner atmosphere glow */}
      <mesh scale={1.015}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color="#88ccff"
          transparent
          opacity={0.08}
        />
      </mesh>
      
      {/* Outer atmosphere */}
      <mesh ref={atmosphereRef} scale={1.08}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          uniforms={{
            glowColor: { value: new THREE.Color('#4da6ff') },
          }}
          vertexShader={`
            varying vec3 vNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            uniform vec3 glowColor;
            void main() {
              float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
              gl_FragColor = vec4(glowColor, intensity * 0.4);
            }
          `}
        />
      </mesh>
    </group>
  );
}

// Realistic satellite 3D model with hover tooltip
function SatelliteModel({ 
  satrec, 
  name, 
  onClick,
}: { 
  satrec: satellite.SatRec; 
  name: string;
  onClick: (name: string, distance: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const startTimeRef = useRef(Date.now());
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (groupRef.current) {
      const elapsedMs = Date.now() - startTimeRef.current;
      const simulatedDate = new Date(Date.now() + elapsedMs * 60);
      
      const positionAndVelocity = satellite.propagate(satrec, simulatedDate);
      
      if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
        const position = positionAndVelocity.position as satellite.EciVec3<number>;
        
        const earthRadius = 6371;
        const scale = 1 / earthRadius;
        
        const x = position.x * scale;
        const y = position.y * scale;
        const z = position.z * scale;
        
        groupRef.current.position.set(x, y, z);
        
        // Orient satellite to face Earth (nadir pointing)
        groupRef.current.lookAt(0, 0, 0);
        groupRef.current.rotateX(Math.PI / 2);
        
        const distance = Math.sqrt(position.x ** 2 + position.y ** 2 + position.z ** 2);
        (groupRef.current as any).userData = { name, distance };
      }
    }
  });

  const handlePointerOver = useCallback((e: any) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = 'pointer';
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  const satColor = hovered ? '#ffd700' : '#c0c0c0';
  const panelColor = hovered ? '#00aaff' : '#1e3a5f';
  const emissiveIntensity = hovered ? 0.8 : 0.3;

  return (
    <group 
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        const userData = (groupRef.current as any)?.userData;
        if (userData) {
          onClick(userData.name, userData.distance);
        }
      }}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Main satellite body */}
      <mesh>
        <boxGeometry args={[0.012, 0.008, 0.018]} />
        <meshStandardMaterial
          color={satColor}
          metalness={0.8}
          roughness={0.2}
          emissive={satColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      
      {/* Solar panel left */}
      <mesh position={[-0.025, 0, 0]}>
        <boxGeometry args={[0.03, 0.002, 0.015]} />
        <meshStandardMaterial
          color={panelColor}
          metalness={0.6}
          roughness={0.3}
          emissive="#0066aa"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Solar panel right */}
      <mesh position={[0.025, 0, 0]}>
        <boxGeometry args={[0.03, 0.002, 0.015]} />
        <meshStandardMaterial
          color={panelColor}
          metalness={0.6}
          roughness={0.3}
          emissive="#0066aa"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Antenna dish */}
      <mesh position={[0, 0.008, 0]} rotation={[Math.PI / 4, 0, 0]}>
        <coneGeometry args={[0.004, 0.006, 8]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Status light */}
      <mesh position={[0, -0.006, 0.01]}>
        <sphereGeometry args={[0.002, 8, 8]} />
        <meshBasicMaterial color={hovered ? '#00ff00' : '#ff3300'} />
      </mesh>
      
      {/* Hover glow effect */}
      {hovered && (
        <>
          <mesh scale={1.5}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshBasicMaterial color="#ffd700" transparent opacity={0.2} />
          </mesh>
          <Html center style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <div className="bg-card/95 backdrop-blur-md border border-primary/50 rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap transform -translate-y-8">
              <p className="text-xs font-bold text-primary">{name}</p>
            </div>
          </Html>
        </>
      )}
    </group>
  );
}

// Orbit path component
function OrbitPath({ radius, inclination }: { radius: number; inclination: number }) {
  const points = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
    const curvePoints = curve.getPoints(100);
    return curvePoints.map(p => {
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
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([-5, 0, 0, 5, 0, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#ef4444" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([0, -5, 0, 0, 5, 0])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#22c55e" />
      </line>
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={2} array={new Float32Array([0, 0, -5, 0, 0, 5])} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" />
      </line>
    </group>
  );
}

export function OrbitalViewer({ satellites, satRecs, loading, error }: OrbitalViewerProps) {
  const [selectedSatellite, setSelectedSatellite] = useState<{ name: string; distance: number } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const debrisDensity = realSpaceDataService.getDebrisDensityByAltitude();

  const handleSatelliteClick = (name: string, distance: number) => {
    const distanceInMiles = distance * 0.621371;
    setSelectedSatellite({ name, distance: distanceInMiles });
  };

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [5, 3, 5], fov: 60 }} gl={{ antialias: true, alpha: true }}>
        <color attach="background" args={['#0a0e1a']} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <pointLight position={[-10, -5, -10]} intensity={0.3} color="#4488ff" />
        <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <AxesDisplay />
        <Earth />
        
        {showHeatmap && <DebrisHeatmap densityData={debrisDensity} />}
        
        {satRecs.slice(0, 500).map((sat, index) => (
          <SatelliteModel
            key={index}
            satrec={sat.satrec}
            name={sat.name}
            onClick={handleSatelliteClick}
          />
        ))}
        
        {satellites.slice(0, 30).map((sat, index) => (
          <OrbitPath key={`orbit-${index}`} radius={sat.altitude} inclination={sat.inclination} />
        ))}
        
        <OrbitControls enablePan enableZoom enableRotate minDistance={2} maxDistance={20} />
      </Canvas>

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

      <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm border border-primary/20 rounded-lg p-3 glow-border z-40">
        <div className="text-xs space-y-2">
          <p className="text-muted-foreground">Total Objects: <span className="text-primary font-bold">{satellites.length}</span></p>
          <p className="text-muted-foreground">Displaying: <span className="text-primary font-bold">{Math.min(500, satellites.length)}</span></p>
          <p className="text-muted-foreground">Hover satellites for names</p>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className="w-full mt-2 px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded text-primary transition-colors"
          >
            {showHeatmap ? 'Hide' : 'Show'} Density Heatmap
          </button>
        </div>
      </div>
    </div>
  );
}
