import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { OrbitalViewer } from '@/components/OrbitalViewer';
import { useSatelliteData } from '@/hooks/useSatelliteData';

const Index = () => {
  const { satellites, satRecs, loading, error, refresh } = useSatelliteData();
  
  return (
    <div className="min-h-screen bg-background">
      <Header onRefresh={refresh} isRefreshing={loading} />
      
      {/* Full Screen Orbital Viewer */}
      <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-card/30 backdrop-blur-sm cosmic-grid">
        <OrbitalViewer satellites={satellites} satRecs={satRecs} loading={loading} error={error} />
        
        {/* Dashboard Sidebar Overlay */}
        <div className="absolute top-4 right-4 w-72 z-40">
          <Dashboard totalObjects={satellites.length} satellitePositions={satellites} />
        </div>

        {/* Status Bar */}
        <div className="absolute top-4 left-4 flex items-center gap-4 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm border border-primary/20 rounded-lg px-3 py-2 glow-border z-40">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Live: CelesTrak</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span>Real-time SGP4</span>
          </div>
          <span className="text-primary">Scale: 1 unit = 6,371 km</span>
        </div>
      </div>
    </div>
  );
};

export default Index;
