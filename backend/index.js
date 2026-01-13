const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Parser = require("rss-parser");

admin.initializeApp();

const db = admin.firestore();
const parser = new Parser();

// Subreddits to monitor
const SUBREDDITS = [
  "Catan",
  "SettlersofCatan",
  "CatanUniverse",
  "Colonist",
  "twosheep",
];

/**
 * Scheduled function that runs every 15 minutes to check Reddit RSS feeds
 * and add new posts to all users' queues.
 */
exports.checkRedditFeeds = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async (context) => {
    console.log("Starting Reddit feed check...");

    try {
      // Fetch posts from all subreddits
      const allPosts = [];

      for (const subreddit of SUBREDDITS) {
        try {
          const posts = await fetchSubredditPosts(subreddit);
          allPosts.push(...posts);
          console.log(`Fetched ${posts.length} posts from r/${subreddit}`);
        } catch (error) {
          console.error(`Error fetching r/${subreddit}:`, error.message);
        }
      }

      if (allPosts.length === 0) {
        console.log("No posts fetched");
        return null;
      }

      // Get all users
      const usersSnapshot = await db.collection("users").get();

      if (usersSnapshot.empty) {
        console.log("No users found");
        return null;
      }

      console.log(`Processing ${allPosts.length} posts for ${usersSnapshot.size} users`);

      // Add new posts to each user's queue
      for (const userDoc of usersSnapshot.docs) {
        await addPostsToUserQueue(userDoc.id, allPosts);
      }

      console.log("Feed check complete");
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
    author: (item.author || item.creator || "").replace("/u/", ""),
    subreddit: subreddit,
    content: item.contentSnippet || item.content || "",
    redditCreatedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
  }));
}

/**
 * Add new posts to a user's queue (skip already seen posts)
 */
async function addPostsToUserQueue(userId, posts) {
  const userPostsRef = db.collection("users").doc(userId).collection("posts");

  let addedCount = 0;

  for (const post of posts) {
    // Check if post already exists for this user (by redditId)
    const existingQuery = await userPostsRef
      .where("redditId", "==", post.redditId)
      .limit(1)
      .get();

    if (existingQuery.empty) {
      // Add new post to user's queue
      await userPostsRef.add({
        ...post,
        redditCreatedAt: admin.firestore.Timestamp.fromDate(post.redditCreatedAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "new",
        statusUpdatedAt: null,
      });
      addedCount++;
    }
  }

  if (addedCount > 0) {
    console.log(`Added ${addedCount} new posts for user ${userId}`);
  }
}

/**
 * HTTP endpoint to manually trigger a feed check (for testing)
 */
exports.manualCheck = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    // Run the feed check
    console.log("Manual feed check triggered");

    const allPosts = [];

    for (const subreddit of SUBREDDITS) {
      try {
        const posts = await fetchSubredditPosts(subreddit);
        allPosts.push(...posts);
      } catch (error) {
        console.error(`Error fetching r/${subreddit}:`, error.message);
      }
    }

    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      await addPostsToUserQueue(userDoc.id, allPosts);
    }

    res.status(200).json({
      success: true,
      message: "Feed check completed",
      postsFound: allPosts.length,
      usersProcessed: usersSnapshot.size,
    });
  } catch (error) {
    console.error("Manual check error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Callable function to update post status
 */
exports.updatePostStatus = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { postId, status } = data;

  if (!postId || !status) {
    throw new functions.https.HttpsError("invalid-argument", "Post ID and status are required");
  }

  if (!["new", "dismissed", "done"].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid status value");
  }

  const postRef = db
    .collection("users")
    .doc(context.auth.uid)
    .collection("posts")
    .doc(postId);

  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Post not found");
  }

  await postRef.update({
    status: status,
    statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, postId, status };
});

/**
 * Callable function to restore a dismissed post to new status
 */
exports.restorePost = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { postId } = data;

  if (!postId) {
    throw new functions.https.HttpsError("invalid-argument", "Post ID is required");
  }

  const postRef = db
    .collection("users")
    .doc(context.auth.uid)
    .collection("posts")
    .doc(postId);

  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Post not found");
  }

  await postRef.update({
    status: "new",
    statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, postId };
});

/**
 * Trigger when a new user signs up - creates user document
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  console.log(`New user created: ${user.uid} (${user.email})`);

  // Create user document
  await db.collection("users").doc(user.uid).set({
    email: user.email,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Fetch current posts and add to their queue immediately
  console.log(`Fetching initial posts for new user ${user.uid}`);

  const allPosts = [];

  for (const subreddit of SUBREDDITS) {
    try {
      const posts = await fetchSubredditPosts(subreddit);
      allPosts.push(...posts);
    } catch (error) {
      console.error(`Error fetching r/${subreddit}:`, error.message);
    }
  }

  await addPostsToUserQueue(user.uid, allPosts);

  console.log(`Added ${allPosts.length} initial posts for new user ${user.uid}`);
});

/**
 * Cleanup function - remove posts older than 30 days
 * Runs daily at midnight
 */
exports.cleanupOldPosts = functions.pubsub
  .schedule("every day 00:00")
  .onRun(async (context) => {
    console.log("Starting cleanup of old posts...");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const oldPostsQuery = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("posts")
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();

      const batch = db.batch();
      let deleteCount = 0;

      oldPostsQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
      });

      if (deleteCount > 0) {
        await batch.commit();
        console.log(`Deleted ${deleteCount} old posts for user ${userDoc.id}`);
      }
    }

    console.log("Cleanup complete");
    return null;
  });
