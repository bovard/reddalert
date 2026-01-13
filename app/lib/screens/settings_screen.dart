import 'package:flutter/material.dart';
import '../models/subscription.dart';
import '../services/subscription_service.dart';
import '../services/auth_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          // User info section
          _buildUserSection(context),
          const Divider(),

          // Subscriptions section
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Subreddit Subscriptions',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
          ),

          StreamBuilder<List<Subscription>>(
            stream: SubscriptionService.getSubscriptions(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final subscriptions = snapshot.data ?? [];

              // Group by category
              return Column(
                children: subredditCategories.map((category) {
                  return _buildCategorySection(
                    context,
                    category,
                    subscriptions,
                  );
                }).toList(),
              );
            },
          ),

          const SizedBox(height: 32),

          // Sign out button
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton.icon(
              onPressed: () => _signOut(context),
              icon: const Icon(Icons.logout),
              label: const Text('Sign Out'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
              ),
            ),
          ),

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildUserSection(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          CircleAvatar(
            radius: 30,
            backgroundImage: AuthService.photoURL != null
                ? NetworkImage(AuthService.photoURL!)
                : null,
            child: AuthService.photoURL == null
                ? const Icon(Icons.person, size: 30)
                : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  AuthService.displayName ?? 'User',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  AuthService.email ?? '',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategorySection(
    BuildContext context,
    SubredditCategory category,
    List<Subscription> subscriptions,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                category.name,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.bold,
                    ),
              ),
              Text(
                category.description,
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
          ),
        ),
        ...category.subreddits.map((subredditInfo) {
          final subscription = subscriptions.firstWhere(
            (s) => s.subreddit.toLowerCase() == subredditInfo.name.toLowerCase(),
            orElse: () => Subscription(
              subreddit: subredditInfo.name,
              showFilter: subredditInfo.defaultShowFilter,
              notifyFilter: subredditInfo.defaultNotifyFilter,
            ),
          );
          return _SubredditTile(
            subredditInfo: subredditInfo,
            subscription: subscription,
          );
        }),
        const SizedBox(height: 8),
      ],
    );
  }

  Future<void> _signOut(BuildContext context) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await AuthService.signOut();
      if (context.mounted) {
        Navigator.pop(context);
      }
    }
  }
}

class _SubredditTile extends StatelessWidget {
  final SubredditInfo subredditInfo;
  final Subscription subscription;

  const _SubredditTile({
    required this.subredditInfo,
    required this.subscription,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Switch(
        value: subscription.enabled,
        onChanged: (enabled) {
          SubscriptionService.toggleSubscription(
            subscription.subreddit,
            enabled,
          );
        },
      ),
      title: Text('r/${subredditInfo.name}'),
      subtitle: Text(
        'Show: ${subscription.showFilterDescription}\n'
        'Notify: ${subscription.notifyFilterDescription}',
        style: const TextStyle(fontSize: 12),
      ),
      isThreeLine: true,
      trailing: IconButton(
        icon: const Icon(Icons.settings),
        onPressed: () => _showFilterDialog(context),
      ),
      onTap: () => _showFilterDialog(context),
    );
  }

  Future<void> _showFilterDialog(BuildContext context) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => _FilterSettingsSheet(
        subredditInfo: subredditInfo,
        subscription: subscription,
      ),
    );
  }
}

class _FilterSettingsSheet extends StatefulWidget {
  final SubredditInfo subredditInfo;
  final Subscription subscription;

  const _FilterSettingsSheet({
    required this.subredditInfo,
    required this.subscription,
  });

  @override
  State<_FilterSettingsSheet> createState() => _FilterSettingsSheetState();
}

class _FilterSettingsSheetState extends State<_FilterSettingsSheet> {
  late FilterType _showFilter;
  late FilterType _notifyFilter;
  late bool _enabled;

  @override
  void initState() {
    super.initState();
    _showFilter = widget.subscription.showFilter;
    _notifyFilter = widget.subscription.notifyFilter;
    _enabled = widget.subscription.enabled;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'r/${widget.subredditInfo.name}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      Text(
                        widget.subredditInfo.description,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _enabled,
                  onChanged: (value) {
                    setState(() => _enabled = value);
                  },
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Show in feed filter
            Text(
              'Show in Feed',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            _buildFilterSelector(
              _showFilter,
              (filter) => setState(() => _showFilter = filter),
            ),
            const SizedBox(height: 24),

            // Push notification filter
            Text(
              'Push Notifications',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),
            _buildFilterSelector(
              _notifyFilter,
              (filter) => setState(() => _notifyFilter = filter),
            ),
            const SizedBox(height: 24),

            // Save button
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _save,
                child: const Text('Save'),
              ),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterSelector(
    FilterType selected,
    ValueChanged<FilterType> onChanged,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _buildFilterChip('All', FilterType.all, selected, onChanged),
        _buildFilterChip('Catan', FilterType.catan, selected, onChanged),
        _buildFilterChip('TwoSheep', FilterType.twosheep, selected, onChanged),
        _buildFilterChip('None', FilterType.none, selected, onChanged),
      ],
    );
  }

  Widget _buildFilterChip(
    String label,
    FilterType filter,
    FilterType selected,
    ValueChanged<FilterType> onChanged,
  ) {
    final isSelected = filter == selected;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => onChanged(filter),
    );
  }

  Future<void> _save() async {
    final updatedSubscription = Subscription(
      subreddit: widget.subscription.subreddit,
      showFilter: _showFilter,
      notifyFilter: _notifyFilter,
      customKeywords: widget.subscription.customKeywords,
      enabled: _enabled,
    );

    await SubscriptionService.updateSubscription(updatedSubscription);

    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Settings saved')),
      );
    }
  }
}
