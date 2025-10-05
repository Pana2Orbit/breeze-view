# **App Name**: PM2.5 Heatmapper

## Core Features:

- Hourly PM2.5 Prediction Heatmap: Display a heatmap of PM2.5 predictions for a selected hour, fetched from BigQuery.
- Interactive Map Navigation: Allow users to freely navigate the map using Google Maps JavaScript API.
- Point Selection with Adjustable Radius: Enable users to select a point on the map and define a radius (in km) to limit the prediction query to that area. A tool presents the heatmap of data lying within that circle.
- Air Quality Tile Overlay: Allow users to toggle an Air Quality heatmap tile overlay provided by Google on the map for reference.
- Point Timeseries Data: Provide optional functionality to view a time series of PM2.5 predictions for the selected point over the past 24 hours.
- Weather Data Integration: Optionally display current/hourly weather information for the selected point.
- Data Endpoint: Provides a function which retrieves data from BigQuery. If the app is in 'Viewport Mode', then a bounding box is used to get the PM2.5 prediction data. If the app is in 'Point Mode', the PM2.5 data is limited to that of a circle, whose origin is the point. Both the location of the point and the radius are determined by user input.

## Style Guidelines:

- Primary color: A soft sky blue (#87CEEB) to evoke a sense of calm and airiness, reflecting the focus on air quality.
- Background color: Light, desaturated blue (#E0F8FF), providing a clean and unobtrusive backdrop for the data visualizations.
- Accent color: A muted orange (#F0AD4E) to highlight interactive elements and call attention to important data points.
- Body and headline font: 'Inter' (sans-serif) for clear readability on data-heavy maps, equally suited to headlines and body text.
- Use simple, intuitive icons to represent controls such as toggling the Air Quality overlay and switching between viewport and point modes.
- Design a clean, intuitive layout that allows the map and its data to be the primary focus.
- Implement subtle transitions and animations to improve the user experience when interacting with map controls and updating the heatmap.