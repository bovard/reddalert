# Reddalert

A post queue app for Catan subreddits. Stay on top of discussions, take action, and track your engagement.

## Platforms

- Web (React + TypeScript, Firebase Hosting)

## Monitored Subreddits

| Category | Subreddits | Default Filter |
|----------|------------|----------------|
| Catan Core | Catan, SettlersofCatan, CatanUniverse | All posts |
| Online Platforms | Colonist, twosheep | All posts |
| Board Games | boardgames, tabletopgaming | Catan mentions only |

## Features

- **Google Sign-In** - Authenticate with your Gmail account
- **Configurable Subscriptions** - Choose which subreddits to monitor
- **Filter Options** - All posts, Catan mentions, TwoSheep mentions, or None
- **Push Notifications** - Get notified for posts matching your criteria
- **Post Queue** - New posts appear in your queue
- **Swipe Actions** - Swipe left to dismiss, swipe right to mark as done
- **Open in Reddit** - Tap a post to open it in Reddit and comment
- **History** - View all posts you've marked as done

## Local Development

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)

### Quick Start

```bash
# Install dependencies
npm install
cd app && npm install && cd ..
cd backend && npm install && cd ..

# Terminal 1: Start Firebase emulators
npm run firebase

# Terminal 2: Seed a test user (run once)
node scripts/seedTestUser.js

# Terminal 2: Start the local scheduler
npm run scheduler

# Terminal 3: Run React app
cd app && npm run dev
```

### Local Development Scripts

| Script | Description |
|--------|-------------|
| `npm run firebase` | Start Firebase emulators |
| `npm run firebase:kill` | Kill all emulator processes |
| `npm run firebase:restart` | Kill and restart emulators |
| `npm run scheduler` | Run the scheduled function locally |
| `node scripts/seedTestUser.js` | Create a test user in emulators |

### Emulator URLs

| Service | URL |
|---------|-----|
| Emulator UI | http://localhost:4000 |
| Firestore | http://localhost:8080 |
| Auth | http://localhost:9099 |
| Functions | http://localhost:5001 |
| Hosting | http://localhost:5000 |

### How Local Development Works

1. **Firebase Emulators** provide local Firestore, Auth, and Functions
2. **Local Scheduler** (`scripts/localScheduler.js`) simulates the scheduled Cloud Function that polls Reddit RSS feeds
3. **Seed Script** creates a test user with default subscriptions
4. **React App** connects to emulators via environment configuration

The scheduler runs every 60 seconds locally (vs 15 minutes in production) for faster testing.

## Production Setup

### Prerequisites

- Firebase project with Blaze plan
- Node.js 18+
- Firebase CLI

### 1. Configure Firebase

```bash
# Login to Firebase
firebase login
```

Create `app/.env` with your Firebase configuration (see app/README.md).

### 2. Enable Google Sign-In

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable Google provider
3. Add your OAuth client IDs for Android/iOS/Web

### 3. Deploy

```bash
# Deploy everything
npm run deploy

# Or deploy individually
npm run deploy:functions
npm run deploy:hosting
```

## Architecture

```
reddalert/
├── app/                    # React + TypeScript app (Vite)
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── hooks/          # Custom React hooks
│       ├── pages/          # Page components
│       ├── lib/            # Firebase configuration
│       └── types/          # TypeScript types
├── backend/                # Firebase Cloud Functions
│   └── index.js            # RSS polling & post distribution
├── scripts/                # Local development scripts
│   ├── localScheduler.js   # Simulates scheduled functions locally
│   └── seedTestUser.js     # Creates test user in emulators
├── firebase.json           # Firebase configuration
├── firestore.rules         # Firestore security rules
└── firestore.indexes.json  # Firestore indexes
```

## Firestore Structure

```
users/
  {userId}/
    email: string
    displayName: string
    photoURL: string
    createdAt: timestamp
    fcmTokens: string[]

    subscriptions/
      {subreddit}/
        showFilter: "all" | "catan" | "twosheep" | "custom" | "none"
        notifyFilter: "all" | "catan" | "twosheep" | "custom" | "none"
        customKeywords: string[]
        enabled: boolean

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
| `checkRedditFeeds` | Every 15 min | Polls RSS feeds, adds posts based on user subscriptions |
| `onUserCreate` | Auth | Creates user doc with default subscriptions |
| `updatePostStatus` | Callable | Updates post status (new/dismissed/done) |
| `restorePost` | Callable | Restores post to "new" status |
| `cleanupOldPosts` | Daily | Removes posts older than 30 days |
| `saveFcmToken` | Callable | Saves FCM token for push notifications |
| `manualCheck` | HTTP | Manually trigger feed check (for testing) |

## Limitations

- RSS feeds only include ~25 most recent posts per subreddit
- Polling interval is 15 minutes (not real-time)
- Cannot monitor comments, only posts
- Private subreddits are not accessible

## License

MIT
