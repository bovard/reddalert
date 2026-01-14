// Post statuses:
// - new: Just discovered, waiting for action
// - dismissed: User doesn't want to respond
// - responded: User has responded to this post
export type PostStatus = 'new' | 'dismissed' | 'responded';

export interface Post {
  id: string;
  redditId: string;
  subreddit: string;
  title: string;
  author: string;
  url: string;
  permalink: string;
  createdAt: Date;
  fetchedAt: Date;
  status: PostStatus;
  statusUpdatedAt?: Date;
  respondedAt?: Date;
}

// Detailed post info fetched from Reddit API (cached in shared posts collection)
export interface PostDetails {
  redditId: string;
  subreddit: string;
  title: string;
  author: string;
  score: number;
  upvoteRatio: number;
  numComments: number;
  permalink: string;
  url: string;
  selftext: string | null;
  thumbnail: string | null;
  flair: string | null;
  isVideo: boolean;
  createdUtc: number;
}

export type FilterType = 'all' | 'catan' | 'twosheep' | 'custom' | 'none';

export interface Subscription {
  subreddit: string;
  showFilter: FilterType;
  notifyFilter: FilterType;
  customKeywords?: string[];
}

export interface UserSettings {
  subscriptions: Subscription[];
}

export const SUBREDDITS = {
  catan: [
    { name: 'Catan', defaultFilter: 'all' as FilterType },
    { name: 'SettlersofCatan', defaultFilter: 'all' as FilterType },
    { name: 'CatanUniverse', defaultFilter: 'all' as FilterType },
  ],
  digital: [
    { name: 'Colonist', defaultFilter: 'all' as FilterType },
    { name: 'twosheep', defaultFilter: 'all' as FilterType },
  ],
  general: [
    { name: 'boardgames', defaultFilter: 'catan' as FilterType },
    { name: 'tabletopgaming', defaultFilter: 'catan' as FilterType },
  ],
} as const;

export const DEFAULT_SUBSCRIPTIONS: Subscription[] = [
  // Catan subreddits - all posts
  { subreddit: 'Catan', showFilter: 'all', notifyFilter: 'none' },
  { subreddit: 'SettlersofCatan', showFilter: 'all', notifyFilter: 'none' },
  { subreddit: 'CatanUniverse', showFilter: 'all', notifyFilter: 'none' },
  // Digital platforms - all posts
  { subreddit: 'Colonist', showFilter: 'all', notifyFilter: 'none' },
  { subreddit: 'twosheep', showFilter: 'all', notifyFilter: 'none' },
  // General boardgame subreddits - only Catan mentions
  { subreddit: 'boardgames', showFilter: 'catan', notifyFilter: 'none' },
  { subreddit: 'tabletopgaming', showFilter: 'catan', notifyFilter: 'none' },
];
