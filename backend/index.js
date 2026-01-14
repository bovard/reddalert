const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Parser = require("rss-parser");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const parser = new Parser();

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

// Default subscriptions for new users
const DEFAULT_SUBSCRIPTIONS = {
  catan: { showFilter: "all", notifyFilter: "none", enabled: true },
  settlersofcatan: { showFilter: "all", notifyFilter: "none", enabled: true },
  catanuniverse: { showFilter: "all", notifyFilter: "none", enabled: true },
  colonist: { showFilter: "all", notifyFilter: "none", enabled: true },
  twosheep: { showFilter: "all", notifyFilter: "none", enabled: true },
  boardgames: { showFilter: "catan", notifyFilter: "none", enabled: true },
  tabletopgaming: { showFilter: "catan", notifyFilter: "none", enabled: true },
};

// Keywords for each filter type
const FILTER_KEYWORDS = {
  catan: ["catan", "settler", "settlers", "catanuniverse", "catan universe"],
  twosheep: ["twosheep", "two sheep", "2sheep", "2 sheep"],
};

/**
 * Check if post matches a filter
 */
function postMatchesFilter(post, filterType, customKeywords = []) {
  if (filterType === "all") return true;
  if (filterType === "none") return false;

  const searchText = `${post.title} ${post.content}`.toLowerCase();

  if (filterType === "custom") {
    return customKeywords.some((kw) => searchText.includes(kw.toLowerCase()));
  }

  const keywords = FILTER_KEYWORDS[filterType] || [];
  return keywords.some((kw) => searchText.includes(kw.toLowerCase()));
}

/**
 * Scheduled function that runs every 15 minutes to check Reddit RSS feeds
 * and add new posts to users' queues based on their subscriptions.
 */
exports.checkRedditFeeds = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async (context) => {
    console.log("Starting Reddit feed check...");

    try {
      // Fetch posts from all subreddits
      const postsBySubreddit = {};

      for (const subreddit of ALL_SUBREDDITS) {
        try {
          const posts = await fetchSubredditPosts(subreddit);
          postsBySubreddit[subreddit.toLowerCase()] = posts;
          console.log(`Fetched ${posts.length} posts from r/${subreddit}`);
        } catch (error) {
          console.error(`Error fetching r/${subreddit}:`, error.message);
        }
      }

      // Get all users
      const usersSnapshot = await db.collection("users").get();

      if (usersSnapshot.empty) {
        console.log("No users found");
        return null;
      }

      console.log(`Processing posts for ${usersSnapshot.size} users`);

      // Process each user
      for (const userDoc of usersSnapshot.docs) {
        await processUserPosts(userDoc.id, postsBySubreddit);
      }

      console.log("Feed check complete");
      return null;
    } catch (error) {
      console.error("Error in checkRedditFeeds:", error);
      throw error;
    }
  });

/**
 * Process posts for a single user based on their subscriptions
 */
async function processUserPosts(userId, postsBySubreddit) {
  // Get user's subscriptions from settings document
  const settingsDoc = await db
    .collection("users")
    .doc(userId)
    .collection("settings")
    .doc("subscriptions")
    .get();

  let subscriptions = [];
  if (settingsDoc.exists) {
    subscriptions = settingsDoc.data().subscriptions || [];
  } else {
    // Use default subscriptions if none set
    subscriptions = [
      { subreddit: "Catan", showFilter: "all", notifyFilter: "none" },
      { subreddit: "SettlersofCatan", showFilter: "all", notifyFilter: "none" },
      { subreddit: "CatanUniverse", showFilter: "all", notifyFilter: "none" },
      { subreddit: "Colonist", showFilter: "all", notifyFilter: "none" },
      { subreddit: "twosheep", showFilter: "all", notifyFilter: "none" },
      { subreddit: "boardgames", showFilter: "catan", notifyFilter: "none" },
      { subreddit: "tabletopgaming", showFilter: "catan", notifyFilter: "none" },
    ];
  }

  if (subscriptions.length === 0) {
    console.log(`No subscriptions for user ${userId}`);
    return;
  }

  const userPostsRef = db.collection("users").doc(userId).collection("posts");
  let addedCount = 0;
  const notificationsToSend = [];

  for (const subscription of subscriptions) {
    const subreddit = subscription.subreddit.toLowerCase();
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
        .where("redditId", "==", post.redditId)
        .limit(1)
        .get();

      if (existingQuery.empty) {
        // Add post to user's queue
        await userPostsRef.add({
          ...post,
          redditCreatedAt: admin.firestore.Timestamp.fromDate(post.redditCreatedAt),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: "new",
          statusUpdatedAt: null,
        });
        addedCount++;

        // Check if we should send notification
        const shouldNotify = postMatchesFilter(
          post,
          subscription.notifyFilter,
          subscription.customKeywords
        );

        if (shouldNotify) {
          notificationsToSend.push({
            userId,
            post,
            subreddit: post.subreddit,
          });
        }
      }
    }
  }

  if (addedCount > 0) {
    console.log(`Added ${addedCount} new posts for user ${userId}`);
  }

  // Send notifications
  if (notificationsToSend.length > 0) {
    await sendNotifications(userId, notificationsToSend);
  }
}

/**
 * Send push notifications to a user
 */
async function sendNotifications(userId, notifications) {
  // Get user's FCM tokens
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return;

  const userData = userDoc.data();
  const fcmTokens = userData.fcmTokens || [];

  if (fcmTokens.length === 0) {
    console.log(`No FCM tokens for user ${userId}`);
    return;
  }

  for (const notification of notifications) {
    const { post, subreddit } = notification;

    const message = {
      notification: {
        title: `r/${subreddit}`,
        body: truncate(post.title, 100),
      },
      data: {
        postId: post.redditId,
        postUrl: post.url,
        subreddit: subreddit,
      },
    };

    for (const token of fcmTokens) {
      try {
        await messaging.send({ ...message, token });
        console.log(`Notification sent to ${userId}`);
      } catch (error) {
        if (
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token"
        ) {
          await removeInvalidToken(userId, token);
        } else {
          console.error(`Error sending notification:`, error.message);
        }
      }
    }
  }
}

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
 * Remove invalid FCM token from user
 */
async function removeInvalidToken(userId, token) {
  await db
    .collection("users")
    .doc(userId)
    .update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
    });
  console.log(`Removed invalid token for user ${userId}`);
}

/**
 * Truncate string to max length
 */
function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * HTTP endpoint to manually trigger a feed check (for testing)
 */
exports.manualCheck = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    console.log("Manual feed check triggered");

    const postsBySubreddit = {};

    for (const subreddit of ALL_SUBREDDITS) {
      try {
        const posts = await fetchSubredditPosts(subreddit);
        postsBySubreddit[subreddit.toLowerCase()] = posts;
      } catch (error) {
        console.error(`Error fetching r/${subreddit}:`, error.message);
      }
    }

    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      await processUserPosts(userDoc.id, postsBySubreddit);
    }

    res.status(200).json({
      success: true,
      message: "Feed check completed",
      subredditsChecked: Object.keys(postsBySubreddit).length,
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
 * Trigger when a new user signs up - creates user document and default subscriptions
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
  console.log(`New user created: ${user.uid} (${user.email})`);

  // Create user document
  await db.collection("users").doc(user.uid).set({
    email: user.email,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    fcmTokens: [],
  });

  // Create default subscriptions in settings document
  const defaultSubscriptions = [
    { subreddit: "Catan", showFilter: "all", notifyFilter: "none" },
    { subreddit: "SettlersofCatan", showFilter: "all", notifyFilter: "none" },
    { subreddit: "CatanUniverse", showFilter: "all", notifyFilter: "none" },
    { subreddit: "Colonist", showFilter: "all", notifyFilter: "none" },
    { subreddit: "twosheep", showFilter: "all", notifyFilter: "none" },
    { subreddit: "boardgames", showFilter: "catan", notifyFilter: "none" },
    { subreddit: "tabletopgaming", showFilter: "catan", notifyFilter: "none" },
  ];

  await db
    .collection("users")
    .doc(user.uid)
    .collection("settings")
    .doc("subscriptions")
    .set({ subscriptions: defaultSubscriptions });

  console.log(`Created default subscriptions for user ${user.uid}`);

  // Fetch initial posts
  console.log(`Fetching initial posts for new user ${user.uid}`);

  const postsBySubreddit = {};

  for (const subreddit of ALL_SUBREDDITS) {
    try {
      const posts = await fetchSubredditPosts(subreddit);
      postsBySubreddit[subreddit.toLowerCase()] = posts;
    } catch (error) {
      console.error(`Error fetching r/${subreddit}:`, error.message);
    }
  }

  await processUserPosts(user.uid, postsBySubreddit);

  console.log(`Initial posts added for new user ${user.uid}`);
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

/**
 * Callable function to save FCM token
 */
exports.saveFcmToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { token } = data;

  if (!token) {
    throw new functions.https.HttpsError("invalid-argument", "Token is required");
  }

  await db
    .collection("users")
    .doc(context.auth.uid)
    .update({
      fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
    });

  return { success: true };
});

/**
 * Callable function to fetch detailed post information from Reddit
 * Results are cached indefinitely in a shared 'posts' collection.
 * Pass forceRefresh: true to fetch fresh data.
 */
exports.getPostDetails = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { subreddit, postId, forceRefresh } = data;

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
          "User-Agent": "Reddalert/1.0 (Firebase Cloud Function)",
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
      fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
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
