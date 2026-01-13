import 'package:cloud_firestore/cloud_firestore.dart';

class Monitor {
  final String id;
  final String userId;
  final String subreddit;
  final List<String> keywords;
  final bool active;
  final DateTime? createdAt;

  Monitor({
    required this.id,
    required this.userId,
    required this.subreddit,
    required this.keywords,
    required this.active,
    this.createdAt,
  });

  factory Monitor.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Monitor(
      id: doc.id,
      userId: data['userId'] ?? '',
      subreddit: data['subreddit'] ?? '',
      keywords: List<String>.from(data['keywords'] ?? []),
      active: data['active'] ?? true,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'subreddit': subreddit,
      'keywords': keywords,
      'active': active,
      'createdAt': createdAt != null ? Timestamp.fromDate(createdAt!) : FieldValue.serverTimestamp(),
    };
  }

  Monitor copyWith({
    String? id,
    String? userId,
    String? subreddit,
    List<String>? keywords,
    bool? active,
    DateTime? createdAt,
  }) {
    return Monitor(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      subreddit: subreddit ?? this.subreddit,
      keywords: keywords ?? this.keywords,
      active: active ?? this.active,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
