import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
    if (!config.mapsApiKey) {
        return NextResponse.json(
            { error: 'Server is not configured with a Maps API key.' },
            { status: 500 }
        );
    }

    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing "lat" or "lon" parameters.' }, { status: 400 });
    }
    
    const weatherApiUrl = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
    weatherApiUrl.searchParams.append('key', config.mapsApiKey);
    weatherApiUrl.searchParams.append('location.latitude', lat);
    weatherApiUrl.searchParams.append('location.longitude', lon);

    try {
        const weatherResponse = await fetch(weatherApiUrl.toString());

        if (!weatherResponse.ok) {
            const errorBody = await weatherResponse.json();
            console.error('Google Weather API Error:', errorBody);
            return NextResponse.json(
                { error: 'Failed to fetch weather data from Google.', details: errorBody.error.message },
                { status: weatherResponse.status }
            );
        }

        const weatherData = await weatherResponse.json();
        
        // Respond with a 5-minute cache
        const response = NextResponse.json(weatherData);
        response.headers.set('Cache-Control', 'public, max-age=300');
        return response;

    } catch (error) {
        console.error('Error fetching weather data:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json(
            { error: 'Failed to request weather data.', details: errorMessage },
            { status: 500 }
        );
    }
}
