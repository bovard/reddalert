import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  increment,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post, PostStatus } from '../types';
import { useEffect, useState } from 'react';

interface PostStatusDoc {
  status: PostStatus;
  statusUpdatedAt?: Timestamp;
  respondedAt?: Timestamp;
}

function convertPost(
  docData: Record<string, unknown>,
  id: string,
  statusData?: PostStatusDoc
): Post {
  return {
    id,
    redditId: docData.redditId as string,
    subreddit: docData.subreddit as string,
    title: docData.title as string,
    author: docData.author as string,
    url: docData.url as string,
    permalink: docData.permalink as string,
    createdAt: (docData.createdAt as Timestamp).toDate(),
    fetchedAt: (docData.fetchedAt as Timestamp).toDate(),
    status: statusData?.status || 'new',
    statusUpdatedAt: statusData?.statusUpdatedAt?.toDate(),
    respondedAt: statusData?.respondedAt?.toDate(),
  };
}

export function usePosts(userId: string | undefined, status: PostStatus) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Store data from both subscriptions
    let sharedPosts: Map<string, Record<string, unknown>> = new Map();
    let userStatuses: Map<string, PostStatusDoc> = new Map();
    let postsLoaded = false;
    let statusesLoaded = false;

    const updatePosts = () => {
      if (!postsLoaded || !statusesLoaded) return;

      const combined: Post[] = [];

      sharedPosts.forEach((postData, postId) => {
        const postStatus = userStatuses.get(postId);
        const effectiveStatus = postStatus?.status || 'new';

        // Filter based on requested status
        if (effectiveStatus === status) {
          combined.push(convertPost(postData, postId, postStatus));
        }
      });

      // Sort by createdAt descending
      combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setPosts(combined);
      setLoading(false);
    };

    // Subscribe to shared posts collection (limit to recent posts)
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribePosts = onSnapshot(
      postsQuery,
      (snapshot) => {
        sharedPosts = new Map();
        snapshot.docs.forEach((doc) => {
          sharedPosts.set(doc.id, doc.data());
        });
        postsLoaded = true;
        updatePosts();
      },
      (error) => {
        console.error('Error fetching posts:', error);
        setLoading(false);
      }
    );

    // Subscribe to user's postStatus collection
    const statusRef = collection(db, 'users', userId, 'postStatus');
    const unsubscribeStatus = onSnapshot(
      statusRef,
      (snapshot) => {
        userStatuses = new Map();
        snapshot.docs.forEach((doc) => {
          userStatuses.set(doc.id, doc.data() as PostStatusDoc);
        });
        statusesLoaded = true;
        updatePosts();
      },
      (error) => {
        console.error('Error fetching post statuses:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribePosts();
      unsubscribeStatus();
    };
  }, [userId, status]);

  return { posts, loading };
}

export function useUpdatePostStatus(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      status,
    }: {
      postId: string;
      status: PostStatus;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      const statusRef = doc(db, 'users', userId, 'postStatus', postId);
      const statsRef = doc(db, 'users', userId, 'settings', 'stats');

      // Get current status to check if we're changing from/to responded
      const statusDoc = await getDoc(statusRef);
      const currentStatus = statusDoc.exists()
        ? (statusDoc.data().status as PostStatus)
        : 'new';

      if (status === 'new') {
        // Delete the status document to make it "new" again
        if (statusDoc.exists()) {
          await deleteDoc(statusRef);
        }
      } else {
        // Set the new status
        const updateData: Record<string, unknown> = {
          status,
          statusUpdatedAt: Timestamp.now(),
        };

        if (status === 'responded') {
          updateData.respondedAt = Timestamp.now();
        }

        await setDoc(statusRef, updateData, { merge: true });
      }

      // Update response counter
      if (status === 'responded' && currentStatus !== 'responded') {
        const statsDoc = await getDoc(statsRef);
        if (statsDoc.exists()) {
          await setDoc(statsRef, { totalResponses: increment(1) }, { merge: true });
        } else {
          await setDoc(statsRef, { totalResponses: 1 });
        }
      } else if (status !== 'responded' && currentStatus === 'responded') {
        await setDoc(statsRef, { totalResponses: increment(-1) }, { merge: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useRespondedPosts(userId: string | undefined) {
  return usePosts(userId, 'responded');
}

// Hook to get user stats including total responses
export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<{ totalResponses: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }

    const statsRef = doc(db, 'users', userId, 'settings', 'stats');

    const unsubscribe = onSnapshot(
      statsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setStats(snapshot.data() as { totalResponses: number });
        } else {
          setStats({ totalResponses: 0 });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { stats, loading };
}
