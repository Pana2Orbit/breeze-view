import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
    if (!config.airnowApiKey) {
        return NextResponse.json(
            { error: 'Server is not configured with an AirNow API key.' },
            { status: 500 }
        );
    }

    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');
    const distance = searchParams.get('distance') || '25'; // Default search radius of 25 miles

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing "lat" or "lon" parameters.' }, { status: 400 });
    }
    
    const airnowApiUrl = new URL('https://www.airnowapi.org/aq/observation/latLong/current/');
    airnowApiUrl.searchParams.append('format', 'application/json');
    airnowApiUrl.searchParams.append('latitude', lat);
    airnowApiUrl.searchParams.append('longitude', lon);
    airnowApiUrl.searchParams.append('distance', distance);
    airnowApiUrl.searchParams.append('API_KEY', config.airnowApiKey);


    try {
        const apiResponse = await fetch(airnowApiUrl.toString(), {
            next: { revalidate: 300 } // Cache for 5 minutes
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('AirNow API Error:', errorBody);
            return NextResponse.json(
                { error: 'Failed to fetch air quality data from AirNow.', details: errorBody },
                { status: apiResponse.status }
            );
        }

        const data = await apiResponse.json();
        
        const response = NextResponse.json(data);
        response.headers.set('Cache-Control', 'public, max-age=300'); // 5-minute client-side cache
        return response;

    } catch (error) {
        console.error('Error fetching air quality data:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json(
            { error: 'Failed to request air quality data.', details: errorMessage },
            { status: 500 }
        );
    }
}
