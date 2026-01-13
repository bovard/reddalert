import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/subscription.dart';

class SubscriptionService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Get reference to current user's subscriptions collection
  static CollectionReference<Map<String, dynamic>>? get _subscriptionsRef {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;
    return _firestore
        .collection('users')
        .doc(user.uid)
        .collection('subscriptions');
  }

  /// Stream of all user subscriptions
  static Stream<List<Subscription>> getSubscriptions() {
    final ref = _subscriptionsRef;
    if (ref == null) return Stream.value([]);

    return ref.snapshots().map((snapshot) =>
        snapshot.docs.map((doc) => Subscription.fromFirestore(doc)).toList());
  }

  /// Get a single subscription
  static Future<Subscription?> getSubscription(String subreddit) async {
    final ref = _subscriptionsRef;
    if (ref == null) return null;

    final doc = await ref.doc(subreddit.toLowerCase()).get();
    if (!doc.exists) return null;
    return Subscription.fromFirestore(doc);
  }

  /// Update or create a subscription
  static Future<void> updateSubscription(Subscription subscription) async {
    final ref = _subscriptionsRef;
    if (ref == null) throw Exception('User not authenticated');

    await ref.doc(subscription.subreddit.toLowerCase()).set(
          subscription.toMap(),
          SetOptions(merge: true),
        );
  }

  /// Delete a subscription
  static Future<void> deleteSubscription(String subreddit) async {
    final ref = _subscriptionsRef;
    if (ref == null) throw Exception('User not authenticated');

    await ref.doc(subreddit.toLowerCase()).delete();
  }

  /// Initialize default subscriptions for a new user
  static Future<void> initializeDefaults() async {
    final ref = _subscriptionsRef;
    if (ref == null) throw Exception('User not authenticated');

    // Check if user already has subscriptions
    final existing = await ref.limit(1).get();
    if (existing.docs.isNotEmpty) return; // Already initialized

    // Create default subscriptions for all subreddits
    final batch = _firestore.batch();

    for (final subreddit in allSubreddits) {
      final subscription = Subscription(
        subreddit: subreddit.name,
        showFilter: subreddit.defaultShowFilter,
        notifyFilter: subreddit.defaultNotifyFilter,
        enabled: true,
      );
      batch.set(
        ref.doc(subreddit.name.toLowerCase()),
        subscription.toMap(),
      );
    }

    await batch.commit();
  }

  /// Get list of enabled subreddits with their filters
  static Future<Map<String, Subscription>> getEnabledSubscriptions() async {
    final ref = _subscriptionsRef;
    if (ref == null) return {};

    final snapshot = await ref.where('enabled', isEqualTo: true).get();

    final Map<String, Subscription> result = {};
    for (final doc in snapshot.docs) {
      final sub = Subscription.fromFirestore(doc);
      result[sub.subreddit.toLowerCase()] = sub;
    }
    return result;
  }

  /// Toggle subscription enabled state
  static Future<void> toggleSubscription(String subreddit, bool enabled) async {
    final ref = _subscriptionsRef;
    if (ref == null) throw Exception('User not authenticated');

    await ref.doc(subreddit.toLowerCase()).update({'enabled': enabled});
  }

  /// Update show filter for a subscription
  static Future<void> updateShowFilter(
    String subreddit,
    FilterType filter,
  ) async {
    final ref = _subscriptionsRef;
    if (ref == null) throw Exception('User not authenticated');

    await ref.doc(subreddit.toLowerCase()).update({
      'showFilter': filter.toString().split('.').last,
    });
  }

  /// Update notify filter for a subscription
  static Future<void> updateNotifyFilter(
    String subreddit,
    FilterType filter,
  ) async {
    final ref = _subscriptionsRef;
    if (ref == null) throw Exception('User not authenticated');

    await ref.doc(subreddit.toLowerCase()).update({
      'notifyFilter': filter.toString().split('.').last,
    });
  }
}
