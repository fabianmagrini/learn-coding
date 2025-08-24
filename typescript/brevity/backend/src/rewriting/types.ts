export interface RewriteRequest {
  text: string;
  tone: 'professional' | 'casual' | 'confident';
}

export interface RewriteResponse {
  rewrittenText: string;
}