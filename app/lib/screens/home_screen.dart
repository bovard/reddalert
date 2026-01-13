import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/post_service.dart';
import '../services/subscription_service.dart';
import 'posts_screen.dart';
import 'history_screen.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final _screens = const [
    PostsScreen(),
    HistoryScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Initialize default subscriptions if needed
    _initializeSubscriptions();
  }

  Future<void> _initializeSubscriptions() async {
    try {
      await SubscriptionService.initializeDefaults();
    } catch (e) {
      debugPrint('Error initializing subscriptions: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reddalert'),
        actions: [
          // Settings button
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const SettingsScreen()),
            ),
            tooltip: 'Settings',
          ),
          // User avatar
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              ),
              child: CircleAvatar(
                radius: 16,
                backgroundImage: AuthService.photoURL != null
                    ? NetworkImage(AuthService.photoURL!)
                    : null,
                child: AuthService.photoURL == null
                    ? const Icon(Icons.person, size: 20)
                    : null,
              ),
            ),
          ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() => _currentIndex = index);
        },
        destinations: [
          NavigationDestination(
            icon: StreamBuilder<int>(
              stream: PostService.getNewPostsCount(),
              builder: (context, snapshot) {
                final count = snapshot.data ?? 0;
                if (count > 0) {
                  return Badge(
                    label: Text(count > 99 ? '99+' : count.toString()),
                    child: const Icon(Icons.inbox_outlined),
                  );
                }
                return const Icon(Icons.inbox_outlined);
              },
            ),
            selectedIcon: const Icon(Icons.inbox),
            label: 'New',
          ),
          const NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'History',
          ),
        ],
      ),
    );
  }
}
