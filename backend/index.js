const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Parser = require("rss-parser");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();
const parser = new Parser();

/**
 * Scheduled function that runs every 15 minutes to check Reddit RSS feeds
 * for new posts matching configured keywords.
 */
exports.checkRedditFeeds = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async (context) => {
    console.log("Starting Reddit feed check...");

    try {
      // Get all active monitors from Firestore
      const monitorsSnapshot = await db.collection("monitors").where("active", "==", true).get();

      if (monitorsSnapshot.empty) {
        console.log("No active monitors found");
        return null;
      }

      const notifications = [];

      for (const monitorDoc of monitorsSnapshot.docs) {
        const monitor = monitorDoc.data();
        const { subreddit, keywords, userId } = monitor;

        console.log(`Checking r/${subreddit} for keywords: ${keywords.join(", ")}`);

        try {
          const posts = await fetchSubredditPosts(subreddit);
          const matchingPosts = filterPostsByKeywords(posts, keywords);

          // Filter out already seen posts
          const newPosts = await filterSeenPosts(monitorDoc.id, matchingPosts);

          if (newPosts.length > 0) {
            console.log(`Found ${newPosts.length} new matching posts in r/${subreddit}`);

            // Mark posts as seen
            await markPostsAsSeen(monitorDoc.id, newPosts);

            // Queue notifications
            for (const post of newPosts) {
              notifications.push({
                userId,
                subreddit,
                post,
                matchedKeywords: findMatchedKeywords(post, keywords),
              });
            }
          }
        } catch (error) {
          console.error(`Error checking r/${subreddit}:`, error.message);
        }
      }

      // Send all notifications
      await sendNotifications(notifications);

      console.log(`Feed check complete. Sent ${notifications.length} notifications.`);
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
    id: item.id || item.guid,
    title: item.title,
    link: item.link,
    author: item.author || item.creator,
    content: item.contentSnippet || item.content || "",
    pubDate: item.pubDate,
  }));
}

/**
 * Filter posts that contain any of the keywords
 */
function filterPostsByKeywords(posts, keywords) {
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  return posts.filter((post) => {
    const searchText = `${post.title} ${post.content}`.toLowerCase();
    return lowerKeywords.some((keyword) => searchText.includes(keyword));
  });
}

/**
 * Find which keywords matched a post
 */
function findMatchedKeywords(post, keywords) {
  const searchText = `${post.title} ${post.content}`.toLowerCase();
  return keywords.filter((keyword) => searchText.includes(keyword.toLowerCase()));
}

/**
 * Filter out posts we've already seen
 */
async function filterSeenPosts(monitorId, posts) {
  if (posts.length === 0) return [];

  const seenPostsRef = db.collection("monitors").doc(monitorId).collection("seenPosts");

  const newPosts = [];
  for (const post of posts) {
    const postDoc = await seenPostsRef.doc(encodePostId(post.id)).get();
    if (!postDoc.exists) {
      newPosts.push(post);
    }
  }

  return newPosts;
}

/**
 * Mark posts as seen in Firestore
 */
async function markPostsAsSeen(monitorId, posts) {
  const seenPostsRef = db.collection("monitors").doc(monitorId).collection("seenPosts");
  const batch = db.batch();

  for (const post of posts) {
    const docRef = seenPostsRef.doc(encodePostId(post.id));
    batch.set(docRef, {
      postId: post.id,
      title: post.title,
      seenAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * Encode post ID to be Firestore-safe
 */
function encodePostId(postId) {
  return Buffer.from(postId).toString("base64").replace(/[/+=]/g, "_");
}

/**
 * Send push notifications to users
 */
async function sendNotifications(notifications) {
  for (const notification of notifications) {
    const { userId, subreddit, post, matchedKeywords } = notification;

    // Get user's FCM tokens
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found, skipping notification`);
      continue;
    }

    const userData = userDoc.data();
    const fcmTokens = userData.fcmTokens || [];

    if (fcmTokens.length === 0) {
      console.log(`No FCM tokens for user ${userId}`);
      continue;
    }

    const message = {
      notification: {
        title: `r/${subreddit}: ${matchedKeywords.join(", ")}`,
        body: truncate(post.title, 100),
      },
      data: {
        postId: post.id,
        postUrl: post.link,
        subreddit: subreddit,
        keywords: matchedKeywords.join(","),
      },
    };

    // Send to all user's devices
    for (const token of fcmTokens) {
      try {
        await messaging.send({ ...message, token });
        console.log(`Notification sent to ${userId}`);
      } catch (error) {
        if (
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-registration-token"
        ) {
          // Remove invalid token
          await removeInvalidToken(userId, token);
        } else {
          console.error(`Error sending notification:`, error.message);
        }
      }
    }
  }
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
  // Only allow POST requests
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    await exports.checkRedditFeeds.run();
    res.status(200).json({ success: true, message: "Feed check completed" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Callable function to add a new monitor
 */
exports.addMonitor = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { subreddit, keywords } = data;

  if (!subreddit || !keywords || keywords.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Subreddit and keywords are required");
  }

  const monitor = {
    userId: context.auth.uid,
    subreddit: subreddit.toLowerCase().replace(/^r\//, ""),
    keywords: keywords.map((k) => k.toLowerCase().trim()),
    active: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("monitors").add(monitor);

  return { id: docRef.id, ...monitor };
});

/**
 * Callable function to remove a monitor
 */
exports.removeMonitor = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { monitorId } = data;

  if (!monitorId) {
    throw new functions.https.HttpsError("invalid-argument", "Monitor ID is required");
  }

  const monitorRef = db.collection("monitors").doc(monitorId);
  const monitorDoc = await monitorRef.get();

  if (!monitorDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Monitor not found");
  }

  if (monitorDoc.data().userId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized to delete this monitor");
  }

  await monitorRef.delete();

  return { success: true };
});

/**
 * Callable function to toggle monitor active state
 */
exports.toggleMonitor = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const { monitorId, active } = data;

  if (!monitorId || typeof active !== "boolean") {
    throw new functions.https.HttpsError("invalid-argument", "Monitor ID and active state are required");
  }

  const monitorRef = db.collection("monitors").doc(monitorId);
  const monitorDoc = await monitorRef.get();

  if (!monitorDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Monitor not found");
  }

  if (monitorDoc.data().userId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not authorized to modify this monitor");
  }

  await monitorRef.update({ active });

  return { success: true, active };
});
