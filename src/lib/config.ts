export const config = {
  mapsApiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY || '',
  mapId: process.env.NEXT_PUBLIC_MAP_ID || '',
  bqProjectId: process.env.BQ_PROJECT_ID || '',
  bqDataset: process.env.BQ_DATASET || '',
  bqTable: process.env.BQ_PRED_TABLE || '',
  bqPredictionColumn: process.env.PRED_COL_NAME || 'pm25_pred',
  airnowApiKey: '064348A5-E73C-46A8-B3C1-CBB8C746965C',
};
