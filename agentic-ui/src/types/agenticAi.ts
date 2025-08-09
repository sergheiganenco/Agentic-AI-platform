export interface MetadataColumn {
  table: string;
  name: string;
  object_type: string; // "table_column", "view_column", etc.
  types: string[];
  nullable: boolean;
  primary_key: boolean;
  pii?: boolean; // True if flagged as PII
}

export interface MetadataObject {
  table: string;
  name: string;
  object_type: string;
  types: string[];
  nullable: boolean | null;
  primary_key: boolean | null;
  fields?: MetadataColumn[]; // For collections/views
}

export interface AgenticAiQueryRequest {
  query: string;
  scanJobId: number;
}

export interface AgenticAiQueryResponse {
  answer: string;
  columns?: string[];
  table?: Record<string, unknown>[];
  sql?: string;
}






