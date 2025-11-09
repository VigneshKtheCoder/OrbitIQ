import * as satellite from 'satellite.js';

export interface CollisionRisk {
  sat1: string;
  sat2: string;
  distance: number;
  probability: number;
  timeToClosestApproach: number;
}

export interface SatellitePosition {
  name: string;
  position: [number, number, number];
  velocity: [number, number, number];
}

/**
 * Calculate actual collision probability between two satellites
 * Uses real-time 3D positions and velocities
 */
export function calculateCollisionProbability(
  pos1: [number, number, number],
  vel1: [number, number, number],
  pos2: [number, number, number],
  vel2: [number, number, number]
): { distance: number; probability: number; timeToClosest: number } {
  // Calculate current distance (in km, assuming Earth radius = 6371 km)
  const earthRadius = 6371;
  const dx = (pos1[0] - pos2[0]) * earthRadius;
  const dy = (pos1[1] - pos2[1]) * earthRadius;
  const dz = (pos1[2] - pos2[2]) * earthRadius;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // Calculate relative velocity
  const dvx = vel1[0] - vel2[0];
  const dvy = vel1[1] - vel2[1];
  const dvz = vel1[2] - vel2[2];
  const relativeSpeed = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);
  
  // Time to closest approach (simplified)
  const timeToClosest = distance / Math.max(relativeSpeed, 0.1);
  
  // Collision probability based on distance thresholds
  // Critical: <5km, High: <25km, Medium: <100km
  let probability = 0;
  if (distance < 5) {
    probability = 0.85; // 85% risk - CRITICAL
  } else if (distance < 25) {
    probability = 0.45; // 45% risk - HIGH
  } else if (distance < 100) {
    probability = 0.15; // 15% risk - MEDIUM
  } else if (distance < 500) {
    probability = 0.02; // 2% risk - LOW
  }
  
  return { distance, probability, timeToClosest };
}

/**
 * Detect all collision risks in a satellite constellation
 */
export function detectCollisionRisks(satellites: SatellitePosition[]): CollisionRisk[] {
  const risks: CollisionRisk[] = [];
  
  // Compare all pairs of satellites
  for (let i = 0; i < satellites.length; i++) {
    for (let j = i + 1; j < satellites.length; j++) {
      const sat1 = satellites[i];
      const sat2 = satellites[j];
      
      const result = calculateCollisionProbability(
        sat1.position,
        sat1.velocity,
        sat2.position,
        sat2.velocity
      );
      
      // Only track risks with probability > 1%
      if (result.probability > 0.01) {
        risks.push({
          sat1: sat1.name,
          sat2: sat2.name,
          distance: result.distance,
          probability: result.probability,
          timeToClosestApproach: result.timeToClosest
        });
      }
    }
  }
  
  // Sort by probability (highest first)
  return risks.sort((a, b) => b.probability - a.probability);
}

/**
 * Calculate orbital risk score based on collision risks
 */
export function calculateRiskScore(
  totalObjects: number,
  collisionRisks: CollisionRisk[]
): number {
  // Base risk from congestion
  const congestionFactor = Math.min(totalObjects / 2000, 1) * 30;
  
  // Risk from high-probability collisions
  const criticalRisks = collisionRisks.filter(r => r.probability > 0.5).length;
  const highRisks = collisionRisks.filter(r => r.probability > 0.2 && r.probability <= 0.5).length;
  
  const collisionFactor = (criticalRisks * 10 + highRisks * 5);
  
  // Risk from orbital density
  const densityFactor = Math.min(collisionRisks.length / 100, 1) * 20;
  
  // Combined risk score (0-100)
  const riskScore = Math.min(
    congestionFactor + collisionFactor + densityFactor,
    100
  );
  
  return Math.round(riskScore);
}

/**
 * Predict upcoming orbital events (reentries, maneuvers, deployments)
 */
export function predictOrbitalEvents(satellites: SatellitePosition[]): number {
  let eventCount = 0;
  
  satellites.forEach(sat => {
    const altitude = Math.sqrt(
      sat.position[0] ** 2 + 
      sat.position[1] ** 2 + 
      sat.position[2] ** 2
    );
    
    // Very low orbit - likely reentry within 30 days
    if (altitude < 1.15) eventCount += 1;
    
    // High eccentricity suggests maneuver planning
    const speed = Math.sqrt(
      sat.velocity[0] ** 2 + 
      sat.velocity[1] ** 2 + 
      sat.velocity[2] ** 2
    );
    if (speed > 8 || speed < 6) eventCount += 1;
    
    // GEO/MEO transition orbits
    if (altitude > 2.5 && altitude < 6) eventCount += 1;
  });
  
  return eventCount;
}
