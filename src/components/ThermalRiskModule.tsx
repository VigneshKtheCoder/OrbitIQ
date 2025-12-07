import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Thermometer, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Sun,
  Moon,
  Shield,
  Clock,
  Activity,
  Zap,
  RotateCcw
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import {
  runThermalSimulation,
  DEFAULT_SATELLITE_CONFIG,
  kelvinToCelsius,
  formatDuration,
  type ThermalPrediction,
  type OrbitalState,
  type SatelliteConfig,
} from '@/utils/thermalPhysics';

interface ThermalRiskModuleProps {
  satelliteData?: {
    position: [number, number, number];
    velocity: [number, number, number];
    altitude: number;
    inclination: number;
    name: string;
  };
  onClose?: () => void;
}

export function ThermalRiskModule({ satelliteData, onClose }: ThermalRiskModuleProps) {
  const [prediction, setPrediction] = useState<ThermalPrediction | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedSatellite, setSelectedSatellite] = useState<string>('default');
  
  // Satellite configurations
  const satelliteConfigs: Record<string, SatelliteConfig> = useMemo(() => ({
    default: DEFAULT_SATELLITE_CONFIG,
    cubesat: {
      name: 'CubeSat 3U',
      mass: 4,
      surfaceArea: 0.06,
      absorptivity: 0.25,
      emissivity: 0.9,
      specificHeat: 900,
      internalPower: 8,
      minTemp: 253,
      maxTemp: 343,
    },
    iss: {
      name: 'ISS Module',
      mass: 45000,
      surfaceArea: 1200,
      absorptivity: 0.35,
      emissivity: 0.85,
      specificHeat: 900,
      internalPower: 75000,
      minTemp: 283,
      maxTemp: 313,
    },
  }), []);

  const runSimulation = () => {
    setIsSimulating(true);
    
    // Use provided satellite data or defaults
    const orbitalState: OrbitalState = {
      position: satelliteData?.position || [6778, 0, 0],
      velocity: satelliteData?.velocity || [0, 7.66, 0],
      altitude: satelliteData?.altitude ? (satelliteData.altitude - 1) * 6371 : 400,
      inclination: satelliteData?.inclination || 0.9,
      betaAngle: 0.3, // ~17 degrees
    };
    
    const config = satelliteConfigs[selectedSatellite];
    
    // Simulate 2 orbital periods (~3 hours for LEO)
    setTimeout(() => {
      const result = runThermalSimulation(
        config,
        orbitalState,
        new Date(),
        10800, // 3 hours
        30 // 30 second steps
      );
      setPrediction(result);
      setIsSimulating(false);
    }, 500);
  };

  useEffect(() => {
    runSimulation();
  }, [selectedSatellite]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!prediction) return [];
    
    return prediction.thermalTimeline
      .filter((_, i) => i % 4 === 0) // Sample every 4th point for performance
      .map((state, index) => ({
        time: index * 2, // minutes
        temperature: Math.round(kelvinToCelsius(state.temperature) * 10) / 10,
        solarFlux: Math.round(state.solarFlux),
        earthIR: Math.round(state.earthIRFlux),
        netFlux: Math.round(state.netHeatFlux),
        isEclipse: state.isEclipse ? -50 : 100, // For visualization
        maxLimit: kelvinToCelsius(satelliteConfigs[selectedSatellite].maxTemp),
        minLimit: kelvinToCelsius(satelliteConfigs[selectedSatellite].minTemp),
      }));
  }, [prediction, selectedSatellite, satelliteConfigs]);

  const config = satelliteConfigs[selectedSatellite];

  return (
    <div className="absolute top-4 left-80 w-[600px] max-h-[calc(100vh-100px)] overflow-y-auto z-50 space-y-4">
      {/* Header Card */}
      <Card className="bg-card/95 backdrop-blur-md border-primary/30 glow-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Thermometer className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Thermal Risk Analysis</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {satelliteData?.name || 'Selected Satellite'} • LEO Heat Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="ghost"
                onClick={runSimulation}
                disabled={isSimulating}
              >
                <RotateCcw className={`h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
              </Button>
              {onClose && (
                <Button size="sm" variant="ghost" onClick={onClose}>×</Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Satellite Selection */}
          <div className="flex gap-2 mb-4">
            {Object.entries(satelliteConfigs).map(([key, cfg]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedSatellite === key ? 'default' : 'outline'}
                onClick={() => setSelectedSatellite(key)}
                className="text-xs"
              >
                {cfg.name}
              </Button>
            ))}
          </div>

          {isSimulating ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
              <span className="ml-3 text-muted-foreground">Running thermal simulation...</span>
            </div>
          ) : prediction ? (
            <div className="space-y-4">
              {/* Risk Score */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-3">
                  <Shield className={`h-6 w-6 ${
                    prediction.riskScore < 30 ? 'text-green-400' :
                    prediction.riskScore < 60 ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Thermal Risk Score</p>
                    <p className="text-xs text-muted-foreground">Next 3 hours prediction</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-bold ${
                    prediction.riskScore < 30 ? 'text-green-400' :
                    prediction.riskScore < 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {prediction.riskScore}
                  </p>
                  <Badge variant={
                    prediction.riskScore < 30 ? 'default' :
                    prediction.riskScore < 60 ? 'secondary' : 'destructive'
                  }>
                    {prediction.riskScore < 30 ? 'LOW' : prediction.riskScore < 60 ? 'MODERATE' : 'HIGH'}
                  </Badge>
                </div>
              </div>

              {/* Temperature Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-red-400" />
                    <span className="text-xs text-muted-foreground">Peak Temp</span>
                  </div>
                  <p className="text-xl font-bold text-red-400">
                    {kelvinToCelsius(prediction.peakTemperature).toFixed(1)}°C
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Limit: {kelvinToCelsius(config.maxTemp)}°C
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="h-4 w-4 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Min Temp</span>
                  </div>
                  <p className="text-xl font-bold text-blue-400">
                    {kelvinToCelsius(prediction.minTemperature).toFixed(1)}°C
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Limit: {kelvinToCelsius(config.minTemp)}°C
                  </p>
                </div>
                
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-orange-400" />
                    <span className="text-xs text-muted-foreground">Time to Limit</span>
                  </div>
                  <p className="text-xl font-bold text-orange-400">
                    {prediction.timeToOverheat 
                      ? formatDuration(prediction.timeToOverheat)
                      : prediction.timeToUnderheat
                        ? formatDuration(prediction.timeToUnderheat)
                        : 'Safe'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {prediction.timeToOverheat ? 'Overheat' : prediction.timeToUnderheat ? 'Underheat' : 'No breach'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Charts and Details */}
      {prediction && !isSimulating && (
        <Card className="bg-card/95 backdrop-blur-md border-primary/30">
          <CardContent className="pt-4">
            <Tabs defaultValue="temperature">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="temperature" className="flex-1">
                  <Thermometer className="h-4 w-4 mr-2" />
                  Temperature
                </TabsTrigger>
                <TabsTrigger value="flux" className="flex-1">
                  <Sun className="h-4 w-4 mr-2" />
                  Heat Flux
                </TabsTrigger>
                <TabsTrigger value="mitigations" className="flex-1">
                  <Shield className="h-4 w-4 mr-2" />
                  Mitigations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="temperature">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `${v}m`}
                        fontSize={10}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `${v}°C`}
                        fontSize={10}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        labelFormatter={(v) => `Time: ${v} min`}
                      />
                      <ReferenceLine 
                        y={chartData[0]?.maxLimit} 
                        stroke="hsl(var(--destructive))" 
                        strokeDasharray="5 5"
                        label={{ value: 'Max', fill: 'hsl(var(--destructive))', fontSize: 10 }}
                      />
                      <ReferenceLine 
                        y={chartData[0]?.minLimit} 
                        stroke="hsl(210, 100%, 60%)" 
                        strokeDasharray="5 5"
                        label={{ value: 'Min', fill: 'hsl(210, 100%, 60%)', fontSize: 10 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="hsl(25, 95%, 60%)"
                        fill="hsl(25, 95%, 60%)"
                        fillOpacity={0.3}
                        strokeWidth={2}
                        name="Temperature"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Eclipse indicator */}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Sun className="h-3 w-3 text-yellow-400" />
                    <span>Sunlit periods</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Moon className="h-3 w-3 text-blue-400" />
                    <span>Eclipse periods</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="flux">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `${v}m`}
                        fontSize={10}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tickFormatter={(v) => `${v} W/m²`}
                        fontSize={10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="solarFlux" 
                        stroke="hsl(45, 100%, 50%)"
                        strokeWidth={2}
                        dot={false}
                        name="Solar"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="earthIR" 
                        stroke="hsl(0, 70%, 50%)"
                        strokeWidth={2}
                        dot={false}
                        name="Earth IR"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="netFlux" 
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="Net"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="mitigations">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {prediction.mitigations.length > 0 ? (
                    prediction.mitigations.map((mitigation, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border ${
                          mitigation.priority === 'required' 
                            ? 'bg-red-500/10 border-red-500/30' 
                            : mitigation.priority === 'recommended'
                              ? 'bg-yellow-500/10 border-yellow-500/30'
                              : 'bg-muted/30 border-border'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            {mitigation.type === 'attitude_slew' && <RotateCcw className="h-4 w-4 mt-0.5 text-primary" />}
                            {mitigation.type === 'duty_cycle' && <Activity className="h-4 w-4 mt-0.5 text-primary" />}
                            {mitigation.type === 'orbit_timing' && <Clock className="h-4 w-4 mt-0.5 text-primary" />}
                            {mitigation.type === 'heater_activation' && <Zap className="h-4 w-4 mt-0.5 text-primary" />}
                            <div>
                              <p className="text-sm font-medium capitalize">
                                {mitigation.type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {mitigation.description}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={
                              mitigation.priority === 'required' ? 'destructive' :
                              mitigation.priority === 'recommended' ? 'default' : 'secondary'
                            } className="text-xs">
                              {mitigation.priority}
                            </Badge>
                            <p className={`text-xs mt-1 ${
                              mitigation.impact < 0 ? 'text-blue-400' : 'text-orange-400'
                            }`}>
                              {mitigation.impact > 0 ? '+' : ''}{mitigation.impact}°C
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 text-green-400" />
                      <p>No mitigations required</p>
                      <p className="text-xs">Thermal conditions are within safe limits</p>
                    </div>
                  )}
                </div>

                {/* Risk Windows */}
                {prediction.riskWindows.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400" />
                      Risk Windows Detected
                    </p>
                    <div className="space-y-2">
                      {prediction.riskWindows.slice(0, 3).map((window, index) => (
                        <div 
                          key={index}
                          className="text-xs p-2 rounded bg-yellow-500/10 border border-yellow-500/20"
                        >
                          <div className="flex justify-between">
                            <span className="capitalize">{window.type.replace(/_/g, ' ')}</span>
                            <Badge variant={window.severity === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                              {window.severity}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground mt-1">{window.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
