/**
 * Local Scheduler for Reddalert
 *
 * This script fetches Reddit RSS feeds locally and POSTs new posts
 * to the Firebase ingestPosts endpoint.
 *
 * Usage:
 *   node scripts/localScheduler.js [--production]
 *
 * Options:
 *   --production  POST to production Firebase (default: emulator)
 */

const Parser = require('rss-parser');

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },
});

// Configuration
const CONFIG = {
  apiKey: 'reddalert-ingest-key-2024',
  endpoints: {
    emulator: 'http://127.0.0.1:5003/reddalert-33f83/us-central1/ingestPosts',
    production: 'https://us-central1-reddalert-33f83.cloudfunctions.net/ingestPosts',
  },
  pollInterval: 5 * 60 * 1000, // 5 minutes
};

// All available subreddits to monitor
const ALL_SUBREDDITS = [
  'Catan',
  'SettlersofCatan',
  'CatanUniverse',
  'Colonist',
  'twosheep',
  'boardgames',
  'tabletopgaming',
];

// Parse command line arguments
const useProduction = process.argv.includes('--production');
const endpoint = useProduction ? CONFIG.endpoints.production : CONFIG.endpoints.emulator;

/**
 * Fetch posts from a subreddit's RSS feed
 */
async function fetchSubredditPosts(subreddit) {
  const feedUrl = `https://www.reddit.com/r/${subreddit}/new.rss`;
  const feed = await parser.parseURL(feedUrl);

  return feed.items.map((item) => ({
    redditId: item.id || item.guid || item.link,
    title: item.title || '',
    url: item.link || '',
    permalink: item.link || '',
    author: (item.author || item.creator || '').replace('/u/', ''),
    subreddit: subreddit,
    content: item.contentSnippet || item.content || '',
    createdAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
  }));
}

/**
 * POST posts to Firebase ingestPosts endpoint
 */
async function sendToFirebase(posts) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': CONFIG.apiKey,
    },
    body: JSON.stringify({
      posts,
      apiKey: CONFIG.apiKey,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Main function: fetch all feeds and send to Firebase
 */
async function checkRedditFeeds() {
  console.log(`\n[${new Date().toISOString()}] Checking Reddit feeds...`);
  const startTime = Date.now();

  const allPosts = [];

  for (const subreddit of ALL_SUBREDDITS) {
    try {
      const posts = await fetchSubredditPosts(subreddit);
      console.log(`  r/${subreddit}: ${posts.length} posts`);
      allPosts.push(...posts);
    } catch (error) {
      console.error(`  r/${subreddit}: Error - ${error.message}`);
    }
  }

  if (allPosts.length > 0) {
    try {
      const result = await sendToFirebase(allPosts);
      console.log(`  Sent to Firebase: ${result.added} new, ${result.total} total`);
    } catch (error) {
      console.error(`  Firebase error: ${error.message}`);
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`  Complete in ${duration}s`);
}

/**
 * Start the scheduler
 */
function startScheduler() {
  console.log('===========================================');
  console.log('Reddalert Local Scheduler');
  console.log('===========================================');
  console.log('');
  console.log(`Mode: ${useProduction ? 'PRODUCTION' : 'EMULATOR'}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Poll interval: ${CONFIG.pollInterval / 1000}s`);
  console.log('');
  console.log('Monitored subreddits:');
  ALL_SUBREDDITS.forEach(sub => console.log(`  - r/${sub}`));
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('-------------------------------------------');

  // Run immediately on start
  checkRedditFeeds();

  // Set up interval
  const interval = setInterval(checkRedditFeeds, CONFIG.pollInterval);

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n\nShutting down scheduler...');
    clearInterval(interval);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// Start
startScheduler();
