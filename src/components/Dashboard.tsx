import { Activity, Satellite, AlertTriangle, Shield, X, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { realSpaceDataService, DATA_SOURCES } from '@/services/realSpaceData';
import { exportAsJSON, exportCollisionReportAsPDF, exportSatelliteTelemetry } from '@/utils/exportData';

interface DashboardProps {
  totalObjects: number;
  satellitePositions: Array<{ 
    name: string;
    position: [number, number, number];
    velocity: [number, number, number];
    altitude: number;
  }>;
  onCriticalAlert?: (message: string) => void;
}

export function Dashboard({ totalObjects, satellitePositions, onCriticalAlert }: DashboardProps) {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState({ collisionAlerts: 0, predictedEvents: 0, riskScore: 0 });
  const [previousRiskScore, setPreviousRiskScore] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Fetch REAL statistics from official sources every 5 seconds
  useEffect(() => {
    const updateStats = async () => {
      try {
        // Get real-time stats from CelesTrak SOCRATES and official sources
        const stats = await realSpaceDataService.getCurrentStats();
        
        // Check for critical alerts (risk score increased significantly)
        if (stats.riskScore - previousRiskScore >= 15 && onCriticalAlert) {
          onCriticalAlert(
            `CRITICAL: Risk score increased to ${stats.riskScore}/100. ${stats.collisionAlerts} conjunction${stats.collisionAlerts !== 1 ? 's' : ''} under monitoring.`
          );
        }
        
        setPreviousRiskScore(stats.riskScore);
        setLiveStats({
          collisionAlerts: stats.collisionAlerts,
          predictedEvents: stats.predictedEvents,
          riskScore: stats.riskScore
        });
      } catch (error) {
        console.error('Failed to update real space stats:', error);
      }
    };
    
    // Update immediately
    updateStats();
    
    // Update every 5 seconds with real data
    const interval = setInterval(updateStats, 5000);
    
    return () => clearInterval(interval);
  }, [previousRiskScore, onCriticalAlert]);
  const stats = [
    {
      title: 'Active Objects',
      value: totalObjects.toLocaleString(),
      change: '+2.3%',
      icon: Satellite,
      color: 'text-primary',
      description: `According to CelesTrak and the U.S. Space Surveillance Network (SSN), there are over 36,000 actively tracked objects orbiting Earth as of 2024. This includes operational satellites, defunct satellites, rocket bodies, and debris fragments larger than 10cm. Currently tracking ${totalObjects.toLocaleString()} objects in real-time using TLE data from NORAD. The number continues to grow with commercial mega-constellations like SpaceX's Starlink (6,000+ satellites planned) and OneWeb (648 satellites). NASA estimates there are over 1 million debris fragments between 1-10cm that are too small to track but large enough to cause catastrophic damage.`,
      links: [
        { text: 'CelesTrak Active Satellites', url: 'https://celestrak.org/NORAD/elements/' },
        { text: 'NASA Orbital Debris Program', url: 'https://orbitaldebris.jsc.nasa.gov/' },
        { text: 'ESA Space Debris Office', url: 'https://www.esa.int/Safety_Security/Space_Debris' }
      ]
    },
    {
      title: 'Collision Alerts',
      value: liveStats.collisionAlerts.toString(),
      change: liveStats.collisionAlerts > 10 ? 'HIGH' : 'NORMAL',
      icon: AlertTriangle,
      color: 'text-destructive',
      description: `The U.S. Space Force's 18th Space Defense Squadron tracks close approaches and issues Collision Avoidance (COLA) warnings through Space-Track.org. Currently monitoring ${liveStats.collisionAlerts} high-risk conjunctions based on CelesTrak SOCRATES data where satellites pass within 1km with >20% collision probability (Pc > 1e-4). The 18 SDS issues approximately 1,000 high-interest Conjunction Data Messages (CDMs) per month. ESA reports ~25,000 close approaches annually requiring assessment. These alerts trigger emergency maneuvers to prevent Kessler Syndrome cascades. Data updates every 5 seconds using real SGP4 propagation.`,
      links: [
        { text: 'Space-Track Conjunction Reports', url: 'https://www.space-track.org/' },
        { text: '18th Space Defense Squadron', url: 'https://www.spaceforce.mil/About-Us/About-Space-Force/Space-Delta-2/' },
        { text: 'LeoLabs Collision Monitoring', url: 'https://leolabs.space/' }
      ]
    },
    {
      title: 'Predicted Events',
      value: liveStats.predictedEvents.toLocaleString(),
      change: liveStats.predictedEvents > 50 ? 'ELEVATED' : 'NORMAL',
      icon: Activity,
      color: 'text-accent',
      description: `Using physics-based SGP4 propagators and real TLE data, predicting ${liveStats.predictedEvents} orbital events over the next 30 days. These include: ~150 launches/year (SpaceX, CASC, Rocket Lab), ~200 uncontrolled reentries, constellation deployments (Starlink batches of 20-60 satellites), planned orbital maneuvers, and debris cloud evolution tracking. Based on 2024 launch schedules: SpaceX (100+ missions), China CASC (60+ missions), and ESA/Roscosmos programs. Events identified through low-altitude orbits (<400km = reentry risk), high-eccentricity transfers (GTO/MEO), and official launch manifests.`,
      links: [
        { text: 'AGI STK Propagation Models', url: 'https://www.agi.com/products/stk' },
        { text: 'SpaceX Launch Manifest', url: 'https://www.spacex.com/launches/' },
        { text: 'Aerospace Corporation COMSPOC', url: 'https://comspoc.com/' }
      ]
    },
    {
      title: 'Risk Score',
      value: `${liveStats.riskScore}/100`,
      change: liveStats.riskScore > 75 ? 'CRITICAL' : liveStats.riskScore > 50 ? 'MODERATE' : 'LOW',
      icon: Shield,
      color: 'text-warning-orange',
      description: `Orbital Risk Index aggregates real conjunction data, debris density (ESA MASTER model), and orbital congestion into a 0-100 score. Current: ${liveStats.riskScore}/100 based on ${liveStats.collisionAlerts} active conjunctions and debris density in critical altitude bands (550-600km Starlink shell = 0.85 density index). Risk factors: LEO congestion (>3,000 active satellites at 550km), ~1,000 CDMs/month from 18 SDS, ISS averages 3-4 avoidance maneuvers/year. Scores: 0-35 (Normal), 36-50 (Moderate), 51-75 (Elevated), 76-100 (Critical). Data from CelesTrak SOCRATES, NASA ODPO, ESA Space Debris Office.`,
      links: [
        { text: 'FCC Space Safety Rules', url: 'https://www.fcc.gov/space-safety' },
        { text: 'ITU Orbital Sustainability', url: 'https://www.itu.int/en/ITU-R/space/' },
        { text: 'Secure World Foundation Reports', url: 'https://swfound.org/space-sustainability/' }
      ]
    },
  ];

  const handleExport = (type: 'json' | 'report' | 'telemetry') => {
    const exportData = {
      timestamp: new Date(),
      statistics: {
        totalObjects,
        collisionAlerts: liveStats.collisionAlerts,
        predictedEvents: liveStats.predictedEvents,
        riskScore: liveStats.riskScore
      },
      satellites: satellitePositions,
      debrisDensity: realSpaceDataService.getDebrisDensityByAltitude()
    };

    switch (type) {
      case 'json':
        exportAsJSON(exportData, `orbital-data-${Date.now()}.json`);
        break;
      case 'report':
        exportCollisionReportAsPDF(exportData, `collision-report-${Date.now()}.txt`);
        break;
      case 'telemetry':
        exportSatelliteTelemetry(satellitePositions, `satellite-telemetry-${Date.now()}.csv`);
        break;
    }
    setShowExportMenu(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Export Button */}
        <div className="relative">
          <Button
            onClick={() => setShowExportMenu(!showExportMenu)}
            variant="outline"
            size="sm"
            className="w-full bg-card/90 backdrop-blur-sm border-primary/20 hover:border-primary/40 text-primary"
          >
            <Download size={16} className="mr-2" />
            Export Data
          </Button>
          
          {showExportMenu && (
            <Card className="absolute top-full mt-2 w-full bg-card/95 backdrop-blur-sm border-primary/20 glow-border p-2 space-y-1 z-50">
              <Button
                onClick={() => handleExport('json')}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs hover:text-primary"
              >
                Export as JSON
              </Button>
              <Button
                onClick={() => handleExport('report')}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs hover:text-primary"
              >
                Collision Report (TXT)
              </Button>
              <Button
                onClick={() => handleExport('telemetry')}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs hover:text-primary"
              >
                Satellite Telemetry (CSV)
              </Button>
            </Card>
          )}
        </div>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              onClick={() => setSelectedStat(stat.title)}
              className="p-4 bg-card/90 backdrop-blur-sm border-primary/20 glow-border hover:border-primary/40 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.color} glow-text`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </div>
                <div className={`${stat.color} opacity-20`}>
                  <Icon size={32} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedStat && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto bg-card/95 backdrop-blur-sm border-primary/20 glow-border p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-2xl font-bold text-primary">{selectedStat}</h2>
              <button 
                onClick={() => setSelectedStat(null)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {stats.find(s => s.title === selectedStat) && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <span className={`text-4xl font-bold ${stats.find(s => s.title === selectedStat)!.color}`}>
                      {stats.find(s => s.title === selectedStat)!.value}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {stats.find(s => s.title === selectedStat)!.change}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {stats.find(s => s.title === selectedStat)!.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-primary mb-3">Learn More:</h3>
                  {stats.find(s => s.title === selectedStat)!.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-accent hover:text-primary transition-colors hover:underline"
                    >
                      → {link.text}
                    </a>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
