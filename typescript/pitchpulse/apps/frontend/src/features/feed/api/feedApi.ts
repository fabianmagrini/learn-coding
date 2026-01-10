import { api } from '@/lib/api';

export interface Article {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  publishedAt: string;
  tags: string[];
  reliability: number;
  type: 'official' | 'rumor' | 'analysis' | 'opinion';
}

export const feedApi = {
  getPersonalizedFeed: async (): Promise<Article[]> => {
    const response = await api.get('/api/feed/personalized');
    return response.data;
  },

  getArticlesByTeam: async (team: string): Promise<Article[]> => {
    const response = await api.get(`/api/feed/team/${team}`);
    return response.data;
  },
};
