import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/post.dart';

class PostService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Get reference to current user's posts collection
  static CollectionReference<Map<String, dynamic>>? get _postsRef {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;
    return _firestore.collection('users').doc(user.uid).collection('posts');
  }

  /// Stream of new posts (not dismissed or done)
  static Stream<List<Post>> getNewPosts() {
    final ref = _postsRef;
    if (ref == null) return Stream.value([]);

    return ref
        .where('status', isEqualTo: 'new')
        .orderBy('redditCreatedAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList());
  }

  /// Stream of completed posts (marked as done)
  static Stream<List<Post>> getDonePosts() {
    final ref = _postsRef;
    if (ref == null) return Stream.value([]);

    return ref
        .where('status', isEqualTo: 'done')
        .orderBy('statusUpdatedAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList());
  }

  /// Stream of dismissed posts
  static Stream<List<Post>> getDismissedPosts() {
    final ref = _postsRef;
    if (ref == null) return Stream.value([]);

    return ref
        .where('status', isEqualTo: 'dismissed')
        .orderBy('statusUpdatedAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Post.fromFirestore(doc)).toList());
  }

  /// Mark a post as dismissed (swipe left)
  static Future<void> dismissPost(String postId) async {
    final ref = _postsRef;
    if (ref == null) throw Exception('User not authenticated');

    await ref.doc(postId).update({
      'status': 'dismissed',
      'statusUpdatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Mark a post as done (swipe right after commenting)
  static Future<void> markAsDone(String postId) async {
    final ref = _postsRef;
    if (ref == null) throw Exception('User not authenticated');

    await ref.doc(postId).update({
      'status': 'done',
      'statusUpdatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Restore a post to new status
  static Future<void> restorePost(String postId) async {
    final ref = _postsRef;
    if (ref == null) throw Exception('User not authenticated');

    await ref.doc(postId).update({
      'status': 'new',
      'statusUpdatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Get count of new posts
  static Stream<int> getNewPostsCount() {
    final ref = _postsRef;
    if (ref == null) return Stream.value(0);

    return ref
        .where('status', isEqualTo: 'new')
        .snapshots()
        .map((snapshot) => snapshot.docs.length);
  }
}
