/**
 * Local Scheduler for Reddalert Firebase Scheduled Functions
 *
 * This script simulates the scheduled Cloud Functions locally for testing.
 * Run this alongside the Firebase emulators to test the Reddit feed polling.
 *
 * Usage:
 *   1. Start Firebase emulators: npm run firebase
 *   2. In another terminal: npm run scheduler
 */

const admin = require('firebase-admin');
const Parser = require('rss-parser');

// Configure emulator connections
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize Firebase Admin with emulator settings
admin.initializeApp({
  projectId: 'reddalert-local',
});

const db = admin.firestore();
const parser = new Parser();

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

// Keywords for each filter type
const FILTER_KEYWORDS = {
  catan: ['catan', 'settler', 'settlers', 'catanuniverse', 'catan universe'],
  twosheep: ['twosheep', 'two sheep', '2sheep', '2 sheep'],
};

/**
 * Check if post matches a filter
 */
function postMatchesFilter(post, filterType, customKeywords = []) {
  if (filterType === 'all') return true;
  if (filterType === 'none') return false;

  const searchText = `${post.title} ${post.content}`.toLowerCase();

  if (filterType === 'custom') {
    return customKeywords.some((kw) => searchText.includes(kw.toLowerCase()));
  }

  const keywords = FILTER_KEYWORDS[filterType] || [];
  return keywords.some((kw) => searchText.includes(kw.toLowerCase()));
}

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
    author: (item.author || item.creator || '').replace('/u/', ''),
    subreddit: subreddit,
    content: item.contentSnippet || item.content || '',
    redditCreatedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
  }));
}

/**
 * Process posts for a single user based on their subscriptions
 */
async function processUserPosts(userId, postsBySubreddit) {
  // Get user's subscriptions
  const subscriptionsSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('subscriptions')
    .where('enabled', '==', true)
    .get();

  if (subscriptionsSnapshot.empty) {
    console.log(`  No enabled subscriptions for user ${userId}`);
    return;
  }

  const userPostsRef = db.collection('users').doc(userId).collection('posts');
  let addedCount = 0;

  for (const subDoc of subscriptionsSnapshot.docs) {
    const subscription = subDoc.data();
    const subreddit = subDoc.id.toLowerCase();
    const posts = postsBySubreddit[subreddit] || [];

    for (const post of posts) {
      // Check if post matches show filter
      const shouldShow = postMatchesFilter(
        post,
        subscription.showFilter,
        subscription.customKeywords
      );

      if (!shouldShow) continue;

      // Check if post already exists
      const existingQuery = await userPostsRef
        .where('redditId', '==', post.redditId)
        .limit(1)
        .get();

      if (existingQuery.empty) {
        // Add post to user's queue
        await userPostsRef.add({
          ...post,
          redditCreatedAt: admin.firestore.Timestamp.fromDate(post.redditCreatedAt),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'new',
          statusUpdatedAt: null,
        });
        addedCount++;
      }
    }
  }

  if (addedCount > 0) {
    console.log(`  Added ${addedCount} new posts for user ${userId}`);
  }
}

/**
 * Main scheduled function: Check Reddit feeds
 */
async function checkRedditFeeds() {
  console.log('\n[checkRedditFeeds] Starting Reddit feed check...');
  const startTime = Date.now();

  try {
    // Fetch posts from all subreddits
    const postsBySubreddit = {};

    for (const subreddit of ALL_SUBREDDITS) {
      try {
        const posts = await fetchSubredditPosts(subreddit);
        postsBySubreddit[subreddit.toLowerCase()] = posts;
        console.log(`  Fetched ${posts.length} posts from r/${subreddit}`);
      } catch (error) {
        console.error(`  Error fetching r/${subreddit}:`, error.message);
      }
    }

    // Get all users
    const usersSnapshot = await db.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('  No users found');
      return;
    }

    console.log(`  Processing posts for ${usersSnapshot.size} users`);

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      await processUserPosts(userDoc.id, postsBySubreddit);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[checkRedditFeeds] Complete in ${duration}s`);
  } catch (error) {
    console.error('[checkRedditFeeds] Error:', error);
  }
}

/**
 * Cleanup old posts (normally runs daily)
 */
async function cleanupOldPosts() {
  console.log('\n[cleanupOldPosts] Starting cleanup...');

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersSnapshot = await db.collection('users').get();
    let totalDeleted = 0;

    for (const userDoc of usersSnapshot.docs) {
      const oldPostsQuery = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('posts')
        .where('createdAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();

      const batch = db.batch();
      let deleteCount = 0;

      oldPostsQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
      });

      if (deleteCount > 0) {
        await batch.commit();
        totalDeleted += deleteCount;
      }
    }

    console.log(`[cleanupOldPosts] Deleted ${totalDeleted} old posts`);
  } catch (error) {
    console.error('[cleanupOldPosts] Error:', error);
  }
}

// Schedule configuration (faster intervals for local testing)
const SCHEDULE = {
  checkRedditFeeds: 60 * 1000,    // Every 60 seconds (prod: 15 minutes)
  cleanupOldPosts: 5 * 60 * 1000, // Every 5 minutes (prod: daily)
};

// Keep track of intervals for cleanup
const intervals = [];

/**
 * Start the scheduler
 */
function startScheduler() {
  console.log('===========================================');
  console.log('Reddalert Local Scheduler');
  console.log('===========================================');
  console.log('');
  console.log('Connecting to Firebase emulators:');
  console.log(`  Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  console.log(`  Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
  console.log('');
  console.log('Schedule:');
  console.log(`  - Reddit feed check: every ${SCHEDULE.checkRedditFeeds / 1000}s`);
  console.log(`  - Cleanup old posts: every ${SCHEDULE.cleanupOldPosts / 1000}s`);
  console.log('');
  console.log('Monitored subreddits:');
  ALL_SUBREDDITS.forEach(sub => console.log(`  - r/${sub}`));
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('-------------------------------------------');

  // Run immediately on start
  checkRedditFeeds();

  // Set up intervals
  intervals.push(
    setInterval(checkRedditFeeds, SCHEDULE.checkRedditFeeds)
  );

  intervals.push(
    setInterval(cleanupOldPosts, SCHEDULE.cleanupOldPosts)
  );
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('\n\nShutting down scheduler...');
  intervals.forEach(clearInterval);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the scheduler
startScheduler();
