import { db } from '../../db/client.js';

export const feedService = {
  async getPersonalizedFeed(userId: string) {
    const result = await db.query(
      `SELECT DISTINCT
         a.id,
         a.title,
         a.summary,
         ns.name as source,
         a.source_url,
         a.image_url,
         a.published_at,
         a.article_type,
         ns.reliability_score as reliability,
         ARRAY_AGG(DISTINCT at.tag_value) FILTER (WHERE at.tag_value IS NOT NULL) as tags
       FROM articles a
       INNER JOIN news_sources ns ON a.source_id = ns.id
       LEFT JOIN article_tags at ON a.id = at.article_id
       WHERE EXISTS (
         SELECT 1 FROM article_tags at2
         INNER JOIN user_favorite_teams uft ON at2.tag_value = (
           SELECT name FROM teams WHERE id = uft.team_id
         )
         WHERE at2.article_id = a.id
         AND uft.user_id = $1
         AND at2.tag_type = 'team'
       )
       GROUP BY a.id, ns.name, ns.reliability_score
       ORDER BY a.published_at DESC
       LIMIT 50`,
      [userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      source: row.source,
      sourceUrl: row.source_url,
      imageUrl: row.image_url,
      publishedAt: row.published_at,
      type: row.article_type,
      reliability: row.reliability || 50,
      tags: row.tags || [],
    }));
  },

  async getArticlesByTeam(teamName: string) {
    const result = await db.query(
      `SELECT DISTINCT
         a.id,
         a.title,
         a.summary,
         ns.name as source,
         a.source_url,
         a.image_url,
         a.published_at,
         a.article_type,
         ns.reliability_score as reliability,
         ARRAY_AGG(DISTINCT at.tag_value) FILTER (WHERE at.tag_value IS NOT NULL) as tags
       FROM articles a
       INNER JOIN news_sources ns ON a.source_id = ns.id
       INNER JOIN article_tags at ON a.id = at.article_id
       LEFT JOIN article_tags at2 ON a.id = at2.article_id
       WHERE at.tag_type = 'team' AND at.tag_value = $1
       GROUP BY a.id, ns.name, ns.reliability_score
       ORDER BY a.published_at DESC
       LIMIT 50`,
      [teamName]
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      source: row.source,
      sourceUrl: row.source_url,
      imageUrl: row.image_url,
      publishedAt: row.published_at,
      type: row.article_type,
      reliability: row.reliability || 50,
      tags: row.tags || [],
    }));
  },

  async getLatestArticles(limit = 50) {
    const result = await db.query(
      `SELECT DISTINCT
         a.id,
         a.title,
         a.summary,
         ns.name as source,
         a.source_url,
         a.image_url,
         a.published_at,
         a.article_type,
         ns.reliability_score as reliability,
         ARRAY_AGG(DISTINCT at.tag_value) FILTER (WHERE at.tag_value IS NOT NULL) as tags
       FROM articles a
       INNER JOIN news_sources ns ON a.source_id = ns.id
       LEFT JOIN article_tags at ON a.id = at.article_id
       GROUP BY a.id, ns.name, ns.reliability_score
       ORDER BY a.published_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      source: row.source,
      sourceUrl: row.source_url,
      imageUrl: row.image_url,
      publishedAt: row.published_at,
      type: row.article_type,
      reliability: row.reliability || 50,
      tags: row.tags || [],
    }));
  },
};
