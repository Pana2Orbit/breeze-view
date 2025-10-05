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
