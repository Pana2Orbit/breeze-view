export type PredictionPoint = {
    lat_cell: number;
    lon_cell: number;
    pm25_pred: number;
};

export type GeoJSONFeature = {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number]; // [lon, lat]
    };
    properties: {
        pm25_pred: number;
    };
};

export type GeoJSONFeatureCollection = {
    type: 'FeatureCollection';
    features: GeoJSONFeature[];
};

// Based on the example from Google Weather API docs
export interface WeatherData {
    currentTime: string;
    weatherCondition: {
        description: {
            text: string;
        };
        iconBaseUri: string;
    };
    temperature: {
        degrees: number;
        unit: string;
    };
    relativeHumidity: number;
    wind: {
        direction: {
            degrees: number;
            cardinal: string;
        };
        speed: {
            value: number;
            unit: string;
        };
    };
}
