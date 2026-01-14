import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, getOrCreateProfile } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const result = await getOrCreateProfile();
          console.log('Profile ready:', result.created ? 'created' : 'exists');
          setProfileReady(true);
        } catch (error) {
          console.error('Error ensuring profile:', error);
          setProfileReady(true); // Still mark as ready to avoid infinite loading
        }
      } else {
        setProfileReady(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, profileReady };
}
