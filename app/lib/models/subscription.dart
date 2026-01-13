import 'package:cloud_firestore/cloud_firestore.dart';

enum FilterType {
  all,      // Show all posts
  catan,    // Only posts mentioning Catan
  twosheep, // Only posts mentioning TwoSheep
  custom,   // Custom keywords
  none,     // Don't show/notify
}

class Subscription {
  final String subreddit;
  final FilterType showFilter;
  final FilterType notifyFilter;
  final List<String> customKeywords;
  final bool enabled;

  Subscription({
    required this.subreddit,
    this.showFilter = FilterType.all,
    this.notifyFilter = FilterType.none,
    this.customKeywords = const [],
    this.enabled = true,
  });

  factory Subscription.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Subscription(
      subreddit: doc.id,
      showFilter: _parseFilterType(data['showFilter']),
      notifyFilter: _parseFilterType(data['notifyFilter']),
      customKeywords: List<String>.from(data['customKeywords'] ?? []),
      enabled: data['enabled'] ?? true,
    );
  }

  static FilterType _parseFilterType(String? value) {
    switch (value) {
      case 'all':
        return FilterType.all;
      case 'catan':
        return FilterType.catan;
      case 'twosheep':
        return FilterType.twosheep;
      case 'custom':
        return FilterType.custom;
      case 'none':
        return FilterType.none;
      default:
        return FilterType.all;
    }
  }

  static String _filterTypeToString(FilterType type) {
    switch (type) {
      case FilterType.all:
        return 'all';
      case FilterType.catan:
        return 'catan';
      case FilterType.twosheep:
        return 'twosheep';
      case FilterType.custom:
        return 'custom';
      case FilterType.none:
        return 'none';
    }
  }

  Map<String, dynamic> toMap() {
    return {
      'showFilter': _filterTypeToString(showFilter),
      'notifyFilter': _filterTypeToString(notifyFilter),
      'customKeywords': customKeywords,
      'enabled': enabled,
    };
  }

  Subscription copyWith({
    String? subreddit,
    FilterType? showFilter,
    FilterType? notifyFilter,
    List<String>? customKeywords,
    bool? enabled,
  }) {
    return Subscription(
      subreddit: subreddit ?? this.subreddit,
      showFilter: showFilter ?? this.showFilter,
      notifyFilter: notifyFilter ?? this.notifyFilter,
      customKeywords: customKeywords ?? this.customKeywords,
      enabled: enabled ?? this.enabled,
    );
  }

  /// Get human-readable filter description
  String get showFilterDescription => _filterDescription(showFilter);
  String get notifyFilterDescription => _filterDescription(notifyFilter);

  String _filterDescription(FilterType type) {
    switch (type) {
      case FilterType.all:
        return 'All posts';
      case FilterType.catan:
        return 'Catan mentions';
      case FilterType.twosheep:
        return 'TwoSheep mentions';
      case FilterType.custom:
        return 'Custom: ${customKeywords.join(", ")}';
      case FilterType.none:
        return 'None';
    }
  }
}

/// Predefined subreddit categories
class SubredditCategory {
  final String name;
  final String description;
  final List<SubredditInfo> subreddits;

  const SubredditCategory({
    required this.name,
    required this.description,
    required this.subreddits,
  });
}

class SubredditInfo {
  final String name;
  final String description;
  final FilterType defaultShowFilter;
  final FilterType defaultNotifyFilter;

  const SubredditInfo({
    required this.name,
    required this.description,
    this.defaultShowFilter = FilterType.all,
    this.defaultNotifyFilter = FilterType.none,
  });
}

/// All available subreddits organized by category
const List<SubredditCategory> subredditCategories = [
  SubredditCategory(
    name: 'Catan Core',
    description: 'Main Catan communities',
    subreddits: [
      SubredditInfo(
        name: 'Catan',
        description: 'The main Catan subreddit (~107K members)',
        defaultShowFilter: FilterType.all,
        defaultNotifyFilter: FilterType.none,
      ),
      SubredditInfo(
        name: 'SettlersofCatan',
        description: 'Alternative Catan community',
        defaultShowFilter: FilterType.all,
        defaultNotifyFilter: FilterType.none,
      ),
      SubredditInfo(
        name: 'CatanUniverse',
        description: 'Digital Catan Universe app',
        defaultShowFilter: FilterType.all,
        defaultNotifyFilter: FilterType.none,
      ),
    ],
  ),
  SubredditCategory(
    name: 'Online Platforms',
    description: 'Online Catan platforms',
    subreddits: [
      SubredditInfo(
        name: 'Colonist',
        description: 'Colonist.io community',
        defaultShowFilter: FilterType.all,
        defaultNotifyFilter: FilterType.none,
      ),
      SubredditInfo(
        name: 'twosheep',
        description: 'TwoSheep.io community',
        defaultShowFilter: FilterType.all,
        defaultNotifyFilter: FilterType.none,
      ),
    ],
  ),
  SubredditCategory(
    name: 'Board Games',
    description: 'General board game communities (filtered)',
    subreddits: [
      SubredditInfo(
        name: 'boardgames',
        description: 'Main board games subreddit',
        defaultShowFilter: FilterType.catan,
        defaultNotifyFilter: FilterType.none,
      ),
      SubredditInfo(
        name: 'tabletopgaming',
        description: 'Tabletop gaming community',
        defaultShowFilter: FilterType.catan,
        defaultNotifyFilter: FilterType.none,
      ),
    ],
  ),
];

/// Get flat list of all subreddits
List<SubredditInfo> get allSubreddits =>
    subredditCategories.expand((cat) => cat.subreddits).toList();
