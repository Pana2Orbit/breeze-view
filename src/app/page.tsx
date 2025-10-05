import { MapView } from '@/components/map-view';
import { config } from '@/lib/config';
import { AlertTriangle } from 'lucide-react';

export default function Home() {
  if (!config.mapsApiKey) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center shadow-lg">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold text-card-foreground">
            Configuration Error
          </h1>
          <p className="max-w-md text-muted-foreground">
            Google Maps API Key is missing. Please set the{' '}
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-sm text-foreground">
              NEXT_PUBLIC_MAPS_API_KEY
            </code>{' '}
            in your <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-sm text-foreground">.env.local</code> file.
          </p>
        </div>
      </div>
    );
  }

  return <MapView apiKey={config.mapsApiKey} mapId={config.mapId} />;
}
