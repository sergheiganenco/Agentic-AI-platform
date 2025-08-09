// src/types/ai.ts

export interface AiAskRequest {
  scan_id?: string;
  scope_tables?: string[];
  question: string;
  row_limit?: number;
}

export interface AiAskResponse {
  answer: string;
  context_summary?: string | null;
}

export interface RagQueryRequest {
  question: string;
  tenant_id?: string;
}

export interface RagSourceRef {
  id: number;
  object_type: string;
  object_id: string;
  title?: string;
}

export interface RagQueryResponse {
  answer: string;
  sources: RagSourceRef[];
}
