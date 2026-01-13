import 'package:flutter/material.dart';
import '../services/monitor_service.dart';

class AddMonitorScreen extends StatefulWidget {
  const AddMonitorScreen({super.key});

  @override
  State<AddMonitorScreen> createState() => _AddMonitorScreenState();
}

class _AddMonitorScreenState extends State<AddMonitorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subredditController = TextEditingController();
  final _keywordsController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _subredditController.dispose();
    _keywordsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Monitor'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Subreddit field
            TextFormField(
              controller: _subredditController,
              decoration: const InputDecoration(
                labelText: 'Subreddit',
                hintText: 'e.g., technology',
                prefixText: 'r/',
                border: OutlineInputBorder(),
                helperText: 'Enter the subreddit name without r/',
              ),
              textInputAction: TextInputAction.next,
              autocorrect: false,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a subreddit';
                }
                if (value.contains(' ')) {
                  return 'Subreddit names cannot contain spaces';
                }
                return null;
              },
            ),
            const SizedBox(height: 24),

            // Keywords field
            TextFormField(
              controller: _keywordsController,
              decoration: const InputDecoration(
                labelText: 'Keywords',
                hintText: 'e.g., flutter, dart, mobile app',
                border: OutlineInputBorder(),
                helperText: 'Separate multiple keywords with commas',
              ),
              textInputAction: TextInputAction.done,
              maxLines: 3,
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter at least one keyword';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Info card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'How it works',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'We check the subreddit every 15 minutes for new posts. '
                      'If a post title or content contains any of your keywords, '
                      'you\'ll receive a push notification.',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Submit button
            FilledButton.icon(
              onPressed: _isLoading ? null : _submit,
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.add),
              label: Text(_isLoading ? 'Adding...' : 'Add Monitor'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final subreddit = _subredditController.text.trim();
      final keywords = _keywordsController.text
          .split(',')
          .map((k) => k.trim())
          .where((k) => k.isNotEmpty)
          .toList();

      await MonitorService.addMonitorDirect(
        subreddit: subreddit,
        keywords: keywords,
      );

      if (mounted) {
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
