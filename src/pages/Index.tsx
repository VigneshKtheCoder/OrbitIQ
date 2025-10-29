import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';
import { OrbitalViewer } from '@/components/OrbitalViewer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <Dashboard />
        
        <div className="relative h-[calc(100vh-300px)] min-h-[600px] rounded-xl overflow-hidden border border-primary/20 bg-card/30 backdrop-blur-sm glow-border cosmic-grid">
          <OrbitalViewer />
        </div>

        {/* Status Bar */}
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>Live Data: CelesTrak</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span>Update: Real-time</span>
            </div>
          </div>
          <div>
            <span className="text-primary">Earth Orbit Visualization</span> • Scale: 1 unit = 6,371 km
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
