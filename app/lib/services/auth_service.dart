import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'notification_service.dart';

class AuthService {
  static final FirebaseAuth _auth = FirebaseAuth.instance;

  /// Get current user
  static User? get currentUser => _auth.currentUser;

  /// Stream of auth state changes
  static Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Check if user is signed in
  static bool get isSignedIn => _auth.currentUser != null;

  /// Sign in anonymously (for simple use case)
  static Future<User?> signInAnonymously() async {
    try {
      final result = await _auth.signInAnonymously();
      debugPrint('Signed in anonymously: ${result.user?.uid}');
      return result.user;
    } catch (e) {
      debugPrint('Error signing in anonymously: $e');
      rethrow;
    }
  }

  /// Sign in with email and password
  static Future<User?> signInWithEmail(String email, String password) async {
    try {
      final result = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      return result.user;
    } on FirebaseAuthException catch (e) {
      debugPrint('Sign in error: ${e.code}');
      rethrow;
    }
  }

  /// Create account with email and password
  static Future<User?> createAccount(String email, String password) async {
    try {
      final result = await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      return result.user;
    } on FirebaseAuthException catch (e) {
      debugPrint('Create account error: ${e.code}');
      rethrow;
    }
  }

  /// Sign out
  static Future<void> signOut() async {
    await NotificationService.removeToken();
    await _auth.signOut();
  }

  /// Delete account
  static Future<void> deleteAccount() async {
    final user = _auth.currentUser;
    if (user != null) {
      await NotificationService.removeToken();
      await user.delete();
    }
  }
}
