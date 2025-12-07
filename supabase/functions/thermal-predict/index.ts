import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Physical constants
const SOLAR_CONSTANT = 1361;
const STEFAN_BOLTZMANN = 5.67e-8;
const EARTH_RADIUS = 6371;
const EARTH_IR_EMISSION = 237;
const EARTH_ALBEDO = 0.3;

interface SatelliteConfig {
  mass: number;
  surfaceArea: number;
  absorptivity: number;
  emissivity: number;
  specificHeat: number;
  internalPower: number;
  minTemp: number;
  maxTemp: number;
}

interface OrbitalState {
  altitude: number;
  inclination: number;
  betaAngle: number;
}

interface ThermalResult {
  peakTemperature: number;
  peakTemperatureCelsius: number;
  minTemperature: number;
  minTemperatureCelsius: number;
  timeToOverheat: number | null;
  timeToOverheatFormatted: string | null;
  riskScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  mitigations: Array<{
    type: string;
    description: string;
    impact: number;
    priority: string;
  }>;
  summary: string;
}

const DEFAULT_CONFIG: SatelliteConfig = {
  mass: 1000,
  surfaceArea: 20,
  absorptivity: 0.3,
  emissivity: 0.85,
  specificHeat: 900,
  internalPower: 500,
  minTemp: 223,
  maxTemp: 373,
};

function isInEclipse(altitude: number, orbitAngle: number, sunAngle: number): boolean {
  const satRadius = EARTH_RADIUS + altitude;
  const earthAngularRadius = Math.asin(EARTH_RADIUS / satRadius);
  const relativeAngle = Math.abs(orbitAngle - sunAngle) % (2 * Math.PI);
  return relativeAngle > Math.PI - earthAngularRadius && relativeAngle < Math.PI + earthAngularRadius;
}

function calculateHeatFluxes(
  config: SatelliteConfig,
  altitude: number,
  temperature: number,
  eclipse: boolean
) {
  const rho = EARTH_RADIUS / (EARTH_RADIUS + altitude);
  const viewFactor = 0.5 * (1 - Math.sqrt(1 - rho * rho));
  
  const solarFlux = eclipse ? 0 : SOLAR_CONSTANT * config.absorptivity;
  const albedoFlux = eclipse ? 0 : SOLAR_CONSTANT * EARTH_ALBEDO * viewFactor * config.absorptivity;
  const earthIRFlux = EARTH_IR_EMISSION * viewFactor * config.emissivity;
  const internalFlux = config.internalPower / config.surfaceArea;
  const radiatedFlux = config.emissivity * STEFAN_BOLTZMANN * Math.pow(temperature, 4);
  
  return {
    solarFlux,
    albedoFlux,
    earthIRFlux,
    internalFlux,
    radiatedFlux,
    netFlux: solarFlux + albedoFlux + earthIRFlux + internalFlux - radiatedFlux,
    eclipse,
  };
}

function runSimulation(
  config: SatelliteConfig,
  orbitalState: OrbitalState,
  durationSeconds: number = 10800,
  timeStepSeconds: number = 60
): ThermalResult {
  let temperature = 293; // Start at 20°C
  let peakTemp = temperature;
  let minTemp = temperature;
  let timeToOverheat: number | null = null;
  
  const orbitalPeriod = 2 * Math.PI * Math.sqrt(
    Math.pow((EARTH_RADIUS + orbitalState.altitude) * 1000, 3) / (3.986e14)
  );
  const meanMotion = (2 * Math.PI) / orbitalPeriod;
  
  const steps = Math.floor(durationSeconds / timeStepSeconds);
  
  for (let i = 0; i <= steps; i++) {
    const orbitAngle = meanMotion * i * timeStepSeconds;
    const sunAngle = 0; // Simplified
    
    const eclipse = isInEclipse(orbitalState.altitude, orbitAngle, sunAngle);
    const fluxes = calculateHeatFluxes(config, orbitalState.altitude, temperature, eclipse);
    
    // Propagate temperature
    const thermalMass = config.mass * config.specificHeat;
    const heatInput = fluxes.netFlux * config.surfaceArea * timeStepSeconds;
    temperature += heatInput / thermalMass;
    
    peakTemp = Math.max(peakTemp, temperature);
    minTemp = Math.min(minTemp, temperature);
    
    if (temperature > config.maxTemp && timeToOverheat === null) {
      timeToOverheat = i * timeStepSeconds;
    }
  }
  
  // Calculate risk score
  const tempRangeRisk = Math.max(
    (peakTemp - config.maxTemp + 50) / 100,
    (config.minTemp - minTemp + 50) / 100,
    0
  ) * 60;
  
  const betaRisk = Math.abs(orbitalState.betaAngle) > 1 ? 20 : 0;
  const riskScore = Math.min(100, Math.round(tempRangeRisk + betaRisk));
  
  // Generate mitigations
  const mitigations = [];
  
  if (peakTemp > config.maxTemp - 30) {
    mitigations.push({
      type: 'attitude_slew',
      description: 'Rotate spacecraft to reduce solar exposure',
      impact: -15,
      priority: peakTemp > config.maxTemp ? 'required' : 'recommended',
    });
    mitigations.push({
      type: 'duty_cycle',
      description: 'Reduce payload duty cycle by 25%',
      impact: -8,
      priority: 'recommended',
    });
  }
  
  if (minTemp < config.minTemp + 30) {
    mitigations.push({
      type: 'heater_activation',
      description: 'Activate survival heaters during eclipse',
      impact: 12,
      priority: minTemp < config.minTemp ? 'required' : 'recommended',
    });
  }
  
  const riskLevel = riskScore < 25 ? 'low' : riskScore < 50 ? 'moderate' : riskScore < 75 ? 'high' : 'critical';
  
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };
  
  return {
    peakTemperature: Math.round(peakTemp * 100) / 100,
    peakTemperatureCelsius: Math.round((peakTemp - 273.15) * 100) / 100,
    minTemperature: Math.round(minTemp * 100) / 100,
    minTemperatureCelsius: Math.round((minTemp - 273.15) * 100) / 100,
    timeToOverheat,
    timeToOverheatFormatted: timeToOverheat ? formatDuration(timeToOverheat) : null,
    riskScore,
    riskLevel,
    mitigations,
    summary: `Thermal analysis complete. Risk level: ${riskLevel.toUpperCase()}. Peak temperature: ${Math.round(peakTemp - 273.15)}°C. ${
      timeToOverheat 
        ? `WARNING: Overheat predicted in ${formatDuration(timeToOverheat)}.` 
        : 'No thermal limit breaches predicted.'
    }`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Parse query parameters or body
    let altitude = 400;
    let inclination = 0.9;
    let betaAngle = 0.3;
    let duration = 10800;
    let satelliteType = 'default';
    
    if (req.method === 'GET') {
      altitude = parseFloat(url.searchParams.get('altitude') || '400');
      inclination = parseFloat(url.searchParams.get('inclination') || '0.9');
      betaAngle = parseFloat(url.searchParams.get('betaAngle') || '0.3');
      duration = parseInt(url.searchParams.get('duration') || '10800');
      satelliteType = url.searchParams.get('type') || 'default';
    } else if (req.method === 'POST') {
      const body = await req.json();
      altitude = body.altitude || 400;
      inclination = body.inclination || 0.9;
      betaAngle = body.betaAngle || 0.3;
      duration = body.duration || 10800;
      satelliteType = body.type || 'default';
    }
    
    // Select satellite configuration
    let config: SatelliteConfig;
    switch (satelliteType) {
      case 'cubesat':
        config = {
          mass: 4,
          surfaceArea: 0.06,
          absorptivity: 0.25,
          emissivity: 0.9,
          specificHeat: 900,
          internalPower: 8,
          minTemp: 253,
          maxTemp: 343,
        };
        break;
      case 'iss':
        config = {
          mass: 45000,
          surfaceArea: 1200,
          absorptivity: 0.35,
          emissivity: 0.85,
          specificHeat: 900,
          internalPower: 75000,
          minTemp: 283,
          maxTemp: 313,
        };
        break;
      default:
        config = DEFAULT_CONFIG;
    }
    
    const orbitalState: OrbitalState = {
      altitude,
      inclination,
      betaAngle,
    };
    
    console.log('Running thermal prediction:', { orbitalState, satelliteType, duration });
    
    const result = runSimulation(config, orbitalState, duration);
    
    return new Response(JSON.stringify({
      success: true,
      data: result,
      parameters: {
        altitude,
        inclination,
        betaAngle,
        duration,
        satelliteType,
      },
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Thermal prediction error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
