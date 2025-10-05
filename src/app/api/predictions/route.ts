import { NextRequest, NextResponse } from 'next/server';
import { BigQuery, BigQueryTimestamp } from '@google-cloud/bigquery';
import { bigquery } from '@/lib/bigquery';
import { config } from '@/lib/config';
import type { PredictionPoint, GeoJSONFeatureCollection } from '@/lib/types';

// Maximum number of points to return to avoid overwhelming the client
const MAX_RESULTS = 10000;

export async function GET(request: NextRequest) {
  if (!bigquery) {
    return NextResponse.json(
      { error: 'Server is not configured to connect to BigQuery.' },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const ts = searchParams.get('ts');
  const bbox = searchParams.get('bbox');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radiusKm = searchParams.get('radius_km');

  if (!ts) {
    return NextResponse.json({ error: 'Missing timestamp parameter "ts".' }, { status: 400 });
  }

  let query: string;
  let params: any = { ts };

  const fullTableName = `\`${config.bqProjectId}.${config.bqDataset}.${config.bqTable}\``;
  const predCol = config.bqPredictionColumn;

  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat);
    if ([minLng, minLat, maxLng, maxLat].some(isNaN)) {
        return NextResponse.json({ error: 'Invalid "bbox" parameter format.' }, { status: 400 });
    }
    
    query = `
      SELECT lat_cell, lon_cell, ${predCol} as pm25_pred
      FROM ${fullTableName}
      WHERE ts_utc = @ts
        AND lat_cell BETWEEN @minLat AND @maxLat
        AND lon_cell BETWEEN @minLng AND @maxLng
      LIMIT ${MAX_RESULTS};
    `;
    params = { ...params, minLat, maxLat, minLng, maxLng };

  } else if (lat && lon && radiusKm) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const radiusNum = parseFloat(radiusKm);

    if (isNaN(latNum) || isNaN(lonNum) || isNaN(radiusNum)) {
        return NextResponse.json({ error: 'Invalid "lat", "lon", or "radius_km" parameters.' }, { status: 400 });
    }
    
    query = `
      SELECT lat_cell, lon_cell, ${predCol} as pm25_pred
      FROM ${fullTableName}
      WHERE ts_utc = @ts
        AND ST_DWITHIN(
          ST_GEOGPOINT(lon_cell, lat_cell),
          ST_GEOGPOINT(@lon, @lat),
          @radius_m
        )
      LIMIT ${MAX_RESULTS};
    `;
    params = { ...params, lat: latNum, lon: lonNum, radius_m: radiusNum * 1000 };

  } else {
    return NextResponse.json({ error: 'Either "bbox" or "lat, lon, and radius_km" must be provided.' }, { status: 400 });
  }

  try {
    const options = {
      query: query,
      location: 'US', // BigQuery locations: https://cloud.google.com/bigquery/docs/locations. Required for ST_DWITHIN.
      params: params,
    };

    const [rows] = await bigquery.query(options);

    const geoJson: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: rows.map((row: PredictionPoint) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [row.lon_cell, row.lat_cell],
        },
        properties: {
          pm25_pred: row.pm25_pred,
        },
      })),
    };
    
    const response = NextResponse.json(geoJson);
    response.headers.set('Cache-Control', 'public, max-age=300'); // 5-minute cache
    return response;

  } catch (error) {
    console.error('BigQuery Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json(
      { error: 'Failed to execute query on BigQuery.', details: errorMessage },
      { status: 500 }
    );
  }
}
