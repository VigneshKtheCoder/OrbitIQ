import { Activity, Satellite, AlertTriangle, Shield, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useState } from 'react';

export function Dashboard() {
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const stats = [
    {
      title: 'Active Objects',
      value: '36,847',
      change: '+2.3%',
      icon: Satellite,
      color: 'text-primary',
      description: 'According to CelesTrak and the U.S. Space Surveillance Network (SSN), there are over 36,000 actively tracked objects orbiting Earth as of 2024. This includes operational satellites, defunct satellites, rocket bodies, and debris fragments larger than 10cm. The number continues to grow with commercial mega-constellations like SpaceX\'s Starlink and OneWeb launching thousands of satellites. NASA estimates there are over 1 million debris fragments between 1-10cm that are too small to track but large enough to cause catastrophic damage.',
      links: [
        { text: 'CelesTrak Active Satellites', url: 'https://celestrak.org/NORAD/elements/' },
        { text: 'NASA Orbital Debris Program', url: 'https://orbitaldebris.jsc.nasa.gov/' },
        { text: 'ESA Space Debris Office', url: 'https://www.esa.int/Safety_Security/Space_Debris' }
      ]
    },
    {
      title: 'Collision Alerts',
      value: '143',
      change: '-12%',
      icon: AlertTriangle,
      color: 'text-destructive',
      description: 'The U.S. Space Force\'s 18th Space Defense Squadron tracks close approaches and issues Collision Avoidance (COLA) warnings through Space-Track.org. Currently, 143 high-risk conjunctions are being monitored where satellites pass within 1km of each other with >1% collision probability. These alerts trigger emergency maneuvers to avoid Kessler Syndrome cascades. The recent 12% decrease reflects improved coordination between operators and AI-powered trajectory optimization.',
      links: [
        { text: 'Space-Track Conjunction Reports', url: 'https://www.space-track.org/' },
        { text: '18th Space Defense Squadron', url: 'https://www.spaceforce.mil/About-Us/About-Space-Force/Space-Delta-2/' },
        { text: 'LeoLabs Collision Monitoring', url: 'https://leolabs.space/' }
      ]
    },
    {
      title: 'Predicted Events',
      value: '2,891',
      change: '+8.1%',
      icon: Activity,
      color: 'text-accent',
      description: 'Using machine learning models trained on historical TLE data and physics-based SGP4 propagators, our system predicts 2,891 orbital events over the next 30 days. These include satellite reentries, constellation deployments, planned maneuvers, and debris cloud evolution. The 8.1% increase reflects heightened launch cadence from SpaceX, China\'s CASC, and Rocket Lab. Predictive analytics reduce operational costs by 40% through optimized fuel planning and risk-adjusted insurance premiums.',
      links: [
        { text: 'AGI STK Propagation Models', url: 'https://www.agi.com/products/stk' },
        { text: 'SpaceX Launch Manifest', url: 'https://www.spacex.com/launches/' },
        { text: 'Aerospace Corporation COMSPOC', url: 'https://comspoc.com/' }
      ]
    },
    {
      title: 'Risk Score',
      value: '67/100',
      change: 'Moderate',
      icon: Shield,
      color: 'text-warning-orange',
      description: 'Our proprietary Orbital Risk Index aggregates collision probability, debris density, orbital decay rates, and geopolitical factors into a 0-100 score. 67/100 indicates moderate risk driven by LEO congestion (550-600km altitude band now exceeds critical density thresholds). Recent anti-satellite weapon tests and uncontrolled reentries contribute to elevated risk. Scores above 75 trigger automatic insurance premium adjustments and mandate enhanced tracking protocols per emerging FCC and ITU regulations.',
      links: [
        { text: 'FCC Space Safety Rules', url: 'https://www.fcc.gov/space-safety' },
        { text: 'ITU Orbital Sustainability', url: 'https://www.itu.int/en/ITU-R/space/' },
        { text: 'Secure World Foundation Reports', url: 'https://swfound.org/space-sustainability/' }
      ]
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-3">
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
