import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

// This is a simplified example. The actual Harmony API call might be more complex
// and could involve asynchronous job polling. This implementation assumes a direct,
// synchronous-like response for simplicity.
async function fetchHarmonyData(lat: string, lon: string) {
    if (!config.tempoApiToken) {
        // Return a simulated value if the token is not configured
        // This prevents errors but indicates that the API is not fully set up.
        console.warn("TEMPO API token not configured. Returning simulated data.");
        return {
            value: (Math.random() * 5e15).toExponential(2) + " mol/m²",
            source: "TEMPO (Simulated - No Token)"
        };
    }

    const collectionId = 'C2799434144-GES_DISC'; // TEMPO L2 NO2
    
    const harmonyUrl = new URL('https://harmony.earthdata.nasa.gov/harmony');
    harmonyUrl.searchParams.append('collectionId', collectionId);
    harmonyUrl.searchParams.append('variable', 'nitrogendioxide_tropospheric_column'); 
    // Specifying a single point using subsetting for lat and lon
    harmonyUrl.searchParams.append('subset', `lat(${lat}:${lat})`);
    harmonyUrl.searchParams.append('subset', `lon(${lon}:${lon})`);
    harmonyUrl.searchParams.append('outputCrs', 'EPSG:4326');
    harmonyUrl.searchParams.append('format', 'application/json');
    // We ask for the latest available data, Harmony will find the right granule
    harmonyUrl.searchParams.append('temporal', 'latest');


    // The Harmony API is often asynchronous. A real implementation might need to 
    // poll a job URL. For this example, we attempt a direct request, but it may
    // not work for all queries.
    try {
        const response = await fetch(harmonyUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${config.tempoApiToken}`,
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Harmony API Error:", errorText);
            // Don't throw, just return a simulated value to keep the UI from breaking
            return {
                value: "N/A",
                source: `TEMPO (API Error: ${response.status})`
            };
        }

        // The actual parsing logic would depend on the complex JSON structure returned by Harmony.
        // This is a placeholder for that parsing logic.
        const result = await response.json();

        // This is a hypothetical path to the data. It would need to be adjusted based on the real response.
        const dataValue = result?.features?.[0]?.properties?.data;
        
        return {
            value: dataValue ? `${dataValue.toExponential(2)} mol/m²` : "N/A",
            source: "TEMPO"
        };
    } catch (e) {
        console.error("Failed to fetch from Harmony API", e);
        return {
            value: "N/A",
            source: `TEMPO (Request Failed)`
        };
    }
}


export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing "lat" or "lon" parameters.' }, { status: 400 });
    }

    try {
        const data = await fetchHarmonyData(lat, lon);
        
        const response = NextResponse.json(data);
        response.headers.set('Cache-Control', 'public, max-age=3600'); // 1-hour cache
        return response;

    } catch (error) {
        console.error('Error fetching TEMPO data:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json(
            { error: 'Failed to request TEMPO data.', details: errorMessage },
            { status: 500 }
        );
    }
}
