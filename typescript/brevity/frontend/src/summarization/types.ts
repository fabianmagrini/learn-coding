export type SummaryLength = 'short' | 'medium' | 'detailed';

export interface SummarizeRequest {
  text: string;
  length: SummaryLength;
}

export interface SummarizeOptions {
  length: SummaryLength;
}