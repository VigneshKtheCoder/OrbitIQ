import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DebrisHeatmapProps {
  densityData: Array<{ altitude: number; density: number; objects: number }>;
}

/**
 * Visualizes orbital debris density as color-coded rings around Earth
 * Colors: Green (low) → Yellow → Orange → Red (high density)
 */
export function DebrisHeatmap({ densityData }: DebrisHeatmapProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Slowly rotate heatmap for visibility
      groupRef.current.rotation.y += 0.0002;
    }
  });

  const rings = useMemo(() => {
    return densityData.map((data, index) => {
      // Convert altitude from km to scene units (Earth radius = 1 unit = 6371 km)
      const earthRadius = 6371;
      const radius = 1 + (data.altitude / earthRadius);
      
      // Color based on density (0-1 scale)
      const color = new THREE.Color();
      if (data.density < 0.3) {
        // Low density: Green to Yellow
        color.setHSL(0.33 - (data.density * 0.33), 0.8, 0.5);
      } else if (data.density < 0.6) {
        // Medium density: Yellow to Orange
        color.setHSL(0.16 - ((data.density - 0.3) * 0.16), 0.9, 0.5);
      } else {
        // High density: Orange to Red
        color.setHSL(0.08 - ((data.density - 0.6) * 0.08), 1.0, 0.5);
      }

      // Opacity based on density
      const opacity = 0.15 + (data.density * 0.25);

      return {
        key: `ring-${index}`,
        radius,
        color,
        opacity,
        density: data.density,
        objects: data.objects,
        altitude: data.altitude
      };
    });
  }, [densityData]);

  return (
    <group ref={groupRef}>
      {rings.map((ring) => (
        <mesh key={ring.key} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[ring.radius, 0.02, 16, 100]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={ring.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      
      {/* Label for highest density region */}
      {rings.length > 0 && (
        <group position={[
          rings.reduce((max, r) => r.density > max.density ? r : max).radius + 0.2,
          0,
          0
        ]}>
          {/* Marker sphere */}
          <mesh>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        </group>
      )}
    </group>
  );
}
