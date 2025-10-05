"use client";

import {
  APIProvider,
  Map,
  useMap,
  AdvancedMarker,
  useMapsLibrary
} from "@vis.gl/react-google-maps";
import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  AlertTriangle,
} from "lucide-react";

// --- CONFIGURATION ---
const INITIAL_CENTER = { lat: 36.7783, lng: -119.4179 }; // California
const INITIAL_ZOOM = 7;

// Polygon coordinates for California
const CALIFORNIA_POLYGON_COORDS = [
  { lat: 41.9727325, lng: -120.0091050 },
  { lat: 41.8898826, lng: -124.6045661 },
  { lat: 33.9044735, lng: -120.4462801 },
  { lat: 32.6184122, lng: -117.1073262 },
  { lat: 32.6554188, lng: -114.2955756 },
  { lat: 34.3047333, lng: -114.1637748 },
  { lat: 35.0995465, lng: -114.7349117 },
  { lat: 39.0254518, lng: -120.0948112 },
  { lat: 41.9727325, lng: -120.0091050 },
];


// --- CHILD COMPONENT for Map Logic ---

function MapContainer() {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const geometryLib = useMapsLibrary('geometry');

  const [point, setPoint] = useState<google.maps.LatLngLiteral | null>(INITIAL_CENTER);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidLocation, setIsValidLocation] = useState(true);

  const californiaPolygon = useMemo(() => {
    if (!geometryLib) return null;
    return new google.maps.Polygon({ paths: CALIFORNIA_POLYGON_COORDS });
  }, [geometryLib]);

  const checkLocationValidity = useCallback((latLng: google.maps.LatLngLiteral) => {
    if (!geometryLib || !californiaPolygon) return false;
    const markerLatLng = new google.maps.LatLng(latLng.lat, latLng.lng);
    return geometryLib.poly.containsLocation(markerLatLng, californiaPolygon);
  }, [geometryLib, californiaPolygon]);
  
  const getPlaceName = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    if (!geocodingLib) {
        console.error("Geocoding library not available.");
        return "Service not available";
    }
    const geocoder = new geocodingLib.Geocoder();
    try {
        const response = await geocoder.geocode({ location: latLng });
        if (response.results[0]) {
            return response.results[0].formatted_address;
        } else {
            return "Location name not found";
        }
    } catch (error) {
        console.error("Geocoder failed due to: " + error);
        return "Geocoding error";
    }
  }, [geocodingLib]);

  const updateLocationInfo = useCallback((latLng: google.maps.LatLngLiteral) => {
    const isActuallyValid = checkLocationValidity(latLng);
    setIsValidLocation(isActuallyValid);

    if (isActuallyValid) {
      setIsLoading(true);
      getPlaceName(latLng).then(name => {
        setPlaceName(name);
        setIsLoading(false);
      });
    } else {
      setPlaceName(null);
    }
  }, [checkLocationValidity, getPlaceName]);

  useEffect(() => {
    if (point) {
      updateLocationInfo(point);
    }
  }, [point, updateLocationInfo]);

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = e.latLng.toJSON();
      setPoint(newPos);
      updateLocationInfo(newPos);
    }
  };

  return (
    <>
      {point && <AdvancedMarker position={point} draggable={true} onDragEnd={handleMarkerDragEnd} />}
      <Card className="absolute left-1/2 top-4 -translate-x-1/2 transform shadow-2xl md:left-4 md:top-4 md:translate-x-0 w-[calc(100%-2rem)] md:w-96">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-headline">Selected Location</CardTitle>
            {isLoading && (
              <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
          <CardDescription>
            Drag the marker to select a location.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {point && isValidLocation ? (
                <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2">
                       <MapPin className="h-4 w-4 text-muted-foreground" />
                       <span className="font-semibold text-foreground">{placeName || 'Loading...'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                        <div>
                            <p className="text-muted-foreground">Latitude</p>
                            <p className="font-mono text-foreground">{point.lat.toFixed(6)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground">Longitude</p>
                            <p className="font-mono text-foreground">{point.lng.toFixed(6)}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 text-sm text-destructive-foreground bg-destructive/90 p-4 rounded-lg">
                    <AlertTriangle className="h-6 w-6" />
                    <div className="flex flex-col">
                        <p className="font-bold">Invalid Location</p>
                        <p>Please select a point within California.</p>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </>
  );
}


// --- MAIN COMPONENT ---

export function MapView({ apiKey, mapId }: { apiKey: string; mapId?: string }) {
  return (
    <APIProvider apiKey={apiKey} libraries={["geocoding", "marker", "geometry"]}>
        <div className="relative h-screen w-screen font-body">
          <Map
            defaultCenter={INITIAL_CENTER}
            defaultZoom={INITIAL_ZOOM}
            mapId={mapId || "DEFAULT_MAP_ID"}
            gestureHandling="greedy"
            disableDefaultUI={true}
            className="h-full w-full"
            styles={[{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }, { "featureType": "transit", "stylers": [{ "visibility": "off" }] }]}
          >
            <MapContainer />
          </Map>
        </div>
    </APIProvider>
  );
}
