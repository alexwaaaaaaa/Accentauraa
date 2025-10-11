# Requirements Document

## Introduction

AccentAura is a mobile application built with Flutter that provides an interactive language learning experience focused on accent improvement and communication skills. The app features a 100-level lesson tree similar to Duolingo, gamification elements (XP, badges, streaks), AI-powered chat and voice practice, and AI video interview simulation with an animated interviewer that provides confidence analysis. The application must be backend-ready, offline-capable, performant, and production-grade.

## Requirements

### Requirement 1: User Authentication and Onboarding

**User Story:** As a new user, I want to create an account and log in securely, so that I can access my personalized learning progress across devices.

#### Acceptance Criteria

1. WHEN the app launches THEN the system SHALL display a splash screen that checks for cached authentication tokens
2. IF no valid token exists THEN the system SHALL navigate to the authentication screen
3. WHEN a user provides valid email credentials THEN the system SHALL authenticate and store the token securely using flutter_secure_storage
4. WHEN a user selects social login (Google/Facebook) THEN the system SHALL authenticate via OAuth and fetch user progress from the backend
5. IF authentication fails THEN the system SHALL display an error message with retry option
6. WHEN authentication succeeds THEN the system SHALL fetch user progress and navigate to the home dashboard

### Requirement 2: Home Dashboard and Progress Tracking

**User Story:** As a learner, I want to see my current progress, XP, streak, and quick access to key features, so that I stay motivated and can easily continue my learning journey.

#### Acceptance Criteria

1. WHEN the home dashboard loads THEN the system SHALL display user avatar, current XP, streak count, and coin balance
2. WHEN the dashboard is visible THEN the system SHALL provide quick access buttons for "Continue Last Level", "AI Practice", "Interview Mode", "Leaderboard", and "Profile"
3. WHEN a user taps "Continue Last Level" THEN the system SHALL navigate to the last incomplete lesson
4. WHEN progress data is updated THEN the system SHALL reflect changes in real-time on the dashboard
5. IF the user is offline THEN the system SHALL display cached progress data with an offline indicator

### Requirement 3: Lesson Tree with 100 Levels

**User Story:** As a learner, I want to navigate through a structured lesson tree with 100 levels, so that I can progressively improve my skills in a gamified manner.

#### Acceptance Criteria

1. WHEN the lesson tree screen loads THEN the system SHALL display all 100 lesson nodes in a scrollable tree or grid view
2. WHEN a lesson node is displayed THEN the system SHALL show its level number, title, XP reward, and lock/unlock status
3. IF a lesson is locked THEN the system SHALL prevent access until the previous level is completed
4. WHEN a user taps an unlocked lesson node THEN the system SHALL navigate to the Lesson Player for that level
5. WHEN a lesson is completed THEN the system SHALL unlock the next lesson and update the visual state
6. IF the user is offline THEN the system SHALL load lesson metadata from local cache

### Requirement 4: Lesson Player with Multiple Activity Types

**User Story:** As a learner, I want to complete various activity types (flashcards, MCQs, fill-in-the-blank, listening, speaking) within each lesson, so that I can practice different language skills.

#### Acceptance Criteria

1. WHEN a lesson starts THEN the system SHALL load all activities for that lesson from backend or cache
2. WHEN a flashcard activity is displayed THEN the system SHALL show word, image, and play audio on tap
3. WHEN an MCQ activity is displayed THEN the system SHALL show question and multiple choice options
4. WHEN a fill-in-the-blank activity is displayed THEN the system SHALL provide a text input field with validation
5. WHEN a listening activity is displayed THEN the system SHALL play audio and present related questions
6. WHEN a speaking activity is displayed THEN the system SHALL record user audio, send to backend, and display score with feedback
7. WHEN all activities are completed THEN the system SHALL award XP, update progress, and show completion screen
8. IF the user is offline THEN the system SHALL queue progress updates for later synchronization

### Requirement 5: AI Chat Practice

**User Story:** As a learner, I want to practice conversations with an AI chatbot using text and voice, so that I can improve my communication skills in a safe environment.

#### Acceptance Criteria

1. WHEN the AI Practice screen loads THEN the system SHALL display a chat interface with text input and microphone button
2. WHEN a user types a message THEN the system SHALL send it to the backend AI service and display the response
3. WHEN a user taps the microphone button THEN the system SHALL record audio using speech_to_text
4. WHEN audio recording completes THEN the system SHALL send the transcribed text to the backend and receive AI response
5. WHEN an AI response is received THEN the system SHALL display text and optionally play TTS audio
6. WHEN the chat is active THEN the system SHALL display an animated AI avatar using Rive or Lottie
7. IF the backend is unreachable THEN the system SHALL display an offline message and disable voice features

### Requirement 6: AI Video Interview Simulation

**User Story:** As a learner, I want to practice job interviews with an AI interviewer that analyzes my confidence and provides feedback, so that I can prepare for real-world interviews.

#### Acceptance Criteria

1. WHEN Interview Mode starts THEN the system SHALL display camera preview showing the user's front camera
2. WHEN the interview begins THEN the system SHALL display an animated AI interviewer that asks questions
3. WHEN a question is asked THEN the system SHALL record user audio and video responses
4. WHEN a user submits their response THEN the system SHALL send audio/video to the backend for analysis
5. WHEN analysis completes THEN the system SHALL display confidence score, grammar score, and actionable feedback
6. WHEN feedback is displayed THEN the system SHALL show charts visualizing performance metrics using fl_chart
7. IF camera or microphone permissions are denied THEN the system SHALL display permission request with explanation

### Requirement 7: Gamification and Rewards

**User Story:** As a learner, I want to earn XP, badges, and maintain streaks, so that I stay motivated and engaged with the learning process.

#### Acceptance Criteria

1. WHEN a user completes an activity THEN the system SHALL award XP based on performance
2. WHEN XP is earned THEN the system SHALL update the user's total XP and level if threshold is reached
3. WHEN a user completes lessons on consecutive days THEN the system SHALL increment the streak counter
4. IF a user misses a day THEN the system SHALL reset the streak counter to zero
5. WHEN specific milestones are reached THEN the system SHALL award badges and display achievement notification
6. WHEN the profile screen loads THEN the system SHALL display all earned badges, current level, and XP progress

### Requirement 8: Offline Capability and Data Synchronization

**User Story:** As a learner, I want to access lessons and practice offline, so that I can continue learning without an internet connection.

#### Acceptance Criteria

1. WHEN lessons are first accessed THEN the system SHALL cache lesson JSON, images, and audio using flutter_cache_manager and Hive
2. WHEN the user is offline THEN the system SHALL load cached lesson content and allow completion
3. WHEN progress is made offline THEN the system SHALL queue updates in local storage
4. WHEN internet connectivity is restored THEN the system SHALL automatically sync queued progress to the backend
5. IF sync fails THEN the system SHALL retry with exponential backoff
6. WHEN media files are accessed THEN the system SHALL prioritize cached versions to reduce data usage

### Requirement 9: Performance and Security

**User Story:** As a user, I want the app to be fast, secure, and reliable, so that I have a smooth learning experience without privacy concerns.

#### Acceptance Criteria

1. WHEN the app communicates with backend THEN the system SHALL use HTTPS for all API calls
2. WHEN authentication tokens are stored THEN the system SHALL use flutter_secure_storage for encryption
3. WHEN lesson nodes are displayed THEN the system SHALL lazy load content to optimize memory usage
4. WHEN media files are loaded THEN the system SHALL compress images and audio to reduce bandwidth
5. WHEN errors occur THEN the system SHALL log to Sentry or Firebase Crashlytics without exposing sensitive data
6. WHEN user actions are tracked THEN the system SHALL send analytics events to Firebase Analytics

### Requirement 10: Testing and Quality Assurance

**User Story:** As a developer, I want comprehensive test coverage, so that the app is reliable and maintainable.

#### Acceptance Criteria

1. WHEN models are created THEN the system SHALL have unit tests validating data parsing and business logic
2. WHEN services are implemented THEN the system SHALL have unit tests for API calls, caching, and audio handling
3. WHEN UI components are built THEN the system SHALL have widget tests for LevelCard, LessonPlayer, and activity widgets
4. WHEN critical user flows exist THEN the system SHALL have integration tests covering login → lesson → speak → submit
5. WHEN code is committed THEN the system SHALL pass all automated tests before deployment
