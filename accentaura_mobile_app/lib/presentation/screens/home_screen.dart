import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/providers.dart';
import '../navigation/app_router.dart';
import '../../core/utils/logger.dart';
import '../../core/utils/accessibility_helper.dart';

/// Home dashboard screen
/// 
/// Displays:
/// - User stats (avatar, XP bar, streak, coins)
/// - Quick action cards (Continue Last Level, AI Practice, Interview Mode, Leaderboard, Profile)
/// - Bottom navigation bar
/// - Pull-to-refresh for syncing progress
/// - Offline indicator when network is unavailable
/// - Full accessibility support with semantic labels and announcements
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final userProgressAsync = ref.watch(userProgressProvider);
    final isOnline = ref.watch(isOnlineProvider);
    final authState = ref.watch(authProvider);

    // Announce connectivity changes
    ref.listen<bool>(isOnlineProvider, (previous, next) {
      if (previous != null && previous != next) {
        if (next) {
          AccessibilityHelper.announceOnlineMode(context);
        } else {
          AccessibilityHelper.announceOfflineMode(context);
        }
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('AccentAura'),
        actions: [
          // Offline indicator
          if (!isOnline)
            Semantics(
              label: 'You are currently offline. Using cached content.',
              child: Padding(
                padding: const EdgeInsets.only(right: 16.0),
                child: Row(
                  children: [
                    Icon(
                      Icons.cloud_off,
                      color: Colors.orange.shade700,
                      size: 20,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Offline',
                      style: TextStyle(
                        color: Colors.orange.shade700,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          Logger.info('Refreshing home dashboard', tag: 'HomeScreen');
          
          // Trigger sync of pending updates
          try {
            final repository = ref.read(progressRepositoryProvider);
            await repository.syncPendingUpdates();
            
            // Refresh user progress
            ref.invalidate(userProgressProvider);
            
            Logger.info('Dashboard refresh complete', tag: 'HomeScreen');
          } catch (e) {
            Logger.error('Dashboard refresh failed', error: e, tag: 'HomeScreen');
            
            // Show error message if widget is still mounted
            if (!context.mounted) return;
            
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to sync: ${e.toString()}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // User stats section
                userProgressAsync.when(
                  data: (progress) => _buildUserStatsCard(context, progress, authState.user),
                  loading: () => _buildLoadingStatsCard(),
                  error: (error, stack) => _buildErrorStatsCard(error),
                ),
                
                const SizedBox(height: 24),
                
                // Quick actions section
                Text(
                  'Quick Actions',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                
                const SizedBox(height: 16),
                
                // Quick action cards
                _buildQuickActionCards(context, userProgressAsync),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: _buildBottomNavigationBar(context),
    );
  }

  /// Build user stats card with avatar, XP, streak, and coins
  Widget _buildUserStatsCard(BuildContext context, dynamic progress, dynamic user) {
    final totalXp = progress?.totalXp ?? 0;
    final currentLevel = progress?.currentLevel ?? 1;
    final streak = progress?.streak ?? 0;
    final coins = progress?.coins ?? 0;
    
    // Calculate XP for current level (simple formula: level * 100)
    final xpForCurrentLevel = (currentLevel - 1) * 100;
    final xpForNextLevel = currentLevel * 100;
    final xpInCurrentLevel = totalXp - xpForCurrentLevel;
    final xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;
    final xpProgress = xpInCurrentLevel / xpNeededForNextLevel;

    return Semantics(
      label: 'User progress card',
      child: Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Avatar and level
            Row(
              children: [
                Semantics(
                  label: 'User avatar for ${user?.name ?? 'Learner'}',
                  image: true,
                  child: CircleAvatar(
                    radius: 32,
                    backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                    child: user?.avatarUrl != null
                        ? ClipOval(
                            child: Image.network(
                              user!.avatarUrl!,
                              width: 64,
                              height: 64,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Icon(
                                  Icons.person,
                                  size: 32,
                                  color: Theme.of(context).colorScheme.onPrimaryContainer,
                                );
                              },
                            ),
                          )
                        : Icon(
                            Icons.person,
                            size: 32,
                            color: Theme.of(context).colorScheme.onPrimaryContainer,
                          ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? 'Learner',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Level $currentLevel',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                // Streak and coins
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Semantics(
                      label: AccessibilityHelper.streakLabel(streak),
                      child: Row(
                        children: [
                          ExcludeSemantics(
                            child: Icon(
                              Icons.local_fire_department,
                              color: Colors.orange.shade700,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$streak',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Semantics(
                      label: AccessibilityHelper.coinsLabel(coins),
                      child: Row(
                        children: [
                          ExcludeSemantics(
                            child: Icon(
                              Icons.monetization_on,
                              color: Colors.amber.shade700,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$coins',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            
            const SizedBox(height: 16),
            
            // XP progress bar
            Semantics(
              label: AccessibilityHelper.xpProgressLabel(
                xpInCurrentLevel,
                xpNeededForNextLevel,
                currentLevel,
              ),
              value: '${(xpProgress * 100).toInt()}%',
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'XP Progress',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        '$xpInCurrentLevel / $xpNeededForNextLevel XP',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: xpProgress.clamp(0.0, 1.0),
                      minHeight: 12,
                      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }

  /// Build loading state for stats card
  Widget _buildLoadingStatsCard() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.grey.shade300,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 20,
                        width: 120,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        height: 16,
                        width: 80,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              height: 12,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build error state for stats card
  Widget _buildErrorStatsCard(Object error) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Icon(
              Icons.error_outline,
              size: 48,
              color: Colors.red.shade700,
            ),
            const SizedBox(height: 8),
            Text(
              'Failed to load progress',
              style: TextStyle(
                color: Colors.red.shade700,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              error.toString(),
              style: const TextStyle(fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  /// Build quick action cards
  Widget _buildQuickActionCards(BuildContext context, AsyncValue<dynamic> userProgressAsync) {
    final currentLevel = userProgressAsync.when(
      data: (progress) => progress?.currentLevel ?? 1,
      loading: () => 1,
      error: (_, __) => 1,
    );

    return Column(
      children: [
        // Row 1: Continue Last Level, AI Practice
        Row(
          children: [
            Expanded(
              child: _buildActionCard(
                context: context,
                icon: Icons.play_circle_filled,
                title: 'Continue',
                subtitle: 'Level $currentLevel',
                color: Colors.blue,
                onTap: () {
                  Logger.info('Navigating to lesson tree', tag: 'HomeScreen');
                  context.push(AppRoutes.lessonTree);
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionCard(
                context: context,
                icon: Icons.chat_bubble,
                title: 'AI Practice',
                subtitle: 'Chat & Voice',
                color: Colors.purple,
                onTap: () {
                  Logger.info('Navigating to AI practice', tag: 'HomeScreen');
                  context.push(AppRoutes.aiPractice);
                },
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 12),
        
        // Row 2: Interview Mode, Leaderboard
        Row(
          children: [
            Expanded(
              child: _buildActionCard(
                context: context,
                icon: Icons.videocam,
                title: 'Interview',
                subtitle: 'Practice Mode',
                color: Colors.green,
                onTap: () {
                  Logger.info('Navigating to interview', tag: 'HomeScreen');
                  context.push(AppRoutes.interview);
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildActionCard(
                context: context,
                icon: Icons.leaderboard,
                title: 'Leaderboard',
                subtitle: 'Top 100',
                color: Colors.orange,
                onTap: () {
                  Logger.info('Navigating to leaderboard', tag: 'HomeScreen');
                  context.push(AppRoutes.leaderboard);
                },
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 12),
        
        // Row 3: Profile (full width)
        _buildActionCard(
          context: context,
          icon: Icons.person,
          title: 'Profile',
          subtitle: 'View badges & achievements',
          color: Colors.teal,
          onTap: () {
            Logger.info('Navigating to profile', tag: 'HomeScreen');
            context.push(AppRoutes.profile);
          },
        ),
      ],
    );
  }

  /// Build individual action card
  Widget _buildActionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Semantics(
      label: '$title. $subtitle',
      button: true,
      enabled: true,
      excludeSemantics: true,
      child: AccessibilityHelper.ensureMinTapTarget(
        child: Card(
          elevation: 2,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    icon,
                    size: 32,
                    color: color,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Build bottom navigation bar
  Widget _buildBottomNavigationBar(BuildContext context) {
    return NavigationBar(
      selectedIndex: _selectedIndex,
      onDestinationSelected: (index) {
        setState(() {
          _selectedIndex = index;
        });

        // Navigate based on selected index
        switch (index) {
          case 0:
            // Already on home
            break;
          case 1:
            context.push(AppRoutes.lessonTree);
            break;
          case 2:
            context.push(AppRoutes.leaderboard);
            break;
          case 3:
            context.push(AppRoutes.profile);
            break;
        }
      },
      destinations: [
        NavigationDestination(
          icon: Semantics(
            label: AccessibilityHelper.navigationLabel('Home', _selectedIndex == 0),
            child: const Icon(Icons.home_outlined),
          ),
          selectedIcon: const Icon(Icons.home),
          label: 'Home',
        ),
        NavigationDestination(
          icon: Semantics(
            label: AccessibilityHelper.navigationLabel('Lessons', _selectedIndex == 1),
            child: const Icon(Icons.school_outlined),
          ),
          selectedIcon: const Icon(Icons.school),
          label: 'Lessons',
        ),
        NavigationDestination(
          icon: Semantics(
            label: AccessibilityHelper.navigationLabel('Leaderboard', _selectedIndex == 2),
            child: const Icon(Icons.leaderboard_outlined),
          ),
          selectedIcon: const Icon(Icons.leaderboard),
          label: 'Leaderboard',
        ),
        NavigationDestination(
          icon: Semantics(
            label: AccessibilityHelper.navigationLabel('Profile', _selectedIndex == 3),
            child: const Icon(Icons.person_outline),
          ),
          selectedIcon: const Icon(Icons.person),
          label: 'Profile',
        ),
      ],
    );
  }
}
