import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/monitor.dart';

class MonitorService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Get all monitors for the current user
  static Stream<List<Monitor>> getMonitors() {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      return Stream.value([]);
    }

    return _firestore
        .collection('monitors')
        .where('userId', isEqualTo: user.uid)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Monitor.fromFirestore(doc)).toList());
  }

  /// Add a new monitor using Cloud Function
  static Future<Monitor> addMonitor({
    required String subreddit,
    required List<String> keywords,
  }) async {
    final callable = _functions.httpsCallable('addMonitor');
    final result = await callable.call({
      'subreddit': subreddit,
      'keywords': keywords,
    });

    final data = result.data as Map<String, dynamic>;
    return Monitor(
      id: data['id'],
      userId: data['userId'],
      subreddit: data['subreddit'],
      keywords: List<String>.from(data['keywords']),
      active: data['active'],
    );
  }

  /// Remove a monitor using Cloud Function
  static Future<void> removeMonitor(String monitorId) async {
    final callable = _functions.httpsCallable('removeMonitor');
    await callable.call({'monitorId': monitorId});
  }

  /// Toggle monitor active state using Cloud Function
  static Future<void> toggleMonitor(String monitorId, bool active) async {
    final callable = _functions.httpsCallable('toggleMonitor');
    await callable.call({
      'monitorId': monitorId,
      'active': active,
    });
  }

  /// Add monitor directly to Firestore (alternative to Cloud Function)
  static Future<String> addMonitorDirect({
    required String subreddit,
    required List<String> keywords,
  }) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('User must be authenticated');
    }

    final monitor = Monitor(
      id: '',
      userId: user.uid,
      subreddit: subreddit.toLowerCase().replaceAll(RegExp(r'^r/'), ''),
      keywords: keywords.map((k) => k.toLowerCase().trim()).toList(),
      active: true,
    );

    final docRef = await _firestore.collection('monitors').add(monitor.toMap());
    return docRef.id;
  }

  /// Toggle monitor directly in Firestore
  static Future<void> toggleMonitorDirect(String monitorId, bool active) async {
    await _firestore.collection('monitors').doc(monitorId).update({
      'active': active,
    });
  }

  /// Delete monitor directly from Firestore
  static Future<void> removeMonitorDirect(String monitorId) async {
    await _firestore.collection('monitors').doc(monitorId).delete();
  }
}
