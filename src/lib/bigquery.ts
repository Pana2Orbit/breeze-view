import { BigQuery } from '@google-cloud/bigquery';
import { config } from './config';

let bigquery: BigQuery;

// This check allows the app to run in a development environment without
// crashing if the BigQuery environment variables are not set.
// The API routes will return an error, but the frontend will still load.
if (config.bqProjectId && config.bqDataset && config.bqTable) {
  try {
    bigquery = new BigQuery({
      projectId: config.bqProjectId,
    });
  } catch (error) {
    console.error("Failed to initialize BigQuery client:", error);
    // @ts-ignore
    bigquery = null;
  }
} else {
  console.warn(
    "BigQuery environment variables (BQ_PROJECT_ID, BQ_DATASET, BQ_PRED_TABLE) are not fully set. BigQuery client is not initialized."
  );
  // @ts-ignore
  bigquery = null;
}

export { bigquery };
