import { useState, useEffect, useCallback } from 'react';
import {
  requestNotificationPermission,
  saveFcmToken,
  onForegroundMessage,
  USE_EMULATORS
} from '../lib/firebase';

export type NotificationStatus =
  | 'unsupported'    // Browser doesn't support notifications
  | 'emulator'       // Running in emulator mode
  | 'prompt'         // Permission not yet requested
  | 'denied'         // User denied permission
  | 'granted'        // Permission granted, token saved
  | 'error';         // Error occurred

export function useNotifications(userId: string | undefined) {
  const [status, setStatus] = useState<NotificationStatus>('prompt');
  const [loading, setLoading] = useState(false);

  // Check initial status
  useEffect(() => {
    if (USE_EMULATORS) {
      setStatus('emulator');
      return;
    }

    if (!('Notification' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
    } else if (Notification.permission === 'granted') {
      // Already granted - we should have a token
      setStatus('granted');
    } else {
      setStatus('prompt');
    }
  }, []);

  // Set up foreground message handler
  useEffect(() => {
    if (status !== 'granted') return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload);

      // Show a notification manually for foreground messages
      const data = payload as { notification?: { title?: string; body?: string } };
      if (data.notification) {
        new Notification(data.notification.title || 'Reddalert', {
          body: data.notification.body,
          icon: '/pwa-192x192.svg',
        });
      }
    });

    return unsubscribe;
  }, [status]);

  const requestPermission = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const token = await requestNotificationPermission();

      if (token) {
        await saveFcmToken(token);
        setStatus('granted');
      } else if (Notification.permission === 'denied') {
        setStatus('denied');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    status,
    loading,
    requestPermission,
    canRequest: status === 'prompt',
    isSupported: status !== 'unsupported' && status !== 'emulator',
  };
}
