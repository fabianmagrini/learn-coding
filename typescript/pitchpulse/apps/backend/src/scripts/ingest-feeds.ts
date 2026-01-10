import { rssService } from '../features/rss/rss.service.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Starting RSS feed ingestion...');

  try {
    const results = await rssService.fetchAllActiveFeeds();

    console.log('\nIngestion complete:');
    console.log('Total sources:', results.length);
    console.log('Successful:', results.filter((r) => r.success).length);
    console.log('Failed:', results.filter((r) => !r.success).length);
    console.log(
      'Total articles fetched:',
      results.reduce((sum, r) => sum + r.articlesCount, 0)
    );

    console.log('\nTagging articles with keywords...');
    const tagResult = await rssService.tagArticlesWithKeywords();
    console.log(`Tagged ${tagResult.taggedArticles} articles`);

    process.exit(0);
  } catch (error) {
    console.error('Error during ingestion:', error);
    process.exit(1);
  }
}

main();
