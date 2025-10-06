import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import type { AirNowData } from '@/lib/types';

// Define the search radius steps in miles.
const SEARCH_RADII = [10, 25, 50, 100];

async function fetchAirNowData(lat: string, lon: string, distance: number): Promise<AirNowData[]> {
    if (!config.airnowApiKey) {
        throw new Error('Server is not configured with an AirNow API key.');
    }
    
    const airnowApiUrl = new URL('https://www.airnowapi.org/aq/observation/latLong/current/');
    airnowApiUrl.searchParams.append('format', 'application/json');
    airnowApiUrl.searchParams.append('latitude', lat);
    airnowApiUrl.searchParams.append('longitude', lon);
    airnowApiUrl.searchParams.append('distance', distance.toString());
    airnowApiUrl.searchParams.append('API_KEY', config.airnowApiKey);

    const apiResponse = await fetch(airnowApiUrl.toString(), {
        next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.text();
        console.error('AirNow API Error:', errorBody);
        throw new Error(`Failed to fetch air quality data from AirNow. Status: ${apiResponse.status}`);
    }

    return await apiResponse.json();
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    if (!lat || !lon) {
        return NextResponse.json({ error: 'Missing "lat" or "lon" parameters.' }, { status: 400 });
    }
    
    try {
        let data: AirNowData[] = [];
        // Iteratively search with increasing radius
        for (const radius of SEARCH_RADII) {
            data = await fetchAirNowData(lat, lon, radius);
            if (data.length > 0) {
                break; // Found data, stop searching
            }
        }

        let averagedData: AirNowData[] = [];
        if (data.length > 0) {
             // Separate data by parameter
            const pm25_reports = data.filter(d => d.ParameterName === 'PM2.5');
            const o3_reports = data.filter(d => d.ParameterName === 'O3');

            // Average PM2.5 if present
            if (pm25_reports.length > 0) {
                const totalAqi = pm25_reports.reduce((sum, report) => sum + report.AQI, 0);
                const averageAqi = Math.round(totalAqi / pm25_reports.length);
                const representativeSample = pm25_reports[0]; // Use first report as a template
                
                averagedData.push({
                    ...representativeSample,
                    AQI: averageAqi,
                    Category: { // We might need a function to determine category from AQI
                        ...representativeSample.Category,
                        Name: getCategoryName(averageAqi)
                    },
                    ReportingArea: `Average of ${pm25_reports.length} stations`
                });
            }

            // Average O3 if present
            if (o3_reports.length > 0) {
                const totalAqi = o3_reports.reduce((sum, report) => sum + report.AQI, 0);
                const averageAqi = Math.round(totalAqi / o3_reports.length);
                const representativeSample = o3_reports[0];
                
                 averagedData.push({
                    ...representativeSample,
                    AQI: averageAqi,
                    Category: {
                         ...representativeSample.Category,
                         Name: getCategoryName(averageAqi)
                    },
                    ReportingArea: `Average of ${o3_reports.length} stations`
                });
            }
        }
        
        const response = NextResponse.json(averagedData.length > 0 ? averagedData : data);
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

// Helper function to determine AQI category name based on value
function getCategoryName(aqi: number): string {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
}
