export interface SummarizeRequest {
  text: string;
  length: 'short' | 'medium' | 'detailed';
}

export interface SummarizeResponse {
  summary: string;
}