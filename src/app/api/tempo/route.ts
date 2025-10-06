import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

// This is a simplified example. The actual Harmony API call might be more complex
// and could involve asynchronous job polling. This implementation assumes a direct,
// synchronous-like response for simplicity.
async function fetchHarmonyData(lat: string, lon: string) {
    if (!config.tempoApiToken) {
        throw new Error('Server is not configured with a TEMPO API token.');
    }

    const collectionId = 'C2799434144-GES_DISC'; // TEMPO L2 NO2
    
    // Construct the Harmony API URL. 
    // We request a single point and specify the output format.
    // Note: The Harmony API might require different parameters or a different structure.
    // This is a best-effort example based on common patterns.
    // We create a small bounding box around the point.
    const buffer = 0.05; // Approx 5km
    const boundingBox = [
        parseFloat(lon) - buffer,
        parseFloat(lat) - buffer,
        parseFloat(lon) + buffer,
        parseFloat(lat) + buffer,
    ].join(',');

    const harmonyUrl = new URL('https://harmony.earthdata.nasa.gov/harmony');
    harmonyUrl.searchParams.append('collectionId', collectionId);
    harmonyUrl.searchParams.append('variable', 'nitrogendioxide_tropospheric_column'); // Example variable name
    harmonyUrl.searchParams.append('granuleId', 'G2799436443-GES_DISC'); // Need a specific granule or use temporal search
    harmonyUrl.searchParams.append('outputCrs', 'EPSG:4326');
    harmonyUrl.searchParams.append('format', 'application/json');
    harmonyUrl.searchParams.append('subset', `lat(${lat}:${lat})`);
    harmonyUrl.searchParams.append('subset', `lon(${lon}:${lon})`);


    // This is a hypothetical endpoint. The actual one will be more complex.
    // For a real scenario, we would likely need to start a job and poll for results.
    const placeholderUrl = `https://jsonplaceholder.typicode.com/todos/1`;

    const response = await fetch(placeholderUrl, {
        headers: {
            // 'Authorization': `Bearer ${config.tempoApiToken}`,
        },
        next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Harmony API Error:", errorText);
        throw new Error(`Failed to fetch data from Harmony API. Status: ${response.status}`);
    }

    // Since we don't have the real API, we return a mock value.
    // The structure of the real response would need to be parsed here.
    return {
        value: (Math.random() * 5e15).toExponential(2) + " mol/m²",
        description: "Simulated TEMPO NO2 Value"
    };
}


export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing "lat" or "lon" parameters.' }, { status: 400 });
    }

    try {
        // For now, we will return a simulated value, as the real Harmony API
        // is complex and requires async job handling which is beyond a simple GET request.
        const data = {
            value: (Math.random() * 5e15).toExponential(2) + " mol/m²",
            source: "TEMPO (Simulated)"
        };
        
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
