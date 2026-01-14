import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEFAULT_SUBSCRIPTIONS } from '../types';
import type { Subscription } from '../types';

export function useSubscriptions(userId: string | undefined) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    const settingsRef = doc(db, 'users', userId, 'settings', 'subscriptions');

    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSubscriptions(data.subscriptions || DEFAULT_SUBSCRIPTIONS);
      } else {
        setSubscriptions(DEFAULT_SUBSCRIPTIONS);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching subscriptions:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { subscriptions, loading };
}

export function useUpdateSubscriptions(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptions: Subscription[]) => {
      if (!userId) throw new Error('User not authenticated');

      const settingsRef = doc(db, 'users', userId, 'settings', 'subscriptions');
      await setDoc(settingsRef, { subscriptions }, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}
