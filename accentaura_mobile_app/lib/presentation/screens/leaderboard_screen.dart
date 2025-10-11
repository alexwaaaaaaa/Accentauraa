import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../data/models/leaderboard.dart';
import '../providers/gamification_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/connectivity_provider.dart';
import '../../core/utils/logger.dart';

/// Leaderboard screen displaying top users
/// 
/// Features:
/// - Display top 100 users ranked by total XP
/// - Show rank, username, avatar, total XP, streak for each entry
/// - Highlight and pin user's own rank at top
/// - Pull-to-refresh functionality
/// - Show percentile indicator
/// - "Find Me" button to scroll to user position
/// - Handle offline mode with "Last updated" timestamp
class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  /// Scroll to user's position in the leaderboard
  void _scrollToUserPosition(int userRank, int totalEntries) {
    // Calculate approximate position (each item is roughly 80 pixels)
    // Account for user rank card at top (120 pixels)
    final double position = (userRank - 1) * 80.0 + 120.0;
    
    _scrollController.animateTo(
      position,
      duration: const Duration(milliseconds: 500),
      curve: Curves.easeInOut,
    );
  }

  /// Handle pull-to-refresh
  Future<void> _onRefresh() async {
    Logger.info('Refreshing leaderboard', tag: 'LeaderboardScreen');
    
    // Invalidate both providers to trigger refresh
    ref.invalidate(leaderboardProvider);
    ref.invalidate(userRankProvider);
    
    // Wait for both to complete
    await Future.wait([
      ref.read(leaderboardProvider.future),
      ref.read(userRankProvider.future),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final leaderboardAsync = ref.watch(leaderboardProvider);
    final userRankAsync = ref.watch(userRankProvider);
    final isOnline = ref.watch(isOnlineProvider);
    final currentUserId = ref.watch(authProvider).user?.id;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leaderboard'),
        actions: [
          // Offline indicator
          if (!isOnline)
            const Padding(
              padding: EdgeInsets.only(right: 16.0),
              child: Icon(Icons.cloud_off, color: Colors.grey),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _onRefresh,
        child: leaderboardAsync.when(
          data: (leaderboard) => _buildLeaderboardContent(
            leaderboard,
            userRankAsync,
            currentUserId,
            isOnline,
          ),
          loading: () => const Center(
            child: CircularProgressIndicator(),
          ),
          error: (error, stack) => _buildErrorState(error, isOnline),
        ),
      ),
    );
  }

  /// Build the main leaderboard content
  Widget _buildLeaderboardContent(
    LeaderboardData leaderboard,
    AsyncValue<UserRank> userRankAsync,
    String? currentUserId,
    bool isOnline,
  ) {
    return Column(
      children: [
        // User's rank card (pinned at top)
        userRankAsync.when(
          data: (userRank) => _buildUserRankCard(
            userRank,
            leaderboard,
            currentUserId,
          ),
          loading: () => const SizedBox.shrink(),
          error: (_, __) => const SizedBox.shrink(),
        ),

        // Last updated timestamp (offline mode)
        if (!isOnline)
          _buildLastUpdatedBanner(leaderboard.lastUpdated),

        // Leaderboard list
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            itemCount: leaderboard.entries.length + 1, // +1 for "Find Me" button
            itemBuilder: (context, index) {
              if (index == leaderboard.entries.length) {
                // "Find Me" button at the bottom
                return userRankAsync.when(
                  data: (userRank) => _buildFindMeButton(
                    userRank,
                    leaderboard.entries.length,
                  ),
                  loading: () => const SizedBox.shrink(),
                  error: (_, __) => const SizedBox.shrink(),
                );
              }

              final entry = leaderboard.entries[index];
              final isCurrentUser = entry.userId == currentUserId;

              return _buildLeaderboardEntry(entry, isCurrentUser);
            },
          ),
        ),
      ],
    );
  }

  /// Build user's rank card (pinned at top)
  Widget _buildUserRankCard(
    UserRank userRank,
    LeaderboardData leaderboard,
    String? currentUserId,
  ) {
    // Find user's entry in leaderboard
    final userEntry = leaderboard.entries.firstWhere(
      (entry) => entry.userId == currentUserId,
      orElse: () => LeaderboardEntry(
        userId: currentUserId ?? '',
        username: 'You',
        avatarUrl: null,
        totalXp: 0,
        rank: userRank.rank,
        streak: 0,
      ),
    );

    return Container(
      margin: const EdgeInsets.all(16.0),
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Theme.of(context).primaryColor,
            Theme.of(context).primaryColor.withValues(alpha: 0.7),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 8.0,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 30,
                backgroundImage: userEntry.avatarUrl != null
                    ? NetworkImage(userEntry.avatarUrl!)
                    : null,
                child: userEntry.avatarUrl == null
                    ? Text(
                        userEntry.username[0].toUpperCase(),
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 16),

              // User info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      userEntry.username,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Your Rank',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),

              // Rank badge
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '#${userRank.rank}',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Stats row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildStatItem(
                icon: Icons.emoji_events,
                label: 'XP',
                value: NumberFormat.compact().format(userEntry.totalXp),
              ),
              _buildStatItem(
                icon: Icons.local_fire_department,
                label: 'Streak',
                value: '${userEntry.streak}',
              ),
              _buildStatItem(
                icon: Icons.trending_up,
                label: 'Top',
                value: '${userRank.percentile}%',
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// Build stat item for user rank card
  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.white.withValues(alpha: 0.8),
          ),
        ),
      ],
    );
  }

  /// Build last updated banner for offline mode
  Widget _buildLastUpdatedBanner(DateTime lastUpdated) {
    final timeAgo = _formatTimeAgo(lastUpdated);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Colors.orange.withValues(alpha: 0.1),
      child: Row(
        children: [
          const Icon(Icons.info_outline, size: 16, color: Colors.orange),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Offline mode • Last updated $timeAgo',
              style: const TextStyle(fontSize: 12, color: Colors.orange),
            ),
          ),
        ],
      ),
    );
  }

  /// Build a single leaderboard entry
  Widget _buildLeaderboardEntry(LeaderboardEntry entry, bool isCurrentUser) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: isCurrentUser
            ? Theme.of(context).primaryColor.withValues(alpha: 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        border: isCurrentUser
            ? Border.all(
                color: Theme.of(context).primaryColor,
                width: 2,
              )
            : null,
      ),
      child: ListTile(
        leading: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Rank number with medal for top 3
            SizedBox(
              width: 40,
              child: _buildRankBadge(entry.rank),
            ),
            const SizedBox(width: 8),

            // Avatar
            CircleAvatar(
              radius: 20,
              backgroundImage: entry.avatarUrl != null
                  ? NetworkImage(entry.avatarUrl!)
                  : null,
              child: entry.avatarUrl == null
                  ? Text(
                      entry.username[0].toUpperCase(),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  : null,
            ),
          ],
        ),
        title: Text(
          entry.username,
          style: TextStyle(
            fontWeight: isCurrentUser ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        subtitle: Row(
          children: [
            const Icon(Icons.emoji_events, size: 14, color: Colors.amber),
            const SizedBox(width: 4),
            Text(
              NumberFormat.compact().format(entry.totalXp),
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(width: 12),
            const Icon(Icons.local_fire_department, size: 14, color: Colors.orange),
            const SizedBox(width: 4),
            Text(
              '${entry.streak}',
              style: const TextStyle(fontSize: 12),
            ),
          ],
        ),
        trailing: isCurrentUser
            ? const Icon(Icons.person, color: Colors.blue)
            : null,
      ),
    );
  }

  /// Build rank badge with medal for top 3
  Widget _buildRankBadge(int rank) {
    if (rank == 1) {
      return const Icon(Icons.emoji_events, color: Colors.amber, size: 32);
    } else if (rank == 2) {
      return const Icon(Icons.emoji_events, color: Colors.grey, size: 28);
    } else if (rank == 3) {
      return const Icon(Icons.emoji_events, color: Colors.brown, size: 24);
    } else {
      return Text(
        '#$rank',
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: Colors.grey,
        ),
        textAlign: TextAlign.center,
      );
    }
  }

  /// Build "Find Me" button
  Widget _buildFindMeButton(UserRank userRank, int totalEntries) {
    // Only show if user is not in top 10
    if (userRank.rank <= 10) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: ElevatedButton.icon(
        onPressed: () => _scrollToUserPosition(userRank.rank, totalEntries),
        icon: const Icon(Icons.my_location),
        label: const Text('Find Me'),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
    );
  }

  /// Build error state
  Widget _buildErrorState(Object error, bool isOnline) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isOnline ? Icons.error_outline : Icons.cloud_off,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(
              isOnline
                  ? 'Failed to load leaderboard'
                  : 'No cached leaderboard data',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              isOnline
                  ? error.toString()
                  : 'Connect to the internet to view the leaderboard',
              style: const TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _onRefresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  /// Format time ago for last updated timestamp
  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'just now';
    }
  }
}
