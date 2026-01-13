# Reddalert

A post queue app for Catan subreddits. Stay on top of discussions, take action, and track your engagement.

## Platforms

- Web (Firebase Hosting)
- Android
- iOS

## Monitored Subreddits

- r/Catan
- r/SettlersofCatan
- r/CatanUniverse
- r/Colonist
- r/twosheep

## Features

- **Google Sign-In** - Authenticate with your Gmail account
- **Post Queue** - New posts from Catan subreddits appear in your queue
- **Swipe Actions** - Swipe left to dismiss, swipe right to mark as done
- **Open in Reddit** - Tap a post to open it in Reddit and comment
- **History** - View all posts you've marked as done

## How It Works

1. Sign in with Google
2. Cloud Function runs every 15 minutes, fetching new posts from all subreddits
3. New posts are added to each user's queue in Firestore
4. Open the app to see your queue of new posts
5. Tap to open in Reddit, swipe to dismiss or mark done
6. View your history of completed posts

## Architecture

```
reddalert/
├── app/                    # Flutter app (Web, Android, iOS)
│   └── lib/
│       ├── main.dart       # Entry point with auth wrapper
│       ├── models/         # Data models (Post)
│       ├── screens/        # UI screens (Login, Posts, History)
│       ├── services/       # Firebase services (Auth, Posts)
│       └── widgets/        # Reusable widgets (PostCard)
└── backend/                # Firebase Cloud Functions
    └── index.js            # RSS polling & post distribution
```

## Setup

### Prerequisites

- Flutter SDK
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Blaze plan

### 1. Configure Firebase

```bash
# Login to Firebase
firebase login

# Configure Flutter app
cd app
flutterfire configure
```

Select your Firebase project and enable Android, iOS, and Web.

### 2. Enable Google Sign-In

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Google provider
3. Add your OAuth client IDs for Android/iOS/Web

### 3. Deploy Cloud Functions

```bash
cd backend
firebase deploy --only functions
```

### 4. Deploy Web App

```bash
cd app
flutter build web
firebase deploy --only hosting
```

### 5. Run Mobile App

```bash
cd app
flutter run
```

## Firestore Structure

```
users/
  {userId}/
    email: string
    displayName: string
    photoURL: string
    createdAt: timestamp
    posts/
      {postId}/
        redditId: string
        title: string
        url: string
        author: string
        subreddit: string
        content: string
        redditCreatedAt: timestamp
        createdAt: timestamp
        status: "new" | "dismissed" | "done"
        statusUpdatedAt: timestamp
```

## Cloud Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `checkRedditFeeds` | Every 15 min | Polls RSS feeds, adds new posts to user queues |
| `onUserCreate` | Auth | Creates user doc, populates initial posts |
| `updatePostStatus` | Callable | Updates post status (new/dismissed/done) |
| `restorePost` | Callable | Restores post to "new" status |
| `cleanupOldPosts` | Daily | Removes posts older than 30 days |
| `manualCheck` | HTTP | Manually trigger feed check (for testing) |

## Limitations

- RSS feeds only include ~25 most recent posts per subreddit
- Polling interval is 15 minutes (not real-time)
- Cannot monitor comments, only posts
- Private subreddits are not accessible

## License

MIT
