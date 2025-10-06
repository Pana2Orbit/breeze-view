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
  Wind,
  Droplets,
  Cloud,
  Leaf,
  Info,
  Beaker
} from "lucide-react";
import type { WeatherData, AirNowData, TempoData } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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


// --- UTILITY FUNCTIONS ---
const getAqiBadgeVariant = (categoryName: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (categoryName) {
        case "Good":
            return "default"; // Will be styled green
        case "Moderate":
            return "secondary"; // Will be styled yellow
        case "Unhealthy for Sensitive Groups":
            return "outline"; // Will be styled orange
        default:
            return "destructive"; // Red for unhealthy and worse
    }
};

const AqiCategoryStyles = {
    Good: "bg-green-500 hover:bg-green-600",
    Moderate: "bg-yellow-500 hover:bg-yellow-600 text-black",
    "Unhealthy for Sensitive Groups": "bg-orange-500 hover:bg-orange-600",
    Unhealthy: "bg-red-500 hover:bg-red-600",
    "Very Unhealthy": "bg-purple-500 hover:bg-purple-600",
    Hazardous: "bg-maroon-500 hover:bg-maroon-600",
};


// --- CHILD COMPONENT for Map Logic ---

function MapContainer() {
  const map = useMap();
  const geocodingLib = useMapsLibrary('geocoding');
  const geometryLib = useMapsLibrary('geometry');

  const [point, setPoint] = useState<google.maps.LatLngLiteral | null>(INITIAL_CENTER);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [airNowData, setAirNowData] = useState<AirNowData[] | null>(null);
  const [tempoData, setTempoData] = useState<TempoData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInsideCalifornia, setIsInsideCalifornia] = useState(true);

  const californiaPolygon = useMemo(() => {
    if (!geometryLib) return null;
    return new google.maps.Polygon({ paths: CALIFORNIA_POLYGON_COORDS });
  }, [geometryLib]);

  const checkLocationValidity = useCallback((latLng: google.maps.LatLngLiteral) => {
    if (!geometryLib || !californiaPolygon) return false;
    const markerLatLng = new google.maps.LatLng(latLng.lat, latLng.lng);
    return geometryLib.poly.containsLocation(markerLatLng, californiaPolygon);
  }, [geometryLib, californiaPolygon]);
  
  const getPlaceName = useCallback(async (latLng: google.maps.LatLngLiteral): Promise<string | null> => {
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
            return null; // Return null if no address found (e.g., in the ocean)
        }
    } catch (error) {
        console.error("Geocoder failed due to: " + error);
        return "Geocoding error";
    }
  }, [geocodingLib]);

  const getWeatherData = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    try {
      const response = await fetch(`/api/weather?lat=${latLng.lat}&lon=${latLng.lng}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weather');
      }
      const data: WeatherData = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error("Error fetching weather data:", error);
      setWeatherData(null);
    }
  }, []);

  const getAirNowData = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    try {
      const response = await fetch(`/api/airnow?lat=${latLng.lat}&lon=${latLng.lng}`);
      if (!response.ok) {
        throw new Error('Failed to fetch AirNow data');
      }
      const data: AirNowData[] = await response.json();
      setAirNowData(data);
    } catch (error) {
      console.error("Error fetching AirNow data:", error);
      setAirNowData(null);
    }
  }, []);

  const getTempoData = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    try {
      const response = await fetch(`/api/tempo?lat=${latLng.lat}&lon=${latLng.lng}`);
      if (!response.ok) {
        throw new Error('Failed to fetch TEMPO data');
      }
      const data: TempoData = await response.json();
      setTempoData(data);
    } catch (error) {
      console.error("Error fetching TEMPO data:", error);
      setTempoData(null);
    }
  }, []);


  const updateLocationInfo = useCallback(async (latLng: google.maps.LatLngLiteral) => {
    setIsInsideCalifornia(checkLocationValidity(latLng));
    
    setIsLoading(true);
    setWeatherData(null);
    setAirNowData(null);
    setTempoData(null);
    setPlaceName('Loading...');

    const name = await getPlaceName(latLng);
    setPlaceName(name);

    // Only fetch data if a valid place name was found
    if (name && name !== "Geocoding error") {
        await Promise.all([
            getWeatherData(latLng),
            getAirNowData(latLng),
            getTempoData(latLng),
        ]);
    } else if (name === null) {
        setPlaceName("No address found at this location.");
    }

    setIsLoading(false);

  }, [checkLocationValidity, getPlaceName, getWeatherData, getAirNowData, getTempoData]);

  useEffect(() => {
    if (point) {
      updateLocationInfo(point);
    }
  }, [point, updateLocationInfo]);

  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = e.latLng.toJSON();
      setPoint(newPos);
      // updateLocationInfo is triggered by the useEffect on point change
    }
  };

  const pm25 = useMemo(() => airNowData?.find(d => d.ParameterName === "PM2.5"), [airNowData]);
  const o3 = useMemo(() => airNowData?.find(d => d.ParameterName === "O3"), [airNowData]);


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
            Drag the marker to get location and weather info.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {point ? (
                <div className="grid gap-4 text-sm">
                    {/* Location Info */}
                    <div className="flex items-start gap-2">
                       <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                       <div className="flex flex-col">
                         <span className="font-semibold text-foreground">{placeName || 'Loading...'}</span>
                         <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <p>Lat: <span className="font-mono text-foreground">{point.lat.toFixed(4)}</span></p>
                            <p>Lon: <span className="font-mono text-foreground">{point.lng.toFixed(4)}</span></p>
                        </div>
                       </div>
                    </div>
                    
                    <Separator />

                    {/* Weather Info */}
                    <div className="grid gap-3">
                        <h3 className="font-semibold text-foreground">Current Weather</h3>
                        {weatherData ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <img src={`${weatherData.weatherCondition.iconBaseUri}.png`} alt={weatherData.weatherCondition.description.text} className="h-8 w-8" />
                                    <div>
                                        <p className="font-bold text-lg text-primary">{Math.round(weatherData.temperature.degrees)}°C</p>
                                        <p className="text-xs text-muted-foreground capitalize">{weatherData.weatherCondition.description.text}</p>
                                    </div>
                                </div>
                                <div className="grid grid-rows-2 gap-2 text-xs">
                                     <div className="flex items-center gap-2">
                                        <Droplets className="h-4 w-4 text-accent" />
                                        <span>Humidity: {weatherData.relativeHumidity}%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Wind className="h-4 w-4 text-accent" />
                                        <span>Wind: {Math.round(weatherData.wind.speed.value)} {weatherData.wind.speed.unit.toLowerCase()}</span>
                                    </div>
                                </div>
                            </div>
                        ) : isLoading && placeName !== "No address found at this location." ? (
                             <p className="text-muted-foreground text-xs">Fetching weather data...</p>
                        ) : (
                             <p className="text-muted-foreground text-xs">No weather data available.</p>
                        )}
                    </div>
                    
                    <Separator />

                     {/* Air Quality Info */}
                    <div className="grid gap-3">
                        <h3 className="font-semibold text-foreground">Air Quality (AQI)</h3>
                        {airNowData && airNowData.length > 0 ? (
                             <div className="grid grid-cols-2 gap-4">
                                {pm25 && (
                                     <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                           <Leaf className="h-4 w-4"/>
                                           <span>PM2.5</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <p className="font-bold text-2xl text-primary">{pm25.AQI}</p>
                                            <Badge variant={getAqiBadgeVariant(pm25.Category.Name)} className={(AqiCategoryStyles as any)[pm25.Category.Name] || ''}>{pm25.Category.Name}</Badge>
                                        </div>
                                    </div>
                                )}
                                {o3 && (
                                     <div className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                           <Cloud className="h-4 w-4"/>
                                           <span>Ozone</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <p className="font-bold text-2xl text-primary">{o3.AQI}</p>
                                            <Badge variant={getAqiBadgeVariant(o3.Category.Name)} className={(AqiCategoryStyles as any)[o3.Category.Name] || ''}>{o3.Category.Name}</Badge>
                                        </div>
                                    </div>
                                )}
                                {!pm25 && !o3 && (
                                     <p className="text-muted-foreground text-xs col-span-2">No AQI data available for this location.</p>
                                )}
                             </div>
                        ) : isLoading && placeName !== "No address found at this location." ? (
                            <p className="text-muted-foreground text-xs">Fetching air quality data...</p>
                        ) : (
                            <p className="text-muted-foreground text-xs">No air quality data available for this location.</p>
                        )}
                    </div>

                    <Separator />

                    {/* TEMPO Satellite Data */}
                    <div className="grid gap-3">
                        <h3 className="font-semibold text-foreground">Satellite Data (TEMPO)</h3>
                        {tempoData ? (
                            <div className="flex items-center gap-2">
                                <Beaker className="h-5 w-5 text-accent flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-primary">{tempoData.value}</p>
                                    <p className="text-xs text-muted-foreground">Tropospheric NO₂ ({tempoData.source})</p>
                                </div>
                            </div>
                        ) : isLoading && placeName !== "No address found at this location." ? (
                            <p className="text-muted-foreground text-xs">Fetching TEMPO satellite data...</p>
                        ) : (
                            <p className="text-muted-foreground text-xs">No TEMPO data available.</p>
                        )}
                    </div>
                    
                    {!isInsideCalifornia && (
                      <>
                        <Separator />
                        <Alert variant="default" className="bg-accent/10 border-accent/50">
                          <Info className="h-4 w-4 text-accent" />
                          <AlertTitle className="font-semibold text-accent">Heads up!</AlertTitle>
                          <AlertDescription className="text-accent/90">
                            Advanced data predictions are currently limited to California. We'll get here soon!
                          </AlertDescription>
                        </Alert>
                      </>
                    )}
                </div>
            ) : (
              // This part should ideally not be reached if there's always a point
              <p>Select a location on the map.</p>
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
