import type { ScanConfig, DataSource, Database,  ArtifactApiResponse } from '../types/scans';
import api from './client';

// Dummy implementations below—replace base URLs and implement real error handling as needed.

export async function fetchDataSources(): Promise<DataSource[]> {
  const res = await api.get('/api/data-sources');
  return res.data;
}

export async function fetchDatabases(dataSourceId: number): Promise<Database[]> {
  const res = await fetch(`/api/data-sources/${dataSourceId}/databases`);
  if (!res.ok) throw new Error('Failed to fetch databases');
  return await res.json();
}

export async function fetchArtifacts(
  dataSource: DataSource,
  dbName: string,
  artifactType?: string  // optional for SQL, required as "collections" for Mongo
): Promise<ArtifactApiResponse> {
  if (!dataSource || !dbName) throw new Error('Missing required arguments');

  const type = (dataSource.type || '').toLowerCase();
  let finalArtifactType = artifactType;

  // For Mongo, always use "collections"
  if (type === 'mongodb' || type === 'mongo') {
    finalArtifactType = 'collections';
  } else {
    finalArtifactType = artifactType || 'tables'; // Default to tables for SQL
  }

  const url = `/api/data-sources/${dataSource.id}/artifacts?db=${encodeURIComponent(dbName)}&artifact_type=${encodeURIComponent(finalArtifactType)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch artifacts');
  return await res.json();
}


export async function postScanJob(config: ScanConfig): Promise<{ jobId: string }> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers,
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Failed to submit scan job');
  }
  return await res.json();
}

