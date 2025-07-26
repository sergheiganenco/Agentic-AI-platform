export interface DataSource {
  id: number;
  name: string;
  type: string;
  host?: string;
  port?: number;
  environment: string;
  tags?: string[];
}

export interface Database {
  name: string;
}

export interface ParsedSQLMetadata {
  source_type: string; // "sql"
  objects: Array<{
    name: string; // Table/Collection name
    fields: Array<{
      name: string;
      types?: string[];
      nullable?: boolean;
      primary_key?: boolean;
      row_count?: number;
      description?: string;
    }>;
  }>;
}

export interface Artifact {
  table: string;
  name: string;
  types?: string[];
  type?: string;
  nullable?: boolean;
  primary_key?: boolean;
  row_count?: number;
  description?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}


export interface ArtifactTypeOption {
  value: string;
  label: string;
  name: string;
}

export type ArtifactApiResponse =
  | { tables: string[]; views?: string[] }         // SQL shape
  | { collections: string[] }                      // Mongo shape
  | { name: string }[]                             // Array of objects
  | string[]                                       // Array of strings
  | Record<string, string[]>;  

export interface ScanConfig {
  dataSourceId: number;
  dbNames: string[];
  artifactTypes: string[];
  scheduledTime?: string;
  scheduledCron?: string;
}


// src/types/scanJobs.ts
export interface ScanJob {
  id: number;
  data_source_id: number;
  db_names: string[];
  artifact_types: string[];
  status: string;
  created_at: string;
  finished_at?: string | null;
  metadata_result_id?: string | null;
  scheduled_time?: string | null;
}

export interface ScanJobResult {
  scan_job_id: number;
  metadata_json: string | object | null; 
  data_source: string;
  scan_timestamp: string;
  databases: Array<{
    name: string;
    [artifact: string]: unknown;
  }>;
}