import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { OrbitalViewer } from '@/components/OrbitalViewer';
import { ThermalRiskModule } from '@/components/ThermalRiskModule';
import { useSatelliteData } from '@/hooks/useSatelliteData';
import { useState } from 'react';
import { AlertTriangle, X, Thermometer } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { satellites, satRecs, loading, error, refresh } = useSatelliteData();
  const [criticalAlert, setCriticalAlert] = useState<string | null>(null);
  const [showThermalModule, setShowThermalModule] = useState(false);
  const [selectedSatelliteForThermal, setSelectedSatelliteForThermal] = useState<{
    position: [number, number, number];
    velocity: [number, number, number];
    altitude: number;
    inclination: number;
    name: string;
  } | null>(null);
  
  // Select first satellite for thermal analysis by default
  const thermalSatellite = selectedSatelliteForThermal || (satellites[0] ? {
    position: satellites[0].position,
    velocity: satellites[0].velocity,
    altitude: satellites[0].altitude,
    inclination: satellites[0].inclination,
    name: satellites[0].name,
  } : undefined);

  return (
    <div className="min-h-screen bg-background">
      <Header onRefresh={refresh} isRefreshing={loading} />
      
      {/* Critical Alert Banner */}
      {criticalAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
          <div className="bg-destructive/20 border-2 border-destructive rounded-lg p-4 backdrop-blur-sm animate-pulse">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <AlertTriangle className="text-destructive flex-shrink-0 mt-0.5" size={24} />
                <div>
                  <p className="font-bold text-destructive mb-1">COLLISION WARNING</p>
                  <p className="text-sm text-foreground">{criticalAlert}</p>
                </div>
              </div>
              <button 
                onClick={() => setCriticalAlert(null)}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Full Screen Orbital Viewer */}
      <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-card/30 backdrop-blur-sm cosmic-grid">
        <OrbitalViewer satellites={satellites} satRecs={satRecs} loading={loading} error={error} />
        
        {/* Dashboard Sidebar Overlay */}
        <div className="absolute top-4 right-4 w-72 z-40">
          <Dashboard 
            totalObjects={satellites.length} 
            satellitePositions={satellites}
            onCriticalAlert={setCriticalAlert}
          />
        </div>

        {/* Thermal Risk Module */}
        {showThermalModule && (
          <ThermalRiskModule 
            satelliteData={thermalSatellite}
            onClose={() => setShowThermalModule(false)}
          />
        )}

        {/* Status Bar */}
        <div className="absolute top-4 left-4 flex items-center gap-4 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm border border-primary/20 rounded-lg px-3 py-2 glow-border z-40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Live Data</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span>SGP4 Propagation</span>
          </div>
          <span className="text-primary">Updates: 5s</span>
        </div>

        {/* Thermal Analysis Toggle Button */}
        <div className="absolute top-20 left-4 z-40">
          <Button
            onClick={() => setShowThermalModule(!showThermalModule)}
            variant={showThermalModule ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Thermometer className="h-4 w-4" />
            <span>Thermal Analysis</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
