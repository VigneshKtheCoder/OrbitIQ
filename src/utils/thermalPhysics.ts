// Thermal Risk & Heat Management Physics Engine for LEO Satellites
// Models orbital heat transfer and predicts thermal overload events

export interface SatelliteConfig {
  name: string;
  mass: number; // kg
  surfaceArea: number; // m²
  absorptivity: number; // solar absorptivity (0-1)
  emissivity: number; // IR emissivity (0-1)
  specificHeat: number; // J/(kg·K)
  internalPower: number; // W - internal heat dissipation
  minTemp: number; // K - minimum operational temperature
  maxTemp: number; // K - maximum operational temperature
}

export interface OrbitalState {
  position: [number, number, number]; // ECI km
  velocity: [number, number, number]; // ECI km/s
  altitude: number; // km
  inclination: number; // radians
  betaAngle: number; // radians - angle between orbital plane and Sun vector
}

export interface ThermalState {
  time: Date;
  temperature: number; // K
  solarFlux: number; // W/m²
  albedoFlux: number; // W/m²
  earthIRFlux: number; // W/m²
  internalFlux: number; // W/m²
  netHeatFlux: number; // W/m²
  isEclipse: boolean;
  riskLevel: 'nominal' | 'warning' | 'critical';
}

export interface ThermalPrediction {
  peakTemperature: number; // K
  minTemperature: number; // K
  timeToOverheat: number | null; // seconds, null if no overheat predicted
  timeToUnderheat: number | null; // seconds
  riskScore: number; // 0-100
  riskWindows: RiskWindow[];
  mitigations: Mitigation[];
  thermalTimeline: ThermalState[];
}

export interface RiskWindow {
  startTime: Date;
  endTime: Date;
  type: 'eclipse_exit' | 'eclipse_entry' | 'high_beta' | 'prolonged_sun';
  severity: 'warning' | 'critical';
  peakTemp: number;
  description: string;
}

export interface Mitigation {
  type: 'attitude_slew' | 'duty_cycle' | 'orbit_timing' | 'heater_activation';
  description: string;
  impact: number; // temperature change in K
  priority: 'recommended' | 'required' | 'optional';
}

// Physical constants
const SOLAR_CONSTANT = 1361; // W/m² at 1 AU
const STEFAN_BOLTZMANN = 5.67e-8; // W/(m²·K⁴)
const EARTH_RADIUS = 6371; // km
const EARTH_IR_EMISSION = 237; // W/m² average
const EARTH_ALBEDO = 0.3; // average

// Default satellite configuration (ISS-like)
export const DEFAULT_SATELLITE_CONFIG: SatelliteConfig = {
  name: 'Default LEO Satellite',
  mass: 1000, // kg
  surfaceArea: 20, // m²
  absorptivity: 0.3,
  emissivity: 0.85,
  specificHeat: 900, // J/(kg·K) aluminum
  internalPower: 500, // W
  minTemp: 223, // -50°C
  maxTemp: 373, // 100°C
};

// Calculate beta angle from orbital elements and sun position
export function calculateBetaAngle(
  inclination: number,
  rightAscension: number,
  sunDeclination: number,
  sunRightAscension: number
): number {
  const gamma = sunRightAscension - rightAscension;
  const beta = Math.asin(
    Math.cos(sunDeclination) * Math.sin(inclination) * Math.sin(gamma) +
    Math.sin(sunDeclination) * Math.cos(inclination)
  );
  return beta;
}

// Determine if satellite is in Earth's shadow
export function isInEclipse(
  position: [number, number, number],
  sunVector: [number, number, number]
): boolean {
  const satPos = Math.sqrt(position[0] ** 2 + position[1] ** 2 + position[2] ** 2);
  
  // Normalize vectors
  const satNorm: [number, number, number] = [
    position[0] / satPos,
    position[1] / satPos,
    position[2] / satPos,
  ];
  
  const sunMag = Math.sqrt(sunVector[0] ** 2 + sunVector[1] ** 2 + sunVector[2] ** 2);
  const sunNorm: [number, number, number] = [
    sunVector[0] / sunMag,
    sunVector[1] / sunMag,
    sunVector[2] / sunMag,
  ];
  
  // Dot product to find angle between satellite and sun
  const dot = satNorm[0] * sunNorm[0] + satNorm[1] * sunNorm[1] + satNorm[2] * sunNorm[2];
  
  // Eclipse geometry - simplified cylindrical shadow
  const earthAngularRadius = Math.asin(EARTH_RADIUS / satPos);
  const sunAngle = Math.acos(Math.max(-1, Math.min(1, -dot)));
  
  return sunAngle < earthAngularRadius;
}

// Calculate Sun vector for a given time (simplified model)
export function getSunVector(time: Date): [number, number, number] {
  const dayOfYear = Math.floor(
    (time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const hourOfDay = time.getUTCHours() + time.getUTCMinutes() / 60;
  
  // Solar declination (simplified)
  const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180));
  const decRad = declination * (Math.PI / 180);
  
  // Hour angle
  const hourAngle = (hourOfDay - 12) * 15 * (Math.PI / 180);
  
  // Sun vector in ECI (simplified)
  const sunX = Math.cos(decRad) * Math.cos(hourAngle);
  const sunY = Math.cos(decRad) * Math.sin(hourAngle);
  const sunZ = Math.sin(decRad);
  
  // Normalize to 1 AU distance (in km for consistency, though we only need direction)
  const au = 149597870.7;
  return [sunX * au, sunY * au, sunZ * au];
}

// Calculate heat fluxes
export function calculateHeatFluxes(
  config: SatelliteConfig,
  orbitalState: OrbitalState,
  sunVector: [number, number, number],
  temperature: number
): {
  solarFlux: number;
  albedoFlux: number;
  earthIRFlux: number;
  internalFlux: number;
  radiatedFlux: number;
  netFlux: number;
  isEclipse: boolean;
} {
  const eclipse = isInEclipse(orbitalState.position, sunVector);
  
  // View factor to Earth (simplified)
  const altitude = orbitalState.altitude;
  const rho = EARTH_RADIUS / (EARTH_RADIUS + altitude);
  const viewFactor = 0.5 * (1 - Math.sqrt(1 - rho * rho));
  
  // Solar flux (0 if in eclipse)
  const solarFlux = eclipse ? 0 : SOLAR_CONSTANT * config.absorptivity;
  
  // Albedo flux (reflected solar from Earth, reduced in eclipse)
  const albedoBase = SOLAR_CONSTANT * EARTH_ALBEDO * viewFactor * config.absorptivity;
  const albedoFlux = eclipse ? albedoBase * 0.1 : albedoBase;
  
  // Earth IR flux
  const earthIRFlux = EARTH_IR_EMISSION * viewFactor * config.emissivity;
  
  // Internal power dissipation
  const internalFlux = config.internalPower / config.surfaceArea;
  
  // Radiated heat (Stefan-Boltzmann)
  const radiatedFlux = config.emissivity * STEFAN_BOLTZMANN * Math.pow(temperature, 4);
  
  // Net heat flux
  const netFlux = solarFlux + albedoFlux + earthIRFlux + internalFlux - radiatedFlux;
  
  return {
    solarFlux,
    albedoFlux,
    earthIRFlux,
    internalFlux,
    radiatedFlux,
    netFlux,
    isEclipse: eclipse,
  };
}

// Propagate temperature using transient heat equation
// dT/dt = Q_net / (m * c)
export function propagateTemperature(
  config: SatelliteConfig,
  currentTemp: number,
  netHeatFlux: number,
  deltaTime: number // seconds
): number {
  const thermalMass = config.mass * config.specificHeat;
  const heatInput = netHeatFlux * config.surfaceArea * deltaTime;
  const deltaT = heatInput / thermalMass;
  
  return currentTemp + deltaT;
}

// Run full thermal simulation
export function runThermalSimulation(
  config: SatelliteConfig,
  orbitalState: OrbitalState,
  startTime: Date,
  durationSeconds: number,
  timeStepSeconds: number = 60
): ThermalPrediction {
  const timeline: ThermalState[] = [];
  const riskWindows: RiskWindow[] = [];
  
  let temperature = 293; // Start at 20°C
  let peakTemp = temperature;
  let minTemp = temperature;
  let timeToOverheat: number | null = null;
  let timeToUnderheat: number | null = null;
  
  let inRiskWindow = false;
  let riskWindowStart: Date | null = null;
  let riskWindowType: RiskWindow['type'] | null = null;
  let wasEclipse = false;
  let consecutiveSunExposure = 0;
  
  const steps = Math.floor(durationSeconds / timeStepSeconds);
  
  for (let i = 0; i <= steps; i++) {
    const currentTime = new Date(startTime.getTime() + i * timeStepSeconds * 1000);
    const sunVector = getSunVector(currentTime);
    
    // Simulate orbital motion (simplified circular orbit)
    const orbitalPeriod = 2 * Math.PI * Math.sqrt(
      Math.pow((EARTH_RADIUS + orbitalState.altitude) * 1000, 3) / (3.986e14)
    );
    const meanMotion = (2 * Math.PI) / orbitalPeriod;
    const angle = meanMotion * i * timeStepSeconds;
    
    const currentPosition: [number, number, number] = [
      (EARTH_RADIUS + orbitalState.altitude) * Math.cos(angle) * Math.cos(orbitalState.inclination),
      (EARTH_RADIUS + orbitalState.altitude) * Math.sin(angle),
      (EARTH_RADIUS + orbitalState.altitude) * Math.cos(angle) * Math.sin(orbitalState.inclination),
    ];
    
    const currentOrbitalState: OrbitalState = {
      ...orbitalState,
      position: currentPosition,
    };
    
    const fluxes = calculateHeatFluxes(config, currentOrbitalState, sunVector, temperature);
    temperature = propagateTemperature(config, temperature, fluxes.netFlux, timeStepSeconds);
    
    // Track extremes
    peakTemp = Math.max(peakTemp, temperature);
    minTemp = Math.min(minTemp, temperature);
    
    // Check for overheat/underheat
    if (temperature > config.maxTemp && timeToOverheat === null) {
      timeToOverheat = i * timeStepSeconds;
    }
    if (temperature < config.minTemp && timeToUnderheat === null) {
      timeToUnderheat = i * timeStepSeconds;
    }
    
    // Determine risk level
    let riskLevel: ThermalState['riskLevel'] = 'nominal';
    const tempMarginHigh = config.maxTemp - temperature;
    const tempMarginLow = temperature - config.minTemp;
    
    if (tempMarginHigh < 10 || tempMarginLow < 10) {
      riskLevel = 'critical';
    } else if (tempMarginHigh < 30 || tempMarginLow < 30) {
      riskLevel = 'warning';
    }
    
    // Track risk windows
    const isEclipse = fluxes.isEclipse;
    
    // Eclipse exit detection (cold to hot transition)
    if (wasEclipse && !isEclipse && !inRiskWindow) {
      riskWindowStart = currentTime;
      riskWindowType = 'eclipse_exit';
      inRiskWindow = true;
    }
    
    // Eclipse entry detection (hot to cold transition)
    if (!wasEclipse && isEclipse && !inRiskWindow) {
      riskWindowStart = currentTime;
      riskWindowType = 'eclipse_entry';
      inRiskWindow = true;
    }
    
    // Prolonged sun exposure
    if (!isEclipse) {
      consecutiveSunExposure += timeStepSeconds;
      if (consecutiveSunExposure > 3600 && !inRiskWindow) { // 1 hour
        riskWindowStart = currentTime;
        riskWindowType = 'prolonged_sun';
        inRiskWindow = true;
      }
    } else {
      consecutiveSunExposure = 0;
    }
    
    // High beta angle detection
    if (Math.abs(orbitalState.betaAngle) > (60 * Math.PI / 180) && !inRiskWindow) {
      riskWindowStart = currentTime;
      riskWindowType = 'high_beta';
      inRiskWindow = true;
    }
    
    // Close risk window when returning to nominal
    if (inRiskWindow && riskLevel === 'nominal' && riskWindowStart && riskWindowType) {
      riskWindows.push({
        startTime: riskWindowStart,
        endTime: currentTime,
        type: riskWindowType,
        severity: peakTemp > config.maxTemp - 20 ? 'critical' : 'warning',
        peakTemp: peakTemp,
        description: getRiskWindowDescription(riskWindowType),
      });
      inRiskWindow = false;
      riskWindowStart = null;
      riskWindowType = null;
    }
    
    wasEclipse = isEclipse;
    
    timeline.push({
      time: currentTime,
      temperature,
      solarFlux: fluxes.solarFlux,
      albedoFlux: fluxes.albedoFlux,
      earthIRFlux: fluxes.earthIRFlux,
      internalFlux: fluxes.internalFlux,
      netHeatFlux: fluxes.netFlux,
      isEclipse,
      riskLevel,
    });
  }
  
  // Calculate risk score (0-100)
  const tempRangeRisk = Math.max(
    (peakTemp - config.maxTemp + 50) / 100,
    (config.minTemp - minTemp + 50) / 100,
    0
  ) * 50;
  
  const windowRisk = riskWindows.reduce((acc, w) => {
    return acc + (w.severity === 'critical' ? 15 : 8);
  }, 0);
  
  const riskScore = Math.min(100, Math.round(tempRangeRisk + windowRisk));
  
  // Generate mitigations
  const mitigations = generateMitigations(config, peakTemp, minTemp, riskWindows);
  
  return {
    peakTemperature: peakTemp,
    minTemperature: minTemp,
    timeToOverheat,
    timeToUnderheat,
    riskScore,
    riskWindows,
    mitigations,
    thermalTimeline: timeline,
  };
}

function getRiskWindowDescription(type: RiskWindow['type']): string {
  switch (type) {
    case 'eclipse_exit':
      return 'Rapid temperature rise after eclipse exit due to sudden solar exposure';
    case 'eclipse_entry':
      return 'Rapid temperature drop upon entering Earth shadow';
    case 'high_beta':
      return 'Extended sun exposure due to high beta angle orbit geometry';
    case 'prolonged_sun':
      return 'Continuous solar heating without eclipse cooling cycles';
    default:
      return 'Thermal risk event detected';
  }
}

function generateMitigations(
  config: SatelliteConfig,
  peakTemp: number,
  minTemp: number,
  riskWindows: RiskWindow[]
): Mitigation[] {
  const mitigations: Mitigation[] = [];
  
  // Hot mitigation
  if (peakTemp > config.maxTemp - 30) {
    mitigations.push({
      type: 'attitude_slew',
      description: 'Rotate spacecraft to reduce solar panel exposure and increase radiator view to cold space',
      impact: -15,
      priority: peakTemp > config.maxTemp ? 'required' : 'recommended',
    });
    
    mitigations.push({
      type: 'duty_cycle',
      description: 'Reduce payload duty cycle by 25% to decrease internal heat generation',
      impact: -8,
      priority: 'recommended',
    });
  }
  
  // Cold mitigation
  if (minTemp < config.minTemp + 30) {
    mitigations.push({
      type: 'heater_activation',
      description: 'Activate survival heaters to maintain minimum temperature during eclipse',
      impact: 12,
      priority: minTemp < config.minTemp ? 'required' : 'recommended',
    });
    
    mitigations.push({
      type: 'attitude_slew',
      description: 'Orient spacecraft to maximize solar absorption during eclipse exit',
      impact: 10,
      priority: 'optional',
    });
  }
  
  // Eclipse transition mitigation
  const eclipseWindows = riskWindows.filter(w => 
    w.type === 'eclipse_exit' || w.type === 'eclipse_entry'
  );
  
  if (eclipseWindows.length > 0) {
    mitigations.push({
      type: 'orbit_timing',
      description: 'Schedule high-power operations away from eclipse transitions to buffer thermal swings',
      impact: -5,
      priority: 'optional',
    });
  }
  
  // High beta mitigation
  if (riskWindows.some(w => w.type === 'high_beta')) {
    mitigations.push({
      type: 'attitude_slew',
      description: 'Implement beta-angle management attitude profile to balance thermal load',
      impact: -12,
      priority: 'recommended',
    });
  }
  
  return mitigations;
}

// Convert Kelvin to Celsius
export function kelvinToCelsius(k: number): number {
  return k - 273.15;
}

// Format duration in human readable
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
