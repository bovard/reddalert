import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import type { Messaging } from 'firebase/messaging';

// Use emulators in development
const USE_EMULATORS = import.meta.env.DEV;

// Firebase config - in dev mode we use a dummy config for emulators
// In production, replace with your actual Firebase config
const firebaseConfig = USE_EMULATORS ? {
  apiKey: 'fake-api-key-for-emulator',
  authDomain: 'reddalert-local.firebaseapp.com',
  projectId: 'reddalert-local',
  storageBucket: 'reddalert-local.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000000000',
} : {
  // TODO: Replace with production config from Firebase console
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);
  console.log('Connected to Firebase emulators');
}

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  return signInWithPopup(auth, googleProvider);
};

export const signInWithTestAccount = async () => {
  return signInWithEmailAndPassword(auth, 'test@example.com', 'testpassword123');
};

export const logout = async () => {
  return signOut(auth);
};

// Messaging (FCM) - only available in production and supported browsers
let messaging: Messaging | null = null;

export const initializeMessaging = async (): Promise<Messaging | null> => {
  if (USE_EMULATORS) {
    console.log('FCM not available in emulator mode');
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    console.log('FCM not supported in this browser');
    return null;
  }

  if (!messaging) {
    messaging = getMessaging(app);
  }
  return messaging;
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    const messagingInstance = await initializeMessaging();
    if (!messagingInstance) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get FCM token - requires VAPID key from Firebase Console
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }

    const token = await getToken(messagingInstance, { vapidKey });
    console.log('FCM token obtained');
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const saveFcmToken = async (token: string): Promise<void> => {
  const saveFcmTokenFn = httpsCallable(functions, 'saveFcmToken');
  await saveFcmTokenFn({ token });
};

export const onForegroundMessage = (callback: (payload: unknown) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};

export { USE_EMULATORS };
