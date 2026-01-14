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
  projectId: 'reddalert-33f83',
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
    createdAt: item.pubDate ? new Date(item.pubDate) : new Date(),
  }));
}

/**
 * Main scheduled function: Check Reddit feeds and save to shared collection
 */
async function checkRedditFeeds() {
  console.log('\n[checkRedditFeeds] Starting Reddit feed check...');
  const startTime = Date.now();

  try {
    let totalAdded = 0;

    for (const subreddit of ALL_SUBREDDITS) {
      try {
        const posts = await fetchSubredditPosts(subreddit);
        console.log(`  Fetched ${posts.length} posts from r/${subreddit}`);

        // Save posts to shared collection
        for (const post of posts) {
          const postRef = db.collection('posts').doc(post.redditId);
          const existing = await postRef.get();

          if (!existing.exists) {
            await postRef.set({
              ...post,
              createdAt: admin.firestore.Timestamp.fromDate(post.createdAt),
              fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            totalAdded++;
          }
        }
      } catch (error) {
        console.error(`  Error fetching r/${subreddit}:`, error.message);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[checkRedditFeeds] Complete in ${duration}s. Added ${totalAdded} new posts.`);
  } catch (error) {
    console.error('[checkRedditFeeds] Error:', error);
  }
}

/**
 * Cleanup old posts from shared collection (normally runs daily)
 */
async function cleanupOldPosts() {
  console.log('\n[cleanupOldPosts] Starting cleanup...');

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete old posts from shared collection
    const oldPostsQuery = await db
      .collection('posts')
      .where('fetchedAt', '<', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .get();

    const deletedPostIds = [];
    const batch = db.batch();

    oldPostsQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
      deletedPostIds.push(doc.id);
    });

    if (deletedPostIds.length > 0) {
      await batch.commit();
      console.log(`  Deleted ${deletedPostIds.length} old posts from shared collection`);

      // Clean up postStatus documents for deleted posts
      const usersSnapshot = await db.collection('users').get();

      for (const userDoc of usersSnapshot.docs) {
        const statusBatch = db.batch();
        let statusDeleteCount = 0;

        for (const postId of deletedPostIds) {
          const statusRef = db
            .collection('users')
            .doc(userDoc.id)
            .collection('postStatus')
            .doc(postId);
          statusBatch.delete(statusRef);
          statusDeleteCount++;
        }

        if (statusDeleteCount > 0) {
          await statusBatch.commit();
        }
      }

      console.log('  Cleaned up user postStatus documents');
    } else {
      console.log('  No old posts to delete');
    }

    console.log('[cleanupOldPosts] Complete');
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
  console.log('Posts are saved to shared collection (no per-user duplication)');
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
