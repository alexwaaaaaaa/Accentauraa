# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Create Flutter project with proper folder structure (lib/data, lib/domain, lib/presentation, lib/core)
  - Add all required dependencies to pubspec.yaml (riverpod, go_router, dio, hive, flutter_secure_storage, cached_network_image, flutter_cache_manager, connectivity_plus, permission_handler, flutter_sound, audioplayers, flutter_tts, speech_to_text, google_sign_in, flutter_facebook_auth, firebase_core, firebase_analytics, firebase_crashlytics, fl_chart)
  - Configure Android and iOS permissions in manifests (camera, microphone, storage)
  - Initialize Firebase for both platforms with google-services.json and GoogleService-Info.plist
  - _Requirements: 1.1, 9.1, 9.6_

- [x] 2. Implement core data models
  - [x] 2.1 Create Lesson and Activity models with JSON serialization
    - Implement Lesson model with level, title, xpReward, activities, isLocked, isCompleted
    - Create abstract Activity class and concrete implementations (FlashcardActivity, McqActivity, FillBlankActivity, ListeningActivity, SpeakingActivity)
    - Add fromJson and toJson methods for all models
    - _Requirements: 3.2, 4.1_
  
  - [x] 2.2 Create UserProgress and Badge models
    - Implement UserProgress with userId, currentLevel, totalXp, streak, lastActivityDate, coins, badges, lessonProgress
    - Add streak calculation methods (shouldResetStreak, shouldIncrementStreak)
    - Create Badge model with id, name, description, iconUrl, earnedAt
    - Create LessonProgress model with completion tracking
    - _Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 2.3 Create authentication models
    - Implement AuthResult, User, and AuthProvider enum
    - Create Leaderboard models (LeaderboardData, LeaderboardEntry, UserRank)
    - _Requirements: 1.3, 1.4, 2.2_

- [x] 3. Implement API service layer
  - [x] 3.1 Create ApiService with Dio configuration
    - Set up Dio instance with base URL, timeout, interceptors
    - Implement authentication endpoints (loginWithCredentials, loginWithOAuth, refreshAuthToken, validateToken)
    - Add error handling and retry logic with exponential backoff
    - _Requirements: 1.3, 1.4, 9.1_
  
  - [x] 3.2 Add lesson and progress endpoints
    - Implement getLevels, getLevel methods
    - Implement saveProgress, getUserProgress methods
    - _Requirements: 3.1, 3.6, 4.1, 4.8_
  
  - [x] 3.3 Add AI and leaderboard endpoints
    - Implement sendChatMessage, analyzeSpeech methods
    - Implement startInterview, submitInterview methods
    - Implement getLeaderboard, getUserRank methods
    - _Requirements: 5.2, 5.4, 6.4, 2.2_

- [x] 4. Implement local storage and caching
  - [x] 4.1 Create CacheService with Hive
    - Initialize Hive and register adapters
    - Implement cacheLessonData, getCachedLesson methods
    - Implement queueProgressUpdate, getPendingUpdates, clearPendingUpdate methods
    - _Requirements: 8.1, 8.3_
  
  - [x] 4.2 Implement media caching with flutter_cache_manager
    - Set up custom cache manager for images and audio
    - Implement cacheMediaFile, getCachedMedia methods
    - Configure cache size limits and expiration
    - _Requirements: 8.1, 9.4_
  
  - [x] 4.3 Create SyncService for offline synchronization
    - Implement syncPendingUpdates with connectivity check
    - Add periodic sync timer (every 5 minutes)
    - Implement onConnectivityRestored handler
    - Add exponential backoff for failed syncs
    - _Requirements: 8.4, 8.5_

- [ ] 5. Implement repositories
  - [x] 5.1 Create UserRepository for authentication
    - Implement loginWithEmail, loginWithGoogle, loginWithFacebook methods
    - Add token management (getCachedToken, saveToken, clearToken, validateToken, refreshToken)
    - Integrate flutter_secure_storage for token storage
    - Implement logout method
    - _Requirements: 1.2, 1.3, 1.4, 9.2_
  
  - [x] 5.2 Create LessonRepository with offline support
    - Implement getLessons with cache-first strategy
    - Implement getLesson with forceRefresh option
    - Add watchLessons stream for real-time updates
    - _Requirements: 3.1, 3.6, 4.1, 8.2_
  
  - [x] 5.3 Create ProgressRepository with gamification logic
    - Implement getUserProgress with real-time streaming
    - Add updateProgress with offline queueing
    - Implement awardXp, updateStreak, resetStreak, awardBadge methods
    - Add syncPendingUpdates method
    - _Requirements: 2.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.3, 8.4_

- [ ] 6. Implement specialized services
  - [x] 6.1 Create AudioService for recording and playback
    - Initialize FlutterSoundRecorder and AudioPlayer
    - Implement startRecording, stopRecording methods
    - Implement playAudio, stopAudio methods
    - Add recordingStream for real-time status
    - _Requirements: 4.6, 5.3_
  
  - [x] 6.2 Create TtsService for text-to-speech
    - Initialize FlutterTts
    - Implement speak method with language support
    - Add stop and setVoice methods
    - Provide stateStream for TTS status
    - _Requirements: 5.5_
  
  - [x] 6.3 Create WebRtcService for video recording
    - Initialize camera and RTCVideoRenderer
    - Implement startRecording, stopRecording for video
    - Add proper resource disposal
    - _Requirements: 6.1, 6.3_
  
  - [x] 6.4 Create AnalyticsService for Firebase Analytics
    - Initialize Firebase Analytics
    - Implement event logging methods (logLogin, logLessonStarted, logLessonCompleted, logActivityCompleted, logXpEarned, logStreakIncremented, logBadgeAwarded, logInterviewCompleted)
    - Add setUserId and setUserProperty methods
    - _Requirements: 9.6_

- [x] 7. Set up state management with Riverpod
  - [x] 7.1 Create core providers
    - Implement authProvider (StateNotifierProvider for auth state)
    - Create userProgressProvider (StreamProvider for real-time progress)
    - Add connectivityProvider (StreamProvider for network status)
    - Create analyticsProvider
    - _Requirements: 1.6, 2.4_
  
  - [x] 7.2 Create lesson and activity providers
    - Implement lessonsProvider (FutureProvider.family for lesson ranges)
    - Create currentLessonProvider (StateProvider)
    - Add activityStateProvider (StateNotifierProvider.family for activity state)
    - _Requirements: 3.4, 4.7_
  
  - [x] 7.3 Create gamification providers
    - Implement streakProvider for streak management
    - Create leaderboardProvider (FutureProvider)
    - Add userRankProvider (FutureProvider)
    - _Requirements: 7.3, 2.2_

- [x] 8. Implement navigation with go_router
  - Create routerProvider with route configuration
  - Implement redirect logic for authentication
  - Define routes for all screens (splash, auth, home, lesson-tree, lesson/:level, ai-practice, interview, leaderboard, profile)
  - Add NavigatorObserver for analytics screen tracking
  - _Requirements: 1.2, 1.6, 2.3_

- [x] 9. Build authentication screens
  - [x] 9.1 Create SplashScreen
    - Display app logo with loading animation
    - Check for cached token and validate
    - Fetch user progress if token is valid
    - Navigate to auth or home based on token validity
    - _Requirements: 1.1, 1.2_
  
  - [x] 9.2 Create AuthScreen
    - Build email/password input fields with validation
    - Add Google and Facebook login buttons
    - Implement OAuth flow for social login
    - Add error handling with user-friendly messages
    - Show loading state during authentication
    - Navigate to home on success
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [x] 10. Build home dashboard
  - Create HomeScreen with user stats (avatar, XP bar, streak, coins)
  - Add quick action cards (Continue Last Level, AI Practice, Interview Mode, Leaderboard, Profile)
  - Implement bottom navigation bar
  - Add pull-to-refresh for syncing progress
  - Display offline indicator when network is unavailable
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 11. Build lesson tree screen
  - [x] 11.1 Create LessonTreeScreen layout
    - Build scrollable grid/tree view for 100 lesson nodes
    - Implement lazy loading (render visible + 10 above/below)
    - Add progress indicator at top
    - _Requirements: 3.1, 9.3_
  
  - [x] 11.2 Create LevelCard widget
    - Display level number, title, XP reward
    - Show lock/unlock icon and completion checkmark
    - Implement locked/unlocked visual states
    - Add tap handler to navigate to lesson player
    - Prevent interaction when locked
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 12. Build lesson player screen
  - [x] 12.1 Create LessonPlayerScreen structure
    - Build top bar with lesson title and progress indicator
    - Create activity area with dynamic rendering
    - Add bottom buttons (Skip, Check Answer, Continue)
    - Load all activities on lesson start
    - _Requirements: 4.1_
  
  - [x] 12.2 Create activity widgets
    - Build FlashcardWidget with swipeable card, image, audio button
    - Create McqWidget with question and radio button options
    - Build FillBlankWidget with text input and validation
    - Create ListeningWidget with audio player and questions
    - Build SpeakingWidget with record button, waveform, score display
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 12.3 Implement lesson completion flow
    - Award XP based on performance
    - Show completion screen with XP animation
    - Update progress and unlock next lesson
    - Queue updates when offline
    - Add "Next Lesson" button
    - _Requirements: 4.7, 4.8_

- [x] 13. Build AI practice screen
  - Create AIPracticeScreen with chat interface
  - Build message bubbles for user and AI
  - Add text input field with send button
  - Implement microphone button for voice input
  - Integrate speech_to_text for audio transcription
  - Add animated AI avatar (Rive/Lottie)
  - Implement TTS for AI responses
  - Handle offline state with appropriate messaging
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 14. Build interview screen
  - [x] 14.1 Create InterviewScreen with camera preview
    - Display front camera preview
    - Show animated AI interviewer overlay
    - Display question text at top
    - Add timer for response time
    - _Requirements: 6.1, 6.2_
  
  - [x] 14.2 Implement recording and submission
    - Add record button for audio/video capture
    - Submit audio/video to backend for analysis
    - Handle permission requests with explanations
    - Provide settings navigation if permissions denied
    - _Requirements: 6.3, 6.4, 6.7_
  
  - [x] 14.3 Create results screen
    - Display confidence score gauge
    - Show grammar score
    - Present actionable feedback text
    - Add performance charts using fl_chart
    - _Requirements: 6.5, 6.6_

- [x] 15. Build leaderboard screen
  - Create LeaderboardScreen with top 100 users
  - Display rank, username, avatar, total XP, streak for each entry
  - Highlight and pin user's own rank at top
  - Add pull-to-refresh functionality
  - Show percentile indicator
  - Implement "Find Me" button to scroll to user position
  - Handle offline mode with "Last updated" timestamp
  - _Requirements: 2.2_

- [x] 16. Build profile screen
  - Display user avatar and name
  - Show XP progress bar with current level
  - Add streak counter with calendar view
  - Create badge showcase grid
  - Display achievement notifications for new badges
  - Add settings and logout buttons
  - _Requirements: 7.6_

- [x] 17. Implement error handling
  - [x] 17.1 Add network error handling
    - Detect offline state with connectivity_plus
    - Display appropriate snackbars for offline mode
    - Implement automatic sync on connectivity restore
    - Add retry logic with exponential backoff
    - _Requirements: 8.4, 8.5_
  
  - [x] 17.2 Add permission error handling
    - Request permissions before accessing camera/microphone
    - Show explanation dialogs when permissions denied
    - Provide button to open app settings
    - _Requirements: 6.7_
  
  - [x] 17.3 Add API error handling
    - Handle 401 (clear token, navigate to auth)
    - Handle 404 (show "Content not available")
    - Handle 500 (show "Something went wrong")
    - Handle timeout errors
    - _Requirements: 1.5_

- [x] 18. Implement analytics and crash reporting
  - Initialize Firebase Crashlytics in main()
  - Set up unhandled exception capture
  - Add breadcrumb logging for debugging
  - Track all analytics events throughout the app
  - Ensure no sensitive data is logged
  - _Requirements: 9.6_

- [x] 19. Add accessibility features
  - Add semantic labels to all interactive elements
  - Provide text alternatives for images
  - Implement state change announcements
  - Support system font scaling
  - Ensure 4.5:1 contrast ratio for text
  - Make tap targets at least 44x44 points
  - _Requirements: 9.3_

- [x] 20. Performance optimization
  - Implement image compression before upload
  - Use WebP format for images
  - Add pagination for lesson list (load 20 at a time)
  - Debounce AI chat requests (500ms)
  - Use ListView.builder for long lists
  - Add RepaintBoundary for complex widgets
  - Dispose resources properly (audio players, camera)
  - _Requirements: 9.3, 9.4, 9.5_

- [ ]* 21. Write comprehensive tests
  - [ ]* 21.1 Write unit tests for models
    - Test JSON serialization/deserialization for all models
    - Test streak calculation logic in UserProgress
    - Test activity type parsing
    - _Requirements: 10.1_
  
  - [ ]* 21.2 Write unit tests for services
    - Mock Dio and test API service methods
    - Mock Hive and test cache service
    - Test audio recording and playback
    - Test sync service logic
    - _Requirements: 10.2_
  
  - [ ]* 21.3 Write unit tests for repositories
    - Mock services and test data fetching
    - Test offline caching logic
    - Test progress update queueing
    - Test XP and streak calculations
    - _Requirements: 10.2_
  
  - [ ]* 21.4 Write widget tests
    - Test LevelCard locked/unlocked states
    - Test activity widgets rendering and interactions
    - Test progress widgets (XP bar, streak counter, badges)
    - Test screen navigation
    - _Requirements: 10.3_
  
  - [ ]* 21.5 Write integration tests
    - Test auth flow (launch → login → home)
    - Test lesson flow (tree → lesson → activities → XP update)
    - Test speaking flow (record → submit → feedback)
    - Test offline flow (disable network → complete lesson → enable network → verify sync)
    - _Requirements: 10.4, 10.5_

- [ ] 22. Configure build variants and deployment
  - Set up development, staging, and production build variants
  - Configure environment-specific API endpoints
  - Add iOS usage descriptions for permissions
  - Declare Android permissions in manifest
  - Set up CI/CD pipeline for automated testing and deployment
  - _Requirements: 9.1_
