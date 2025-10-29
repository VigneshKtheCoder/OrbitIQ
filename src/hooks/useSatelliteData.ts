import { useState, useEffect } from 'react';
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

export function useSatelliteData() {
  const [satellites, setSatellites] = useState<SatelliteData[]>([]);
  const [satRecs, setSatRecs] = useState<SatRecData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchTLEData = async () => {
      try {
        setLoading(true);
        
        // Fetch TLE data from CelesTrak (active satellites)
        const response = await fetch('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle');
        
        if (!response.ok) {
          throw new Error('Failed to fetch satellite data');
        }
        
        const text = await response.text();
        const lines = text.split('\n');
        
        const satelliteData: SatelliteData[] = [];
        const satRecData: SatRecData[] = [];
        
        // Parse TLE data (format: name, line1, line2)
        for (let i = 0; i < lines.length - 2; i += 3) {
          const name = lines[i].trim();
          const tleLine1 = lines[i + 1].trim();
          const tleLine2 = lines[i + 2].trim();
          
          if (!name || !tleLine1 || !tleLine2) continue;
          
          try {
            // Parse TLE
            const satrec = satellite.twoline2satrec(tleLine1, tleLine2);
            
            // Store the satrec for real-time propagation
            satRecData.push({
              name,
              satrec
            });
            
            // Get current position for orbit visualization
            const now = new Date();
            const positionAndVelocity = satellite.propagate(satrec, now);
            
            if (positionAndVelocity.position && typeof positionAndVelocity.position !== 'boolean') {
              const position = positionAndVelocity.position as satellite.EciVec3<number>;
              const velocity = positionAndVelocity.velocity as satellite.EciVec3<number>;
              
              // Convert from km to our scene units (Earth radius = 1 unit = 6371 km)
              const earthRadius = 6371;
              const scale = 1 / earthRadius;
              
              const x = position.x * scale;
              const y = position.y * scale;
              const z = position.z * scale;
              
              const vx = velocity ? velocity.x : 0;
              const vy = velocity ? velocity.y : 0;
              const vz = velocity ? velocity.z : 0;
              
              const altitude = Math.sqrt(x * x + y * y + z * z);
              
              // Get inclination from TLE (in degrees)
              const inclinationMatch = tleLine2.match(/^\d+\s+(\d+\.\d+)/);
              const inclination = inclinationMatch ? parseFloat(inclinationMatch[1]) * (Math.PI / 180) : 0;
              
              satelliteData.push({
                name,
                position: [x, y, z],
                velocity: [vx, vy, vz],
                altitude,
                inclination,
              });
            }
          } catch (err) {
            console.warn(`Failed to parse satellite: ${name}`, err);
          }
          
          // Limit to 2000 satellites for performance
          if (satelliteData.length >= 2000) break;
        }
        
        setSatellites(satelliteData);
        setSatRecs(satRecData);
        setError(null);
      } catch (err) {
        console.error('Error fetching satellite data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        
        // Generate mock data as fallback
        const mockData: SatelliteData[] = [];
        for (let i = 0; i < 1000; i++) {
          const altitude = 1.2 + Math.random() * 2; // 1.2 to 3.2 Earth radii
          const inclination = Math.random() * Math.PI;
          const angle = Math.random() * Math.PI * 2;
          
          const x = altitude * Math.cos(angle) * Math.cos(inclination);
          const y = altitude * Math.sin(angle);
          const z = altitude * Math.cos(angle) * Math.sin(inclination);
          
          // Orbital velocity (simplified)
          const speed = 0.5 / Math.sqrt(altitude);
          const vx = -speed * Math.sin(angle);
          const vy = speed * Math.cos(angle);
          const vz = 0;
          
          mockData.push({
            name: `SAT-${i}`,
            position: [x, y, z],
            velocity: [vx, vy, vz],
            altitude,
            inclination,
          });
        }
        
        setSatellites(mockData);
      } finally {
        setLoading(false);
        setLastUpdate(new Date());
      }
    };

  useEffect(() => {
    fetchTLEData();
  }, []);

  const refresh = () => {
    fetchTLEData();
  };

  return { satellites, satRecs, loading, error, lastUpdate, refresh };
}
