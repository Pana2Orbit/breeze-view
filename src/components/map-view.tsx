"use client";

import {
  APIProvider,
  Map,
  useMap,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { add, formatISO } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import type { GeoJSONFeatureCollection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LoaderCircle,
  Layers,
  Crosshair,
  Move,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// --- CONFIGURATION ---
const INITIAL_CENTER = { lat: 36.7783, lng: -119.4179 }; // California
const INITIAL_ZOOM = 7;
const MIN_RADIUS_KM = 1;
const MAX_RADIUS_KM = 50;
const INITIAL_RADIUS_KM = 10;
const DEBOUNCE_DELAY_MS = 300;
const HEATMAP_RADIUS = 30;
const HEATMAP_MAX_INTENSITY = 150; // Adjust based on your data range

type Mode = "viewport" | "point";

// --- CUSTOM CIRCLE COMPONENT ---
const Circle = (props: google.maps.CircleOptions) => {
  const map = useMap();
  const [circle, setCircle] = useState<google.maps.Circle | null>(null);

  useEffect(() => {
    if (map && !circle) {
      setCircle(new google.maps.Circle());
    }

    return () => {
      if (circle) {
        circle.setMap(null);
      }
    };
  }, [map, circle]);

  useEffect(() => {
    if (circle) {
      circle.setOptions({...props, map});
    }
  }, [circle, props, map]);

  return null;
};


// --- SUB-COMPONENTS & EFFECTS ---

function HeatmapEffect({
  data,
}: {
  data: GeoJSONFeatureCollection | null;
}) {
  const map = useMap();
  const [heatmap, setHeatmap] =
    useState<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!heatmap) {
      const newHeatmap = new google.maps.visualization.HeatmapLayer({
        map,
        radius: HEATMAP_RADIUS,
        maxIntensity: HEATMAP_MAX_INTENSITY,
      });
      setHeatmap(newHeatmap);
    }

    if (data && data.features.length > 0) {
      const heatmapData = data.features.map(
        (feature) =>
          new google.maps.LatLng(
            feature.geometry.coordinates[1],
            feature.geometry.coordinates[0]
          )
      );
      heatmap?.setData(heatmapData);
      heatmap?.set("weight", data.features.map(f => f.properties.pm25_pred));
    } else {
      heatmap?.setData([]);
    }

    // No cleanup needed for data changes, only on unmount
  }, [map, data, heatmap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      heatmap?.setMap(null);
    };
  }, [heatmap]);

  return null;
}

function AirQualityEffect({
  show,
  apiKey,
}: {
  show: boolean;
  apiKey: string;
}) {
  const map = useMap();
  const [airQualityLayer, setAirQualityLayer] =
    useState<google.maps.ImageMapType | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!airQualityLayer) {
      const newLayer = new google.maps.ImageMapType({
        getTileUrl: (coord, zoom) =>
          `https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/${zoom}/${coord.x}/${coord.y}?key=${apiKey}`,
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 16,
        minZoom: 0,
        name: "AirQuality",
      });
      setAirQualityLayer(newLayer);
    }
  }, [map, apiKey, airQualityLayer]);

  useEffect(() => {
    if (!map || !airQualityLayer) return;

    if (show) {
      if (!map.overlayMapTypes.getArray().includes(airQualityLayer)) {
        map.overlayMapTypes.push(airQualityLayer);
      }
    } else {
      const index = map.overlayMapTypes.getArray().indexOf(airQualityLayer);
      if (index > -1) {
        map.overlayMapTypes.removeAt(index);
      }
    }
    
    return () => {
      if (airQualityLayer) {
        const index = map.overlayMapTypes.getArray().indexOf(airQualityLayer);
        if (index > -1) {
          try { map.overlayMapTypes.removeAt(index); } catch (e) {}
        }
      }
    };
  }, [map, show, airQualityLayer]);

  return null;
}

// --- MAIN COMPONENT ---

export function MapView({ apiKey, mapId }: { apiKey: string; mapId?: string }) {
  const [mode, setMode] = useState<Mode>("viewport");
  const [hourOffset, setHourOffset] = useState(0);
  const [radiusKm, setRadiusKm] = useState(INITIAL_RADIUS_KM);
  const [point, setPoint] = useState<google.maps.LatLngLiteral | null>(null);
  const [bounds, setBounds] = useState<string | null>(null);
  const [predictions, setPredictions] =
    useState<GeoJSONFeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAirQuality, setShowAirQuality] = useState(false);
  const { toast } = useToast();

  const debouncedBounds = useDebounce(bounds, DEBOUNCE_DELAY_MS);
  const debouncedPoint = useDebounce(point, DEBOUNCE_DELAY_MS);
  const debouncedRadius = useDebounce(radiusKm, DEBOUNCE_DELAY_MS);
  const debouncedHourOffset = useDebounce(hourOffset, DEBOUNCE_DELAY_MS);

  const selectedTimestamp = useMemo(() => {
    const now = new Date();
    const targetTime = add(now, { hours: debouncedHourOffset });
    return formatISO(targetTime);
  }, [debouncedHourOffset]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (mode === "point" && e.latLng) {
      setPoint(e.latLng.toJSON());
      // Here you could trigger fetching optional timeseries data for the point
      // fetch(`/api/predictions/pointTimeseries?lat=${e.latLng.lat()}&lon=${e.latLng.lng()}`)
    }
  };

  const handleBoundsChanged = (map: google.maps.Map) => {
    if (mode === 'viewport') {
        const newBounds = map.getBounds();
        if (newBounds) {
          setBounds(newBounds.toUrlValue());
        }
    }
  };

  const toggleMode = (newMode: Mode) => {
    setPredictions(null); // Clear previous data
    setMode(newMode);
    if(newMode === 'point' && !point) {
        // if switching to point mode and no point is set, use map center
        // This is handled by the map instance check in the map's onIdle event
    }
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    let url = `/api/predictions?ts=${selectedTimestamp}`;

    if (mode === "viewport" && debouncedBounds) {
      url += `&bbox=${debouncedBounds}`;
    } else if (mode === "point" && debouncedPoint) {
      url += `&lat=${debouncedPoint.lat}&lon=${debouncedPoint.lng}&radius_km=${debouncedRadius}`;
    } else {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch prediction data");
      }
      const data: GeoJSONFeatureCollection = await response.json();
      setPredictions(data);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedTimestamp, mode, debouncedBounds, debouncedPoint, debouncedRadius, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const map = useMap();
  useEffect(() => {
      if (!map) return;
      const idleListener = map.addListener('idle', () => {
        handleBoundsChanged(map);
        if (mode === 'point' && !point) {
          setPoint(map.getCenter()!.toJSON());
        }
      });
      return () => google.maps.event.removeListener(idleListener);
  }, [map, mode, point]);

  return (
    <APIProvider apiKey={apiKey} libraries={["visualization", "core", "marker"]}>
      <TooltipProvider>
        <div className="relative h-screen w-screen font-body">
          <Map
            defaultCenter={INITIAL_CENTER}
            defaultZoom={INITIAL_ZOOM}
            mapId={mapId || "DEFAULT_MAP_ID"}
            gestureHandling="greedy"
            disableDefaultUI={true}
            onClick={handleMapClick}
            className="h-full w-full"
            styles={[{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }, { "featureType": "transit", "stylers": [{ "visibility": "off" }] }]}
          >
            {mode === "point" && point && (
              <>
                <AdvancedMarker position={point} />
                <Circle
                  center={point}
                  radius={radiusKm * 1000}
                  strokeColor="hsl(var(--accent))"
                  strokeOpacity={0.8}
                  strokeWeight={2}
                  fillColor="hsl(var(--accent))"
                  fillOpacity={0.2}
                />
              </>
            )}
             <HeatmapEffect data={predictions} />
             <AirQualityEffect show={showAirQuality} apiKey={apiKey} />
          </Map>
          
          <Card className="absolute left-1/2 top-4 -translate-x-1/2 transform shadow-2xl md:left-4 md:top-4 md:translate-x-0 w-[calc(100%-2rem)] md:w-96">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-headline">PM2.5 Heatmapper</CardTitle>
                {isLoading && (
                  <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
              <CardDescription>
                Visualize PM2.5 predictions. Select a mode and time.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="mode-toggle">Mode</Label>
                <div className="flex rounded-md border p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={mode === "viewport" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => toggleMode("viewport")}
                        aria-pressed={mode === 'viewport'}
                      >
                        <Move className="h-4 w-4" />
                        <span className="sr-only">Viewport Mode</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Viewport Mode</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={mode === "point" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => toggleMode("point")}
                        aria-pressed={mode === 'point'}
                      >
                        <Crosshair className="h-4 w-4" />
                        <span className="sr-only">Point Mode</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Point Mode</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="time-slider">
                  Hour Offset: +{hourOffset}h
                </Label>
                <Slider
                  id="time-slider"
                  min={0}
                  max={24}
                  step={1}
                  value={[hourOffset]}
                  onValueChange={(value) => setHourOffset(value[0])}
                />
              </div>

              {mode === "point" && (
                <div className="grid gap-2">
                  <Label htmlFor="radius-slider">
                    Radius: {radiusKm} km
                  </Label>
                  <Slider
                    id="radius-slider"
                    min={MIN_RADIUS_KM}
                    max={MAX_RADIUS_KM}
                    step={1}
                    value={[radiusKm]}
                    onValueChange={(value) => setRadiusKm(value[0])}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="air-quality-switch" className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  <span>Google AQI Layer</span>
                  <Tooltip>
                    <TooltipTrigger>
                       <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shows Google's official Air Quality Index data.</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Switch
                  id="air-quality-switch"
                  checked={showAirQuality}
                  onCheckedChange={setShowAirQuality}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </APIProvider>
  );
}
