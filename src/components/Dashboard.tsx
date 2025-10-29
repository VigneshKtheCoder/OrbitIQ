import { Activity, Satellite, AlertTriangle, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function Dashboard() {
  const stats = [
    {
      title: 'Active Objects',
      value: '36,847',
      change: '+2.3%',
      icon: Satellite,
      color: 'text-primary',
    },
    {
      title: 'Collision Alerts',
      value: '143',
      change: '-12%',
      icon: AlertTriangle,
      color: 'text-destructive',
    },
    {
      title: 'Predicted Events',
      value: '2,891',
      change: '+8.1%',
      icon: Activity,
      color: 'text-accent',
    },
    {
      title: 'Risk Score',
      value: '67/100',
      change: 'Moderate',
      icon: Shield,
      color: 'text-warning-orange',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className="p-6 bg-card/80 backdrop-blur-sm border-primary/20 glow-border hover:border-primary/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className={`text-3xl font-bold ${stat.color} glow-text`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{stat.change}</p>
              </div>
              <div className={`${stat.color} opacity-20`}>
                <Icon size={40} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
