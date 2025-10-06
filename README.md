# PM2.5 Heatmapper

This is a Next.js application that visualizes PM2.5 air quality predictions from a BigQuery dataset on an interactive Google Map. It's designed to be deployed on Firebase App Hosting.

## DEMO
<video src="video_explanation.mp4" controls width="600" loop muted>
  Tu navegador no soporta la reproducción de video.
</video>


## Features

- **Hourly Heatmaps**: View PM2.5 prediction heatmaps on an hourly basis using a time slider.
- **Interactive Map**: Freely pan and zoom the map.
- **Two Query Modes**:
  - **Viewport Mode**: Data is automatically fetched for the visible map area as you pan and zoom.
  - **Point & Radius Mode**: Select a point on the map and use a slider to define a radius, viewing a heatmap of predictions within that specific circular area.
- **Reference Layer**: Toggle Google's official Air Quality Index (AQI) heatmap for comparison.
- **Responsive Design**: A clean, map-focused UI that works on both desktop and mobile devices.

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- A Firebase project
- A Google Cloud Platform (GCP) project with BigQuery and Google Maps APIs enabled.

### 1. Set up your Data in BigQuery

Ensure you have a BigQuery table with your PM2.5 prediction data. The table must contain at least the following columns:

- `ts_utc` (TIMESTAMP): The UTC timestamp of the prediction.
- `lat_cell` (FLOAT64): The latitude of the data point.
- `lon_cell` (FLOAT64): The longitude of the data point.
- A column for the prediction value, e.g., `pm25_pred` (FLOAT64). The table must be in a `us` or `eu` multi-region location to use `ST_DWithin`.

### 2. Environment Variables

Create a `.env.local` file in the root of the project by copying the example file:

```bash
cp .env.local.example .env.local
```

Now, edit `.env.local` and fill in the required values:

- `NEXT_PUBLIC_MAPS_API_KEY`: Your Google Maps API key. This key needs access to:
  - Maps JavaScript API
  - Air Quality API
- `NEXT_PUBLIC_MAP_ID` (Optional): A custom Map ID for Google Maps styling.
- `BQ_PROJECT_ID`: Your GCP project ID where the BigQuery data resides.
- `BQ_DATASET`: The name of your BigQuery dataset.
- `BQ_PRED_TABLE`: The name of your BigQuery table containing predictions.
- `PRED_COL_NAME`: The name of the column with the PM2.5 prediction value (e.g., `pm25_pred`).

To allow the backend to query BigQuery when running locally, you need to authenticate with Google Cloud. Run the following command:

```bash
gcloud auth application-default login
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## Customization

You can adjust the following parameters directly in the code:

- **Initial Map View**: Change `INITIAL_CENTER` and `INITIAL_ZOOM` in `src/components/map-view.tsx`.
- **Radius Limits**: Modify `MIN_RADIUS_KM` and `MAX_RADIUS_KM` in `src/components/map-view.tsx`.

## Deployment

This application is configured for deployment on **Firebase App Hosting**.

1. Connect your GitHub repository to Firebase App Hosting.
2. The deployment will happen automatically on pushes to your main branch.

Alternatively, you can deploy manually using the Firebase CLI:

```bash
firebase deploy
```
