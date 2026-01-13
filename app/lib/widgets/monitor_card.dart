import 'package:flutter/material.dart';
import '../models/monitor.dart';

class MonitorCard extends StatelessWidget {
  final Monitor monitor;
  final Function(bool) onToggle;
  final VoidCallback onDelete;

  const MonitorCard({
    super.key,
    required this.monitor,
    required this.onToggle,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              children: [
                // Subreddit icon
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: monitor.active
                        ? colorScheme.primaryContainer
                        : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      'r/',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: monitor.active
                            ? colorScheme.onPrimaryContainer
                            : Colors.grey,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),

                // Subreddit name
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'r/${monitor.subreddit}',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: monitor.active ? null : Colors.grey,
                            ),
                      ),
                      Text(
                        monitor.active ? 'Active' : 'Paused',
                        style: TextStyle(
                          fontSize: 12,
                          color: monitor.active ? Colors.green : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),

                // Toggle switch
                Switch(
                  value: monitor.active,
                  onChanged: onToggle,
                ),

                // Delete button
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: onDelete,
                  color: Colors.red.shade300,
                  tooltip: 'Delete',
                ),
              ],
            ),

            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),

            // Keywords
            Text(
              'Keywords',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: Colors.grey,
                  ),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: monitor.keywords.map((keyword) {
                return Chip(
                  label: Text(keyword),
                  materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  visualDensity: VisualDensity.compact,
                  backgroundColor: monitor.active
                      ? colorScheme.secondaryContainer
                      : Colors.grey.shade200,
                  labelStyle: TextStyle(
                    fontSize: 12,
                    color: monitor.active
                        ? colorScheme.onSecondaryContainer
                        : Colors.grey,
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }
}
