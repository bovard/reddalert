import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  static final FirebaseFunctions _functions = FirebaseFunctions.instance;

  /// Initialize push notifications
  static Future<void> initialize() async {
    // Request permission
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('User granted notification permission');
      await _setupToken();
      _setupForegroundHandler();
    } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
      debugPrint('User granted provisional notification permission');
      await _setupToken();
      _setupForegroundHandler();
    } else {
      debugPrint('User declined notification permission');
    }
  }

  /// Set up FCM token and save to server
  static Future<void> _setupToken() async {
    // Get FCM token
    final token = await _messaging.getToken();
    if (token != null) {
      await _saveToken(token);
    }

    // Listen for token refresh
    _messaging.onTokenRefresh.listen(_saveToken);
  }

  /// Save FCM token to Firestore via Cloud Function
  static Future<void> _saveToken(String token) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      final callable = _functions.httpsCallable('saveFcmToken');
      await callable.call({'token': token});
      debugPrint('FCM token saved');
    } catch (e) {
      debugPrint('Error saving FCM token: $e');
    }
  }

  /// Set up foreground message handler
  static void _setupForegroundHandler() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Received foreground message: ${message.notification?.title}');
      _handleForegroundMessage(message);
    });

    // Handle notification taps when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('Notification tapped: ${message.data}');
      _handleNotificationTap(message);
    });
  }

  /// Handle foreground messages
  static void _handleForegroundMessage(RemoteMessage message) {
    // The notification will be shown automatically on iOS
    // For Android, you might want to use flutter_local_notifications
    // to show a custom notification
    debugPrint('New Reddit alert: ${message.notification?.title}');
    debugPrint('Body: ${message.notification?.body}');
    debugPrint('Data: ${message.data}');
  }

  /// Handle notification tap
  static void _handleNotificationTap(RemoteMessage message) {
    final postUrl = message.data['postUrl'];
    if (postUrl != null) {
      // Could launch URL or navigate to detail screen
      debugPrint('Should open: $postUrl');
      // url_launcher can be used here to open the post
    }
  }

  /// Check if notifications are enabled
  static Future<bool> areNotificationsEnabled() async {
    final settings = await _messaging.getNotificationSettings();
    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  /// Request notification permission
  static Future<bool> requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    return settings.authorizationStatus == AuthorizationStatus.authorized;
  }
}
