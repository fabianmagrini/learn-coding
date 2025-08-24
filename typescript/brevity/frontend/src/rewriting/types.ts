export type ToneType = 'professional' | 'casual' | 'confident';

export interface RewriteRequest {
  text: string;
  tone: ToneType;
}

export interface RewriteOptions {
  tone: ToneType;
}