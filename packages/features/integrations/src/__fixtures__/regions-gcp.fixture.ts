import type { Region } from '@guepard/domain/usecases';

/**
 * A representative GCP region list — what compute.regions.list would return
 * for a service account with Compute Viewer on a standard project.
 */
export const gcpRegionsFixture: Region[] = [
  { id: 'us-central1', name: 'Iowa (us-central1)' },
  { id: 'us-east1', name: 'South Carolina (us-east1)' },
  { id: 'us-east4', name: 'Northern Virginia (us-east4)' },
  { id: 'us-west1', name: 'Oregon (us-west1)' },
  { id: 'us-west2', name: 'Los Angeles (us-west2)' },
  { id: 'europe-west1', name: 'Belgium (europe-west1)' },
  { id: 'europe-west2', name: 'London (europe-west2)' },
  { id: 'europe-west3', name: 'Frankfurt (europe-west3)' },
  { id: 'europe-west4', name: 'Netherlands (europe-west4)' },
  { id: 'europe-north1', name: 'Finland (europe-north1)' },
  { id: 'asia-east1', name: 'Taiwan (asia-east1)' },
  { id: 'asia-northeast1', name: 'Tokyo (asia-northeast1)' },
  { id: 'asia-south1', name: 'Mumbai (asia-south1)' },
  { id: 'asia-southeast1', name: 'Singapore (asia-southeast1)' },
];
