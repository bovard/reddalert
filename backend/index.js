const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore, Timestamp, FieldValue } = require("firebase-admin/firestore");
const Parser = require("rss-parser");

admin.initializeApp();

const db = getFirestore();
const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  },
});

// All available subreddits to monitor
const ALL_SUBREDDITS = [
  "Catan",
  "SettlersofCatan",
  "CatanUniverse",
  "Colonist",
  "twosheep",
  "boardgames",
  "tabletopgaming",
];

/**
 * Scheduled function that runs every 15 minutes to check Reddit RSS feeds
 * and save new posts to the shared posts collection.
 */
exports.checkRedditFeeds = onSchedule("every 15 minutes", async (event) => {
    console.log("Starting Reddit feed check...");

    try {
      let totalAdded = 0;

      for (const subreddit of ALL_SUBREDDITS) {
        try {
          const posts = await fetchSubredditPosts(subreddit);
          console.log(`Fetched ${posts.length} posts from r/${subreddit}`);

          // Save posts to shared collection
          for (const post of posts) {
            const postRef = db.collection("posts").doc(post.redditId);
            const existing = await postRef.get();

            if (!existing.exists) {
              await postRef.set({
                ...post,
                createdAt: Timestamp.fromDate(post.createdAt),
                fetchedAt: FieldValue.serverTimestamp(),
              });
              totalAdded++;
            }
          }
        } catch (error) {
          console.error(`Error fetching r/${subreddit}:`, error.message);
        }
      }

      console.log(`Feed check complete. Added ${totalAdded} new posts.`);
      return null;
    } catch (error) {
      console.error("Error in checkRedditFeeds:", error);
      throw error;
    }
  });

/**
 * Fetch posts from a subreddit's RSS feed
 */
async function fetchSubredditPosts(subreddit) {
  const feedUrl = `https://www.reddit.com/r/${subreddit}/new.rss`;
  const feed = await parser.parseURL(feedUrl);

  return feed.items.map((item) => ({
    redditId: item.id || item.guid || item.link,
    title: item.title || "",
    url: item.link || "",
    permalink: item.link || "",
    author: (item.author || item.creator || "").replace("/u/", ""),
    subreddit: subreddit,
    content: item.contentSnippet || item.content || "",
    createdAt: item.pubDate ? new Date(item.pubDate) : new Date(),
  }));
}

/**
 * Callable function to fetch detailed post information from Reddit
 * We keep this as a function because of CORS issues when calling Reddit API from browser
 * Results are cached indefinitely in a shared 'posts' collection.
 * Pass forceRefresh: true to fetch fresh data.
 */
exports.getPostDetails = onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { subreddit, postId, forceRefresh } = request.data;

  if (!subreddit || !postId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Subreddit and postId are required"
    );
  }

  // Check if we already have cached details
  const cacheRef = db.collection("posts").doc(postId);
  const cachedDoc = await cacheRef.get();

  if (cachedDoc.exists && !forceRefresh) {
    console.log(`Returning cached details for post ${postId}`);
    return cachedDoc.data();
  }

  // Fetch fresh data from Reddit
  console.log(`Fetching details for r/${subreddit}/comments/${postId}`);

  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
      }
    );

    if (!response.ok) {
      throw new functions.https.HttpsError(
        "unavailable",
        `Reddit returned ${response.status}`
      );
    }

    const jsonData = await response.json();

    if (!jsonData || !jsonData[0] || !jsonData[0].data || !jsonData[0].data.children[0]) {
      throw new functions.https.HttpsError("not-found", "Post not found on Reddit");
    }

    const postData = jsonData[0].data.children[0].data;

    // Extract the details we care about
    const details = {
      redditId: postId,
      subreddit: postData.subreddit,
      title: postData.title,
      author: postData.author,
      score: postData.score,
      upvoteRatio: postData.upvote_ratio,
      numComments: postData.num_comments,
      permalink: postData.permalink,
      url: postData.url,
      selftext: postData.selftext || null,
      thumbnail: postData.thumbnail !== "self" && postData.thumbnail !== "default"
        ? postData.thumbnail
        : null,
      flair: postData.link_flair_text || null,
      isVideo: postData.is_video || false,
      createdUtc: postData.created_utc,
      fetchedAt: FieldValue.serverTimestamp(),
    };

    // Cache the details
    await cacheRef.set(details);

    console.log(`Cached details for post ${postId}: ${details.score} upvotes, ${details.numComments} comments`);

    return details;
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error(`Error fetching post details:`, error);
    throw new functions.https.HttpsError("internal", "Failed to fetch post details");
  }
});

/**
 * Optional: Cleanup function - remove posts older than 30 days from shared collection
 * and clean up orphaned postStatus documents
 * Runs daily at midnight
 */
exports.cleanupOldPosts = onSchedule("every day 00:00", async (event) => {
    console.log("Starting cleanup of old posts...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Delete old posts from shared collection
    const oldPostsQuery = await db
      .collection("posts")
      .where("fetchedAt", "<", Timestamp.fromDate(thirtyDaysAgo))
      .get();

    const deletedPostIds = new Set();
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of oldPostsQuery.docs) {
      batch.delete(doc.ref);
      deletedPostIds.add(doc.id);
      batchCount++;

      // Firestore batches are limited to 500 operations
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`Deleted ${deletedPostIds.size} old posts from shared collection`);

    // Clean up postStatus documents for deleted posts
    if (deletedPostIds.size > 0) {
      const usersSnapshot = await db.collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const statusBatch = db.batch();
        let statusDeleteCount = 0;

        for (const postId of deletedPostIds) {
          const statusRef = db
            .collection("users")
            .doc(userDoc.id)
            .collection("postStatus")
            .doc(postId);
          statusBatch.delete(statusRef);
          statusDeleteCount++;

          if (statusDeleteCount >= 400) {
            await statusBatch.commit();
            statusDeleteCount = 0;
          }
        }

        if (statusDeleteCount > 0) {
          await statusBatch.commit();
        }
      }

      console.log("Cleaned up user postStatus documents");
    }

    console.log("Cleanup complete");
    return null;
  });