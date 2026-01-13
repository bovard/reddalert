# Reddalert

A Reddit monitoring app that sends push notifications when specific topics are discussed in your favorite subreddits.

## Architecture

```
reddalert/
├── app/              # Flutter app (Android & iOS)
│   └── lib/
│       ├── main.dart
│       ├── models/   # Data models
│       ├── screens/  # UI screens
│       ├── services/ # Firebase services
│       └── widgets/  # Reusable widgets
└── backend/          # Firebase Cloud Functions
    └── index.js      # RSS polling & notification logic
```

## Features

- Monitor multiple subreddits
- Set custom keywords for each monitor
- Push notifications when keywords are detected
- Toggle monitors on/off
- Works on Android and iOS

## How It Works

1. Cloud Functions run every 15 minutes
2. Fetches RSS feeds from monitored subreddits
3. Searches post titles and content for keywords
4. Sends push notifications for new matches
5. Tracks seen posts to avoid duplicate notifications

## Setup

### Prerequisites

- Flutter SDK
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Blaze plan

### 1. Configure Firebase

```bash
cd app
flutterfire configure
```

Select your Firebase project and enable Android/iOS.

### 2. Deploy Cloud Functions

```bash
cd backend
firebase login
firebase init functions  # Select your project
firebase deploy --only functions
```

### 3. Run the App

```bash
cd app
flutter run
```

## Firestore Structure

```
users/
  {userId}/
    fcmTokens: string[]
    updatedAt: timestamp

monitors/
  {monitorId}/
    userId: string
    subreddit: string
    keywords: string[]
    active: boolean
    createdAt: timestamp
    seenPosts/
      {postId}/
        postId: string
        title: string
        seenAt: timestamp
```

## Limitations

- RSS feeds only include ~25 most recent posts
- Polling interval is 15 minutes (not real-time)
- Cannot monitor comments, only posts
- Private subreddits are not accessible

## License

MIT
