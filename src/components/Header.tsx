import { Rocket, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="border-b border-primary/20 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg glow-border">
              <Rocket className="text-primary" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold glow-text">
                AODE × OTIP
              </h1>
              <p className="text-xs text-muted-foreground">
                Autonomous Orbital Intelligence Platform
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="hidden md:flex border-primary/30">
              <Activity className="mr-2" size={16} />
              Live Feed
            </Button>
            <Button variant="outline" size="sm" className="hidden md:flex border-primary/30">
              <AlertTriangle className="mr-2" size={16} />
              Alerts
            </Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-border">
              Dashboard
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

import { Activity, AlertTriangle } from 'lucide-react';
