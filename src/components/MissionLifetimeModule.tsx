import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Fuel,
  Rocket,
  AlertTriangle,
  TrendingDown,
  Target,
  X,
  ChevronRight,
  Zap,
  Shield,
  BarChart3,
  History,
} from 'lucide-react';
import {
  SpacecraftPropulsion,
  ManeuverPlan,
  MissionLifetimeState,
  ManeuverImpact,
  DEFAULT_PROPULSION,
  calculateMissionLifetimeState,
  createCollisionAvoidanceManeuver,
  assessManeuverImpact,
  formatPropellant,
  formatDeltaV,
  formatLifetime,
  calculateBurnDuration,
  generateFuelHistory,
  FuelHistoryEntry,
} from '@/utils/propulsionPhysics';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  ReferenceDot,
  ResponsiveContainer,
} from 'recharts';

interface MissionLifetimeModuleProps {
  collisionRisks?: Array<{
    threatLevel: 'low' | 'medium' | 'high' | 'critical';
    missDistance: number;
    objectName: string;
  }>;
  onClose: () => void;
}

export function MissionLifetimeModule({ collisionRisks = [], onClose }: MissionLifetimeModuleProps) {
  const [propulsion, setPropulsion] = useState<SpacecraftPropulsion>(DEFAULT_PROPULSION);
  const [cumulativeDeltaV, setCumulativeDeltaV] = useState(45); // Already used Δv
  const [selectedManeuver, setSelectedManeuver] = useState<ManeuverPlan | null>(null);
  const [maneuverImpact, setManeuverImpact] = useState<ManeuverImpact | null>(null);
  const [exploredDeltaV, setExploredDeltaV] = useState(0);

  // Generate fuel history data
  const fuelHistory = useMemo(() => generateFuelHistory(), []);
  
  // Format chart data
  const chartData = useMemo(() => {
    return fuelHistory.map((entry) => ({
      date: entry.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      propellant: entry.propellantRemaining,
      deltaV: entry.cumulativeDeltaV,
      maneuverType: entry.maneuverType,
      maneuverName: entry.maneuverName,
      isManeuver: !!entry.maneuverName,
    }));
  }, [fuelHistory]);

  // Get maneuver annotations for the chart
  const maneuverAnnotations = useMemo(() => {
    return fuelHistory.filter(entry => entry.maneuverName).map(entry => ({
      date: entry.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      propellant: entry.propellantRemaining,
      name: entry.maneuverName!,
      type: entry.maneuverType!,
      deltaV: entry.deltaVUsed,
    }));
  }, [fuelHistory]);

  const chartConfig = {
    propellant: {
      label: "Propellant (kg)",
      color: "hsl(var(--primary))",
    },
  };

  // Calculate current mission state
  const missionState = useMemo(() => 
    calculateMissionLifetimeState(propulsion, cumulativeDeltaV),
    [propulsion, cumulativeDeltaV]
  );

  // Calculate explored state (what-if scenario)
  const exploredState = useMemo(() => {
    if (exploredDeltaV === 0) return null;
    const tempPropulsion = {
      ...propulsion,
      propellantMass: propulsion.propellantMass - (exploredDeltaV * propulsion.propellantMass / missionState.remainingDeltaV),
    };
    return calculateMissionLifetimeState(tempPropulsion, cumulativeDeltaV + exploredDeltaV);
  }, [propulsion, cumulativeDeltaV, exploredDeltaV, missionState.remainingDeltaV]);

  // Generate maneuver plans from collision risks
  const proposedManeuvers = useMemo(() => {
    const maneuvers: ManeuverPlan[] = [];
    
    // Add from collision risks
    collisionRisks.forEach((risk, index) => {
      maneuvers.push(createCollisionAvoidanceManeuver(
        propulsion,
        risk.threatLevel,
        risk.missDistance
      ));
    });

    // Add sample maneuvers if no risks provided
    if (maneuvers.length === 0) {
      maneuvers.push(
        createCollisionAvoidanceManeuver(propulsion, 'high', 0.8),
        createCollisionAvoidanceManeuver(propulsion, 'medium', 2.5),
        createCollisionAvoidanceManeuver(propulsion, 'low', 5.2),
      );
    }

    return maneuvers;
  }, [propulsion, collisionRisks]);

  // Assess selected maneuver impact
  useEffect(() => {
    if (selectedManeuver) {
      const impact = assessManeuverImpact(propulsion, selectedManeuver, cumulativeDeltaV);
      setManeuverImpact(impact);
    } else {
      setManeuverImpact(null);
    }
  }, [selectedManeuver, propulsion, cumulativeDeltaV]);

  const getStatusColor = (status: MissionLifetimeState['status']) => {
    switch (status) {
      case 'nominal': return 'text-green-400';
      case 'caution': return 'text-yellow-400';
      case 'warning': return 'text-orange-400';
      case 'critical': return 'text-red-400';
    }
  };

  const getStatusBg = (status: MissionLifetimeState['status']) => {
    switch (status) {
      case 'nominal': return 'bg-green-500/20';
      case 'caution': return 'bg-yellow-500/20';
      case 'warning': return 'bg-orange-500/20';
      case 'critical': return 'bg-red-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'execute': return 'bg-green-500/20 text-green-400';
      case 'optimize': return 'bg-yellow-500/20 text-yellow-400';
      case 'defer': return 'bg-orange-500/20 text-orange-400';
      case 'reject': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="absolute top-4 left-4 z-50 w-[420px] max-h-[calc(100vh-120px)] overflow-hidden">
      <Card className="bg-card/95 backdrop-blur-md border-primary/30 shadow-2xl">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Mission Lifetime & Fuel</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          {/* Lifetime Impact Bar - Main Visual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Mission Lifetime</span>
              <span className={`font-bold ${getStatusColor(missionState.status)}`}>
                {formatLifetime(missionState.estimatedLifetimeDays)}
              </span>
            </div>
            
            <div className="relative h-8 bg-muted/30 rounded-lg overflow-hidden">
              {/* Nominal lifetime background */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-yellow-500/20 to-red-500/20" />
              
              {/* Current lifetime bar */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${getStatusBg(missionState.status)}`}
                style={{ width: `${missionState.lifetimePercentage}%` }}
              >
                <div 
                  className={`h-full ${
                    missionState.status === 'nominal' ? 'bg-green-500/60' :
                    missionState.status === 'caution' ? 'bg-yellow-500/60' :
                    missionState.status === 'warning' ? 'bg-orange-500/60' : 'bg-red-500/60'
                  }`}
                />
              </div>
              
              {/* Explored impact overlay */}
              {exploredState && (
                <div
                  className="absolute inset-y-0 bg-red-500/40 border-l-2 border-red-400 transition-all duration-300"
                  style={{
                    left: `${exploredState.lifetimePercentage}%`,
                    width: `${missionState.lifetimePercentage - exploredState.lifetimePercentage}%`
                  }}
                />
              )}
              
              {/* Percentage markers */}
              <div className="absolute inset-0 flex items-center justify-between px-2 text-xs font-medium">
                <span className="text-foreground/70">0%</span>
                <span className={getStatusColor(missionState.status)}>
                  {missionState.lifetimePercentage.toFixed(1)}%
                </span>
                <span className="text-foreground/70">100%</span>
              </div>
            </div>
            
            {exploredState && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <TrendingDown className="h-3 w-3" />
                <span>
                  -{(missionState.lifetimePercentage - exploredState.lifetimePercentage).toFixed(1)}% 
                  ({formatLifetime(missionState.estimatedLifetimeDays - exploredState.estimatedLifetimeDays)} lost)
                </span>
              </div>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-muted-foreground">Propellant</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">
                  {formatPropellant(missionState.remainingPropellant)}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {formatPropellant(propulsion.initialPropellant)}
                </span>
              </div>
              <Progress 
                value={missionState.propellantPercentage} 
                className="h-1.5 mt-2"
              />
            </div>
            
            <div className="bg-muted/20 rounded-lg p-3 border border-border/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-xs text-muted-foreground">Δv Budget</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-foreground">
                  {formatDeltaV(missionState.remainingDeltaV)}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {formatDeltaV(missionState.totalDeltaVCapacity)}
                </span>
              </div>
              <Progress 
                value={(missionState.remainingDeltaV / missionState.totalDeltaVCapacity) * 100} 
                className="h-1.5 mt-2"
              />
            </div>
          </div>

          {/* Δv Explorer Slider */}
          <div className="space-y-2 bg-muted/10 rounded-lg p-3 border border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Explore Maneuver Impact</span>
              <Badge variant="outline" className="text-xs">
                {formatDeltaV(exploredDeltaV)}
              </Badge>
            </div>
            <Slider
              value={[exploredDeltaV]}
              onValueChange={([v]) => setExploredDeltaV(v)}
              max={Math.min(10, missionState.remainingDeltaV)}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 m/s</span>
              <span>Max {formatDeltaV(Math.min(10, missionState.remainingDeltaV))}</span>
            </div>
          </div>

          <Tabs defaultValue="history" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="history" className="text-xs">
                <History className="h-3 w-3 mr-1" />
                Fuel History
              </TabsTrigger>
              <TabsTrigger value="maneuvers" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                Maneuvers
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />
                Analysis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-3">
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground mb-2">
                  Propellant usage over mission timeline with maneuver annotations
                </div>
                <ChartContainer config={chartConfig} className="h-[180px] w-full">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="propellantGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9 }} 
                      tickLine={false}
                      axisLine={false}
                      interval={6}
                    />
                    <YAxis 
                      tick={{ fontSize: 9 }} 
                      tickLine={false}
                      axisLine={false}
                      domain={[100, 155]}
                      tickFormatter={(v) => `${v}kg`}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
                              <p className="text-xs font-medium">{data.date}</p>
                              <p className="text-xs text-cyan-400">
                                Propellant: {data.propellant.toFixed(2)} kg
                              </p>
                              <p className="text-xs text-yellow-400">
                                Cumulative Δv: {data.deltaV.toFixed(2)} m/s
                              </p>
                              {data.maneuverName && (
                                <div className="mt-1 pt-1 border-t border-border/50">
                                  <p className="text-xs text-orange-400 font-medium">
                                    📍 {data.maneuverName}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground capitalize">
                                    {data.maneuverType?.replace('_', ' ')}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="propellant"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#propellantGradient)"
                    />
                    {/* Maneuver annotations */}
                    {maneuverAnnotations.map((m, i) => (
                      <ReferenceDot
                        key={i}
                        x={m.date}
                        y={m.propellant}
                        r={4}
                        fill={
                          m.type === 'collision_avoidance' ? '#f97316' :
                          m.type === 'station_keeping' ? '#22c55e' :
                          m.type === 'orbit_raise' ? '#8b5cf6' :
                          '#eab308'
                        }
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
                
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-muted-foreground">Collision Avoidance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Station Keeping</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-muted-foreground">Orbit Raise</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-muted-foreground">Attitude Correction</span>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="maneuvers" className="mt-3">
              <ScrollArea className="h-48">
                <div className="space-y-2 pr-2">
                  {proposedManeuvers.map((maneuver) => (
                    <div
                      key={maneuver.id}
                      onClick={() => setSelectedManeuver(
                        selectedManeuver?.id === maneuver.id ? null : maneuver
                      )}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedManeuver?.id === maneuver.id
                          ? 'bg-primary/10 border-primary/50'
                          : 'bg-muted/20 border-border/30 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`text-xs ${getPriorityColor(maneuver.priority)}`}>
                          {maneuver.priority.toUpperCase()}
                        </Badge>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-yellow-400 font-mono">
                            Δv: {formatDeltaV(maneuver.deltaV)}
                          </span>
                          <ChevronRight className={`h-4 w-4 transition-transform ${
                            selectedManeuver?.id === maneuver.id ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {maneuver.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>⛽ {formatPropellant(maneuver.propellantRequired)}</span>
                        <span>🔥 {calculateBurnDuration(propulsion, maneuver.deltaV).toFixed(1)}s burn</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="analysis" className="mt-3">
              {maneuverImpact ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted/20 rounded-lg">
                    <span className="text-sm">Recommendation</span>
                    <Badge className={getRecommendationStyle(maneuverImpact.recommendation)}>
                      {maneuverImpact.recommendation.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-muted/10 p-2 rounded">
                      <span className="text-muted-foreground">Lifetime Impact</span>
                      <p className="text-red-400 font-bold">
                        -{formatLifetime(maneuverImpact.lifetimeReductionDays)}
                      </p>
                    </div>
                    <div className="bg-muted/10 p-2 rounded">
                      <span className="text-muted-foreground">Margin Reduction</span>
                      <p className="text-orange-400 font-bold">
                        -{maneuverImpact.marginReduction.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {maneuverImpact.alternativeStrategies.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Alternative Strategies
                      </span>
                      {maneuverImpact.alternativeStrategies.map((alt, i) => (
                        <div key={i} className="p-2 bg-muted/10 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{alt.name}</span>
                            <span className="text-green-400">
                              Save {formatLifetime(alt.lifetimeSaved)}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-[10px]">
                            {alt.tradeoff}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Select a maneuver to analyze impact</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Status Footer */}
          <div className={`flex items-center gap-2 p-2 rounded-lg ${getStatusBg(missionState.status)}`}>
            {missionState.status === 'critical' && <AlertTriangle className="h-4 w-4 text-red-400" />}
            <span className={`text-xs font-medium ${getStatusColor(missionState.status)}`}>
              Operational Margin: {missionState.operationalMargin.toFixed(1)}% — {missionState.status.toUpperCase()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
