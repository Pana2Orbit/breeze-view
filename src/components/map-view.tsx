"use client";

import {
  APIProvider,
  Map,
  useMap,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";
import React, { useState, useEffect, useCallback } from "react";
import type { GeoJSONFeatureCollection } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LoaderCircle,
  MapPin,
} from "lucide-react";

// --- CONFIGURATION ---
const INITIAL_CENTER = { lat: 36.7783, lng: -119.4179 }; // California
const INITIAL_ZOOM = 7;

// --- MAIN COMPONENT ---

export function MapView({ apiKey, mapId }: { apiKey: string; mapId?: string }) {
  const [point, setPoint] = useState<google.maps.LatLngLiteral | null>(null);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setPoint(e.latLng.toJSON());
    }
  };

  const getPlaceName = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    if (!window.google || !window.google.maps) {
        console.error("Google Maps API not loaded.");
        return "Ubicación desconocida";
    }
    const geocoder = new google.maps.Geocoder();
    try {
        const response = await geocoder.geocode({ location: latLng });
        if (response.results[0]) {
            return response.results[0].formatted_address;
        } else {
            return "No se encontraron resultados";
        }
    } catch (error) {
        console.error("Geocoder failed due to: " + error);
        return "Error en geocodificación";
    }
  }, []);

  useEffect(() => {
    if (point) {
      setIsLoading(true);
      getPlaceName(point).then(name => {
        setPlaceName(name);
        setIsLoading(false);
      });
    }
  }, [point, getPlaceName]);

  return (
    <APIProvider apiKey={apiKey} libraries={["geocoding", "marker"]}>
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
            {point && <AdvancedMarker position={point} />}
          </Map>
          
          <Card className="absolute left-1/2 top-4 -translate-x-1/2 transform shadow-2xl md:left-4 md:top-4 md:translate-x-0 w-[calc(100%-2rem)] md:w-96">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-headline">Ubicación Seleccionada</CardTitle>
                {isLoading && (
                  <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
              <CardDescription>
                Haz clic en el mapa para seleccionar una ubicación.
              </CardDescription>
            </CardHeader>
            <CardContent>
                {point ? (
                    <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                           <MapPin className="h-4 w-4 text-muted-foreground" />
                           <span className="font-semibold text-foreground">{placeName || 'Cargando...'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pl-6">
                            <div>
                                <p className="text-muted-foreground">Latitud</p>
                                <p className="font-mono text-foreground">{point.lat.toFixed(6)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Longitud</p>
                                <p className="font-mono text-foreground">{point.lng.toFixed(6)}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No se ha seleccionado ninguna ubicación.</p>
                )}
            </CardContent>
          </Card>
        </div>
    </APIProvider>
  );
}
