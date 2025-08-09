import axios from 'axios';
import type { AgenticAiQueryRequest, AgenticAiQueryResponse } from '../types/agenticAi';

export const postAgenticQuery = async (
  req: AgenticAiQueryRequest
): Promise<AgenticAiQueryResponse> => {
  const response = await axios.post<AgenticAiQueryResponse>('/api/agentic/metadata-query', req);
  return response.data;
};
