/**
 * Seed a test user in the Firebase emulators for local development
 *
 * Usage: node scripts/seedTestUser.js
 *
 * This creates a test user with default subscriptions so you can test
 * the app locally without going through Google Sign-In.
 */

const admin = require('firebase-admin');

// Configure emulator connections
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'reddalert-local',
});

const db = admin.firestore();
const auth = admin.auth();

// Default subscriptions for new users
const DEFAULT_SUBSCRIPTIONS = {
  catan: { showFilter: 'all', notifyFilter: 'none', enabled: true },
  settlersofcatan: { showFilter: 'all', notifyFilter: 'none', enabled: true },
  catanuniverse: { showFilter: 'all', notifyFilter: 'none', enabled: true },
  colonist: { showFilter: 'all', notifyFilter: 'none', enabled: true },
  twosheep: { showFilter: 'all', notifyFilter: 'none', enabled: true },
  boardgames: { showFilter: 'catan', notifyFilter: 'none', enabled: true },
  tabletopgaming: { showFilter: 'catan', notifyFilter: 'none', enabled: true },
};

async function seedTestUser() {
  console.log('Creating test user...');

  const testEmail = 'test@example.com';
  const testPassword = 'testpassword123';
  const testDisplayName = 'Test User';

  try {
    // Create auth user
    let user;
    try {
      user = await auth.createUser({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName,
        emailVerified: true,
      });
      console.log(`Created auth user: ${user.uid}`);
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        user = await auth.getUserByEmail(testEmail);
        console.log(`User already exists: ${user.uid}`);
      } else {
        throw e;
      }
    }

    // Create Firestore user document
    await db.collection('users').doc(user.uid).set({
      email: testEmail,
      displayName: testDisplayName,
      photoURL: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Created user document');

    // Create default subscriptions
    const subscriptionsRef = db.collection('users').doc(user.uid).collection('subscriptions');
    const batch = db.batch();

    for (const [subreddit, settings] of Object.entries(DEFAULT_SUBSCRIPTIONS)) {
      batch.set(subscriptionsRef.doc(subreddit), settings);
    }

    await batch.commit();
    console.log('Created default subscriptions');

    console.log('\n========================================');
    console.log('Test user created successfully!');
    console.log('========================================');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    console.log(`User ID: ${user.uid}`);
    console.log('');
    console.log('You can now run the scheduler to populate posts:');
    console.log('  npm run scheduler');
    console.log('');

  } catch (error) {
    console.error('Error seeding test user:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedTestUser();
