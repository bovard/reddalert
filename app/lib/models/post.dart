import 'package:cloud_firestore/cloud_firestore.dart';

enum PostStatus {
  newPost,    // Not yet acted upon
  dismissed,  // Swiped left - hidden from main view
  done,       // Swiped right - commented and marked complete
}

class Post {
  final String id;
  final String redditId;
  final String title;
  final String url;
  final String author;
  final String subreddit;
  final String? content;
  final DateTime? redditCreatedAt;
  final DateTime createdAt;
  final PostStatus status;
  final DateTime? statusUpdatedAt;

  Post({
    required this.id,
    required this.redditId,
    required this.title,
    required this.url,
    required this.author,
    required this.subreddit,
    this.content,
    this.redditCreatedAt,
    required this.createdAt,
    required this.status,
    this.statusUpdatedAt,
  });

  factory Post.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Post(
      id: doc.id,
      redditId: data['redditId'] ?? '',
      title: data['title'] ?? '',
      url: data['url'] ?? '',
      author: data['author'] ?? '',
      subreddit: data['subreddit'] ?? '',
      content: data['content'],
      redditCreatedAt: (data['redditCreatedAt'] as Timestamp?)?.toDate(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      status: _parseStatus(data['status']),
      statusUpdatedAt: (data['statusUpdatedAt'] as Timestamp?)?.toDate(),
    );
  }

  static PostStatus _parseStatus(String? status) {
    switch (status) {
      case 'dismissed':
        return PostStatus.dismissed;
      case 'done':
        return PostStatus.done;
      case 'new':
      default:
        return PostStatus.newPost;
    }
  }

  static String _statusToString(PostStatus status) {
    switch (status) {
      case PostStatus.dismissed:
        return 'dismissed';
      case PostStatus.done:
        return 'done';
      case PostStatus.newPost:
        return 'new';
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'redditId': redditId,
      'title': title,
      'url': url,
      'author': author,
      'subreddit': subreddit,
      'content': content,
      'redditCreatedAt': redditCreatedAt != null
          ? Timestamp.fromDate(redditCreatedAt!)
          : null,
      'createdAt': Timestamp.fromDate(createdAt),
      'status': _statusToString(status),
      'statusUpdatedAt': statusUpdatedAt != null
          ? Timestamp.fromDate(statusUpdatedAt!)
          : null,
    };
  }

  Post copyWith({
    String? id,
    String? redditId,
    String? title,
    String? url,
    String? author,
    String? subreddit,
    String? content,
    DateTime? redditCreatedAt,
    DateTime? createdAt,
    PostStatus? status,
    DateTime? statusUpdatedAt,
  }) {
    return Post(
      id: id ?? this.id,
      redditId: redditId ?? this.redditId,
      title: title ?? this.title,
      url: url ?? this.url,
      author: author ?? this.author,
      subreddit: subreddit ?? this.subreddit,
      content: content ?? this.content,
      redditCreatedAt: redditCreatedAt ?? this.redditCreatedAt,
      createdAt: createdAt ?? this.createdAt,
      status: status ?? this.status,
      statusUpdatedAt: statusUpdatedAt ?? this.statusUpdatedAt,
    );
  }

  /// Get the Reddit comment URL for this post
  String get commentUrl => url;

  /// Time since post was created on Reddit
  String get timeAgo {
    if (redditCreatedAt == null) return '';

    final diff = DateTime.now().difference(redditCreatedAt!);

    if (diff.inDays > 0) {
      return '${diff.inDays}d ago';
    } else if (diff.inHours > 0) {
      return '${diff.inHours}h ago';
    } else if (diff.inMinutes > 0) {
      return '${diff.inMinutes}m ago';
    } else {
      return 'just now';
    }
  }
}
