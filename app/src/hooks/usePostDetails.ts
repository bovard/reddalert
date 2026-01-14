import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import type { PostDetails } from '../types';

interface GetPostDetailsParams {
  subreddit: string;
  postId: string;
  forceRefresh?: boolean;
}

// Extended PostDetails with fetchedAt timestamp
export interface PostDetailsWithTimestamp extends PostDetails {
  fetchedAt?: { _seconds: number; _nanoseconds: number };
}

export function usePostDetails() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subreddit, postId, forceRefresh }: GetPostDetailsParams): Promise<PostDetailsWithTimestamp> => {
      const getPostDetailsFn = httpsCallable<GetPostDetailsParams, PostDetailsWithTimestamp>(
        functions,
        'getPostDetails'
      );
      const result = await getPostDetailsFn({ subreddit, postId, forceRefresh });
      return result.data;
    },
    onSuccess: (data) => {
      // Cache the result by postId
      queryClient.setQueryData(['postDetails', data.redditId], data);
    },
  });
}

// Extract postId from redditId (e.g., "t3_1qc23hj" -> "1qc23hj")
export function extractPostId(redditId: string): string {
  if (redditId.startsWith('t3_')) {
    return redditId.slice(3);
  }
  // If it's a URL, extract the ID from it
  const match = redditId.match(/comments\/([a-z0-9]+)/i);
  if (match) {
    return match[1];
  }
  return redditId;
}

// Check if cached data is stale (over 1 hour old)
export function isStale(fetchedAt?: { _seconds: number; _nanoseconds: number }): boolean {
  if (!fetchedAt) return true;
  const oneHourAgo = Date.now() / 1000 - 60 * 60;
  return fetchedAt._seconds < oneHourAgo;
}

// Format how long ago data was fetched
export function formatFetchedAt(fetchedAt?: { _seconds: number; _nanoseconds: number }): string {
  if (!fetchedAt) return 'unknown';
  const seconds = Math.floor(Date.now() / 1000 - fetchedAt._seconds);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
