import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Post, PostStatus } from '../types';
import { useEffect, useState } from 'react';

function convertPost(docData: Record<string, unknown>, id: string): Post {
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
    status: docData.status as PostStatus,
    statusUpdatedAt: docData.statusUpdatedAt
      ? (docData.statusUpdatedAt as Timestamp).toDate()
      : undefined,
    respondedAt: docData.respondedAt
      ? (docData.respondedAt as Timestamp).toDate()
      : undefined,
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

    const postsRef = collection(db, 'users', userId, 'posts');
    const q = query(
      postsRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map((doc) =>
        convertPost(doc.data(), doc.id)
      );
      setPosts(newPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, status]);

  return { posts, loading };
}

export function useUpdatePostStatus(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, status }: { postId: string; status: PostStatus }) => {
      if (!userId) throw new Error('User not authenticated');

      const postRef = doc(db, 'users', userId, 'posts', postId);
      const statsRef = doc(db, 'users', userId, 'settings', 'stats');

      // Get current post to check if we're changing from/to responded
      const postDoc = await getDoc(postRef);
      const currentStatus = postDoc.exists() ? postDoc.data().status : null;

      const updateData: Record<string, unknown> = {
        status,
        statusUpdatedAt: Timestamp.now(),
      };

      // If marking as responded, set respondedAt
      if (status === 'responded') {
        updateData.respondedAt = Timestamp.now();
      }

      await updateDoc(postRef, updateData);

      // Update response counter
      if (status === 'responded' && currentStatus !== 'responded') {
        // Incrementing response count
        const statsDoc = await getDoc(statsRef);
        if (statsDoc.exists()) {
          await updateDoc(statsRef, { totalResponses: increment(1) });
        } else {
          await setDoc(statsRef, { totalResponses: 1 });
        }
      } else if (status !== 'responded' && currentStatus === 'responded') {
        // Decrementing response count (user unmarked as responded)
        await updateDoc(statsRef, { totalResponses: increment(-1) });
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

    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      if (snapshot.exists()) {
        setStats(snapshot.data() as { totalResponses: number });
      } else {
        setStats({ totalResponses: 0 });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching stats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { stats, loading };
}
