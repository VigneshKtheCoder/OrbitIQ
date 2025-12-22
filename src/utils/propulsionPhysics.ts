// Mission Lifetime & Fuel Consumption Module
// Classical rocket equations for propellant tracking and Δv budgeting

export interface SpacecraftPropulsion {
  dryMass: number; // kg - spacecraft mass without propellant
  propellantMass: number; // kg - remaining propellant
  initialPropellant: number; // kg - starting propellant
  specificImpulse: number; // s - Isp of propulsion system
  thrustLevel: number; // N - nominal thrust
  minPropellantReserve: number; // kg - minimum reserve for EOL
}

export interface ManeuverPlan {
  id: string;
  type: 'collision_avoidance' | 'station_keeping' | 'orbit_raise' | 'deorbit' | 'attitude_correction';
  deltaV: number; // m/s
  propellantRequired: number; // kg
  executionTime: Date;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface MissionLifetimeState {
  remainingPropellant: number; // kg
  usedPropellant: number; // kg
  cumulativeDeltaV: number; // m/s
  totalDeltaVCapacity: number; // m/s
  remainingDeltaV: number; // m/s
  estimatedLifetimeDays: number;
  nominalLifetimeDays: number;
  lifetimePercentage: number;
  propellantPercentage: number;
  operationalMargin: number; // percentage of remaining capability
  status: 'nominal' | 'caution' | 'warning' | 'critical';
}

export interface ManeuverImpact {
  maneuver: ManeuverPlan;
  lifetimeBefore: MissionLifetimeState;
  lifetimeAfter: MissionLifetimeState;
  lifetimeReductionDays: number;
  marginReduction: number; // percentage points
  recommendation: 'execute' | 'defer' | 'optimize' | 'reject';
  alternativeStrategies: AlternativeStrategy[];
}

export interface AlternativeStrategy {
  name: string;
  deltaV: number;
  propellantSaved: number;
  lifetimeSaved: number; // days
  tradeoff: string;
}

// Physical constants
const G0 = 9.80665; // m/s² - standard gravity

// Default spacecraft configuration (typical LEO satellite)
export const DEFAULT_PROPULSION: SpacecraftPropulsion = {
  dryMass: 850, // kg
  propellantMass: 120, // kg - current remaining
  initialPropellant: 150, // kg - BOL propellant
  specificImpulse: 290, // s - hydrazine thruster
  thrustLevel: 22, // N
  minPropellantReserve: 8, // kg - EOL reserve for safe deorbit
};

// Nominal mission parameters
export const MISSION_PARAMS = {
  nominalLifetimeYears: 7,
  stationKeepingDeltaVPerYear: 15, // m/s/year for LEO
  averageCollisionAvoidanceDeltaV: 0.5, // m/s per maneuver
  expectedCollisionManeuversPerYear: 3,
  orbitDecayCompensationDeltaVPerYear: 8, // m/s/year at 400km
};

/**
 * Tsiolkovsky Rocket Equation: Δv = Isp × g₀ × ln(m₀/m₁)
 * Calculate delta-v from propellant consumption
 */
export function calculateDeltaV(
  propellant: SpacecraftPropulsion,
  propellantUsed: number
): number {
  const m0 = propellant.dryMass + propellant.propellantMass; // initial mass
  const m1 = m0 - propellantUsed; // final mass
  
  if (m1 <= propellant.dryMass) {
    return Infinity; // Cannot use more propellant than available
  }
  
  const deltaV = propellant.specificImpulse * G0 * Math.log(m0 / m1);
  return deltaV;
}

/**
 * Inverse rocket equation: Calculate propellant required for a given Δv
 * m_prop = m_dry × (exp(Δv / (Isp × g₀)) - 1) / (1 - exp(-Δv / (Isp × g₀)))
 */
export function calculatePropellantRequired(
  propulsion: SpacecraftPropulsion,
  deltaV: number
): number {
  const exhaustVelocity = propulsion.specificImpulse * G0;
  const massRatio = Math.exp(deltaV / exhaustVelocity);
  const currentMass = propulsion.dryMass + propulsion.propellantMass;
  const finalMass = currentMass / massRatio;
  const propellantRequired = currentMass - finalMass;
  
  return Math.max(0, propellantRequired);
}

/**
 * Calculate total Δv capacity from current state
 */
export function calculateTotalDeltaVCapacity(propulsion: SpacecraftPropulsion): number {
  const usablePropellant = propulsion.propellantMass - propulsion.minPropellantReserve;
  if (usablePropellant <= 0) return 0;
  
  return calculateDeltaV(propulsion, usablePropellant);
}

/**
 * Calculate mission lifetime state
 */
export function calculateMissionLifetimeState(
  propulsion: SpacecraftPropulsion,
  cumulativeDeltaV: number = 0
): MissionLifetimeState {
  const usedPropellant = propulsion.initialPropellant - propulsion.propellantMass;
  const totalCapacity = calculateDeltaVFromMass(
    propulsion.dryMass,
    propulsion.initialPropellant - propulsion.minPropellantReserve,
    propulsion.specificImpulse
  );
  
  const remainingCapacity = calculateTotalDeltaVCapacity(propulsion);
  
  // Calculate lifetime based on propellant consumption rate
  const annualDeltaVBudget = 
    MISSION_PARAMS.stationKeepingDeltaVPerYear +
    MISSION_PARAMS.orbitDecayCompensationDeltaVPerYear +
    (MISSION_PARAMS.averageCollisionAvoidanceDeltaV * MISSION_PARAMS.expectedCollisionManeuversPerYear);
  
  const remainingDays = (remainingCapacity / annualDeltaVBudget) * 365;
  const nominalDays = MISSION_PARAMS.nominalLifetimeYears * 365;
  
  const lifetimePercentage = Math.min(100, (remainingDays / nominalDays) * 100);
  const propellantPercentage = (propulsion.propellantMass / propulsion.initialPropellant) * 100;
  
  // Operational margin considers both propellant and time
  const operationalMargin = Math.min(
    ((propulsion.propellantMass - propulsion.minPropellantReserve) / propulsion.initialPropellant) * 100,
    lifetimePercentage
  );
  
  // Determine status
  let status: MissionLifetimeState['status'] = 'nominal';
  if (operationalMargin < 10) status = 'critical';
  else if (operationalMargin < 25) status = 'warning';
  else if (operationalMargin < 50) status = 'caution';
  
  return {
    remainingPropellant: propulsion.propellantMass,
    usedPropellant,
    cumulativeDeltaV,
    totalDeltaVCapacity: totalCapacity,
    remainingDeltaV: remainingCapacity,
    estimatedLifetimeDays: Math.max(0, remainingDays),
    nominalLifetimeDays: nominalDays,
    lifetimePercentage,
    propellantPercentage,
    operationalMargin,
    status,
  };
}

/**
 * Helper to calculate Δv from mass values
 */
function calculateDeltaVFromMass(
  dryMass: number,
  propellantMass: number,
  isp: number
): number {
  if (propellantMass <= 0) return 0;
  const m0 = dryMass + propellantMass;
  const m1 = dryMass;
  return isp * G0 * Math.log(m0 / m1);
}

/**
 * Create a maneuver plan for collision avoidance
 */
export function createCollisionAvoidanceManeuver(
  propulsion: SpacecraftPropulsion,
  threatLevel: 'low' | 'medium' | 'high' | 'critical',
  missDistance: number // km
): ManeuverPlan {
  // Δv scales with threat level and inverse of miss distance
  let baseDeltaV = MISSION_PARAMS.averageCollisionAvoidanceDeltaV;
  
  switch (threatLevel) {
    case 'critical':
      baseDeltaV *= 2.5;
      break;
    case 'high':
      baseDeltaV *= 1.8;
      break;
    case 'medium':
      baseDeltaV *= 1.2;
      break;
    case 'low':
      baseDeltaV *= 0.6;
      break;
  }
  
  // Adjust based on miss distance (closer = more Δv needed)
  if (missDistance < 0.5) baseDeltaV *= 1.5;
  else if (missDistance < 1) baseDeltaV *= 1.2;
  else if (missDistance > 5) baseDeltaV *= 0.7;
  
  const deltaV = Math.round(baseDeltaV * 100) / 100;
  const propellantRequired = calculatePropellantRequired(propulsion, deltaV);
  
  return {
    id: `CAM-${Date.now()}`,
    type: 'collision_avoidance',
    deltaV,
    propellantRequired: Math.round(propellantRequired * 1000) / 1000,
    executionTime: new Date(Date.now() + 3600000), // 1 hour from now
    description: `Collision avoidance maneuver for ${threatLevel} threat at ${missDistance.toFixed(2)}km miss distance`,
    priority: threatLevel,
  };
}

/**
 * Assess the impact of a maneuver on mission lifetime
 */
export function assessManeuverImpact(
  propulsion: SpacecraftPropulsion,
  maneuver: ManeuverPlan,
  currentCumulativeDeltaV: number = 0
): ManeuverImpact {
  const lifetimeBefore = calculateMissionLifetimeState(propulsion, currentCumulativeDeltaV);
  
  // Simulate post-maneuver state
  const postManeuverPropulsion: SpacecraftPropulsion = {
    ...propulsion,
    propellantMass: propulsion.propellantMass - maneuver.propellantRequired,
  };
  
  const lifetimeAfter = calculateMissionLifetimeState(
    postManeuverPropulsion,
    currentCumulativeDeltaV + maneuver.deltaV
  );
  
  const lifetimeReductionDays = lifetimeBefore.estimatedLifetimeDays - lifetimeAfter.estimatedLifetimeDays;
  const marginReduction = lifetimeBefore.operationalMargin - lifetimeAfter.operationalMargin;
  
  // Generate recommendation based on priority vs impact
  let recommendation: ManeuverImpact['recommendation'] = 'execute';
  
  if (maneuver.priority === 'critical' || maneuver.priority === 'high') {
    recommendation = 'execute';
  } else if (marginReduction > 10 && maneuver.priority === 'low') {
    recommendation = 'reject';
  } else if (marginReduction > 5) {
    recommendation = 'optimize';
  } else if (lifetimeAfter.status === 'critical') {
    recommendation = 'defer';
  }
  
  // Generate alternative strategies
  const alternativeStrategies = generateAlternativeStrategies(maneuver, lifetimeReductionDays);
  
  return {
    maneuver,
    lifetimeBefore,
    lifetimeAfter,
    lifetimeReductionDays,
    marginReduction,
    recommendation,
    alternativeStrategies,
  };
}

/**
 * Generate alternative maneuver strategies
 */
function generateAlternativeStrategies(
  maneuver: ManeuverPlan,
  lifetimeImpactDays: number
): AlternativeStrategy[] {
  const strategies: AlternativeStrategy[] = [];
  
  if (maneuver.type === 'collision_avoidance') {
    // Lower-energy in-track maneuver
    strategies.push({
      name: 'In-track timing adjustment',
      deltaV: maneuver.deltaV * 0.6,
      propellantSaved: maneuver.propellantRequired * 0.4,
      lifetimeSaved: lifetimeImpactDays * 0.4,
      tradeoff: 'Requires earlier execution (24h+), slight increase in residual collision probability',
    });
    
    // Cross-track maneuver
    strategies.push({
      name: 'Cross-track offset',
      deltaV: maneuver.deltaV * 0.7,
      propellantSaved: maneuver.propellantRequired * 0.3,
      lifetimeSaved: lifetimeImpactDays * 0.3,
      tradeoff: 'Changes orbital plane slightly, may require future correction',
    });
    
    // Accept risk strategy
    if (maneuver.priority !== 'critical') {
      strategies.push({
        name: 'Enhanced monitoring only',
        deltaV: 0,
        propellantSaved: maneuver.propellantRequired,
        lifetimeSaved: lifetimeImpactDays,
        tradeoff: 'Accepts calculated collision risk, continuous tracking required',
      });
    }
  }
  
  return strategies;
}

/**
 * Calculate burn duration for a maneuver
 */
export function calculateBurnDuration(
  propulsion: SpacecraftPropulsion,
  deltaV: number
): number {
  const propellantRequired = calculatePropellantRequired(propulsion, deltaV);
  const massFlowRate = propulsion.thrustLevel / (propulsion.specificImpulse * G0);
  return propellantRequired / massFlowRate; // seconds
}

/**
 * Format propellant mass for display
 */
export function formatPropellant(kg: number): string {
  if (kg < 1) return `${(kg * 1000).toFixed(0)}g`;
  return `${kg.toFixed(2)}kg`;
}

/**
 * Format Δv for display
 */
export function formatDeltaV(ms: number): string {
  if (ms < 1) return `${(ms * 100).toFixed(1)}cm/s`;
  return `${ms.toFixed(2)}m/s`;
}

/**
 * Format days for display
 */
export function formatLifetime(days: number): string {
  if (days < 30) return `${Math.round(days)} days`;
  if (days < 365) return `${(days / 30).toFixed(1)} months`;
  return `${(days / 365).toFixed(1)} years`;
}
