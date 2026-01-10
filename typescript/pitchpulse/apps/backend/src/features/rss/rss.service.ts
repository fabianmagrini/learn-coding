import Parser from 'rss-parser';
import { db } from '../../db/client.js';

const parser = new Parser();

interface RSSItem {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  enclosure?: {
    url?: string;
  };
}

export const rssService = {
  async fetchAndStoreFeed(sourceId: string, rssUrl: string) {
    try {
      const feed = await parser.parseURL(rssUrl);

      const articles = [];

      for (const item of feed.items as RSSItem[]) {
        if (!item.title || !item.link || !item.pubDate) {
          continue;
        }

        // Check if article already exists
        const existing = await db.query(
          'SELECT id FROM articles WHERE source_url = $1',
          [item.link]
        );

        if (existing.rows.length > 0) {
          continue;
        }

        // Extract summary
        const summary = item.contentSnippet || item.content?.substring(0, 300) || '';

        // Insert article
        const result = await db.query(
          `INSERT INTO articles (title, summary, source_id, source_url, image_url, published_at, article_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            item.title,
            summary,
            sourceId,
            item.link,
            item.enclosure?.url || null,
            new Date(item.pubDate),
            'official', // Default type, can be enhanced later
          ]
        );

        articles.push(result.rows[0]);
      }

      return articles;
    } catch (error) {
      console.error(`Error fetching RSS feed ${rssUrl}:`, error);
      throw error;
    }
  },

  async fetchAllActiveFeeds() {
    const sources = await db.query(
      'SELECT id, rss_url FROM news_sources WHERE is_active = true AND rss_url IS NOT NULL'
    );

    const results = [];

    for (const source of sources.rows) {
      try {
        const articles = await this.fetchAndStoreFeed(source.id, source.rss_url);
        results.push({
          sourceId: source.id,
          articlesCount: articles.length,
          success: true,
        });
      } catch (error) {
        results.push({
          sourceId: source.id,
          articlesCount: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  },

  async tagArticlesWithKeywords() {
    // Get all teams for tagging
    const teams = await db.query('SELECT name FROM teams');
    const teamNames = teams.rows.map((t) => t.name);

    // Get recent untagged articles
    const articles = await db.query(
      `SELECT id, title, summary
       FROM articles
       WHERE id NOT IN (SELECT DISTINCT article_id FROM article_tags)
       ORDER BY published_at DESC
       LIMIT 100`
    );

    for (const article of articles.rows) {
      const text = `${article.title} ${article.summary}`.toLowerCase();

      // Tag with teams
      for (const teamName of teamNames) {
        if (text.includes(teamName.toLowerCase())) {
          await db.query(
            `INSERT INTO article_tags (article_id, tag_type, tag_value)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [article.id, 'team', teamName]
          );
        }
      }
    }

    return { taggedArticles: articles.rows.length };
  },
};
