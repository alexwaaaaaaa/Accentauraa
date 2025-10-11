import { PrismaClient, LessonType } from '@prisma/client';

const prisma = new PrismaClient();

// Placeholder media URLs (can be replaced with actual S3/Firebase URLs later)
const PLACEHOLDER_IMAGE_BASE = 'https://placeholder.accentaura.com/images';
const PLACEHOLDER_AUDIO_BASE = 'https://placeholder.accentaura.com/audio';

// Helper function to generate flashcard activities
function generateFlashcardActivities(level: number, count: number = 10) {
  const activities: any[] = [];
  for (let i = 0; i < count; i++) {
    activities.push({
      type: 'flashcard',
      word: `word_${level}_${i + 1}`,
      definition: `Definition for word ${i + 1} at level ${level}`,
      example: `Example sentence using word ${i + 1}`,
      imageUrl: `${PLACEHOLDER_IMAGE_BASE}/flashcard_${level}_${i + 1}.jpg`,
      audioUrl: `${PLACEHOLDER_AUDIO_BASE}/word_${level}_${i + 1}.mp3`,
    });
  }
  return activities;
}

// Helper function to generate MCQ activities
function generateMCQActivities(level: number, count: number = 5) {
  const activities: any[] = [];
  for (let i = 0; i < count; i++) {
    activities.push({
      type: 'mcq',
      question: `Question ${i + 1} for level ${level}: Choose the correct answer`,
      options: [
        `Option A for question ${i + 1}`,
        `Option B for question ${i + 1}`,
        `Option C for question ${i + 1}`,
        `Option D for question ${i + 1}`,
      ],
      correctAnswer: Math.floor(Math.random() * 4), // Random correct answer (0-3)
      explanation: `Explanation for question ${i + 1} at level ${level}`,
      imageUrl: `${PLACEHOLDER_IMAGE_BASE}/mcq_${level}_${i + 1}.jpg`,
    });
  }
  return activities;
}

// Helper function to generate fill-in-blank activities
function generateFillInBlankActivities(level: number, count: number = 5) {
  const activities: any[] = [];
  for (let i = 0; i < count; i++) {
    activities.push({
      type: 'fill_in_blank',
      sentence: `This is a sentence with a _____ word at level ${level}`,
      correctAnswer: `missing_${i + 1}`,
      hints: [`Hint 1 for blank ${i + 1}`, `Hint 2 for blank ${i + 1}`],
      audioUrl: `${PLACEHOLDER_AUDIO_BASE}/sentence_${level}_${i + 1}.mp3`,
    });
  }
  return activities;
}

// Helper function to generate listening activities
function generateListeningActivities(level: number, count: number = 3) {
  const activities: any[] = [];
  for (let i = 0; i < count; i++) {
    activities.push({
      type: 'listening',
      audioUrl: `${PLACEHOLDER_AUDIO_BASE}/listening_${level}_${i + 1}.mp3`,
      transcript: `This is the transcript for listening exercise ${i + 1} at level ${level}`,
      questions: [
        {
          question: `What is the main topic of the audio?`,
          options: ['Topic A', 'Topic B', 'Topic C', 'Topic D'],
          correctAnswer: 0,
        },
        {
          question: `What does the speaker mention about...?`,
          options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
          correctAnswer: 1,
        },
      ],
      duration: 60 + i * 10, // Duration in seconds
    });
  }
  return activities;
}

// Helper function to generate speaking activities
function generateSpeakingActivities(level: number, count: number = 3) {
  const activities: any[] = [];
  for (let i = 0; i < count; i++) {
    activities.push({
      type: 'speaking',
      prompt: `Speaking prompt ${i + 1} for level ${level}: Describe your daily routine`,
      sampleAudioUrl: `${PLACEHOLDER_AUDIO_BASE}/speaking_sample_${level}_${i + 1}.mp3`,
      targetWords: [`word1_${level}`, `word2_${level}`, `word3_${level}`],
      minDuration: 30, // Minimum speaking duration in seconds
      maxDuration: 120, // Maximum speaking duration in seconds
      rubric: {
        pronunciation: 'Clear pronunciation of target words',
        fluency: 'Smooth delivery without long pauses',
        grammar: 'Correct use of present tense',
        vocabulary: 'Use of target vocabulary words',
      },
    });
  }
  return activities;
}

// Generate lesson content based on type
function generateLessonContent(level: number, type: LessonType) {
  switch (type) {
    case LessonType.VOCABULARY:
      return {
        activities: [
          ...generateFlashcardActivities(level, 12),
          ...generateMCQActivities(level, 5),
        ],
      };
    case LessonType.GRAMMAR:
      return {
        activities: [
          ...generateMCQActivities(level, 8),
          ...generateFillInBlankActivities(level, 7),
        ],
      };
    case LessonType.SPEAKING:
      return {
        activities: [
          ...generateSpeakingActivities(level, 5),
          ...generateFlashcardActivities(level, 5),
        ],
      };
    case LessonType.LISTENING:
      return {
        activities: [
          ...generateListeningActivities(level, 5),
          ...generateMCQActivities(level, 5),
        ],
      };
    case LessonType.MIXED:
      return {
        activities: [
          ...generateFlashcardActivities(level, 5),
          ...generateMCQActivities(level, 3),
          ...generateFillInBlankActivities(level, 3),
          ...generateListeningActivities(level, 2),
          ...generateSpeakingActivities(level, 2),
        ],
      };
    default:
      return { activities: [] };
  }
}

// Generate lesson title based on level and type
function generateLessonTitle(level: number, type: LessonType): string {
  const themes = [
    'Greetings and Introductions',
    'Daily Routines',
    'Food and Dining',
    'Travel and Transportation',
    'Work and Career',
    'Health and Wellness',
    'Shopping and Money',
    'Family and Relationships',
    'Hobbies and Interests',
    'Weather and Seasons',
    'Technology and Communication',
    'Education and Learning',
    'Entertainment and Media',
    'Sports and Fitness',
    'Home and Living',
    'Nature and Environment',
    'Culture and Traditions',
    'Business and Finance',
    'Social Issues',
    'Advanced Conversations',
  ];

  const themeIndex = Math.floor((level - 1) / 5) % themes.length;
  const subLevel = ((level - 1) % 5) + 1;

  const typePrefix = {
    [LessonType.VOCABULARY]: 'Vocabulary',
    [LessonType.GRAMMAR]: 'Grammar',
    [LessonType.SPEAKING]: 'Speaking',
    [LessonType.LISTENING]: 'Listening',
    [LessonType.MIXED]: 'Practice',
  };

  return `${typePrefix[type]}: ${themes[themeIndex]} (Part ${subLevel})`;
}

// Calculate XP reward based on level and type
function calculateXPReward(level: number, type: LessonType): number {
  const baseXP = 50;
  const levelMultiplier = 1 + (level - 1) * 0.1; // Increases by 10% per level
  
  const typeMultiplier = {
    [LessonType.VOCABULARY]: 1.0,
    [LessonType.GRAMMAR]: 1.2,
    [LessonType.SPEAKING]: 1.5,
    [LessonType.LISTENING]: 1.3,
    [LessonType.MIXED]: 1.4,
  };

  return Math.round(baseXP * levelMultiplier * typeMultiplier[type]);
}

// Generate media URLs for a lesson
function generateMediaUrls(level: number, type: LessonType): string[] {
  const urls: string[] = [];
  
  // Add thumbnail
  urls.push(`${PLACEHOLDER_IMAGE_BASE}/lesson_${level}_thumbnail.jpg`);
  
  // Add type-specific media
  if (type === LessonType.LISTENING || type === LessonType.MIXED) {
    urls.push(`${PLACEHOLDER_AUDIO_BASE}/lesson_${level}_intro.mp3`);
  }
  
  if (type === LessonType.VOCABULARY || type === LessonType.MIXED) {
    urls.push(`${PLACEHOLDER_IMAGE_BASE}/lesson_${level}_vocabulary.jpg`);
  }
  
  return urls;
}

// Main seed function
async function seedLessons() {
  console.log('🌱 Starting lesson seed...');

  // Define lesson type distribution (cycle through types)
  const lessonTypes = [
    LessonType.VOCABULARY,
    LessonType.GRAMMAR,
    LessonType.LISTENING,
    LessonType.SPEAKING,
    LessonType.MIXED,
  ];

  const lessons: any[] = [];

  // Generate 100 lessons
  for (let level = 1; level <= 100; level++) {
    const type = lessonTypes[(level - 1) % lessonTypes.length];
    const title = generateLessonTitle(level, type);
    const xpReward = calculateXPReward(level, type);
    const content = generateLessonContent(level, type);
    const mediaUrls = generateMediaUrls(level, type);

    lessons.push({
      level,
      title,
      type,
      xpReward,
      content,
      mediaUrls,
    });

    console.log(`  ✓ Generated lesson ${level}: ${title} (${type}, ${xpReward} XP)`);
  }

  // Insert lessons into database
  console.log('\n📦 Inserting lessons into database...');
  
  let successCount = 0;
  let errorCount = 0;

  for (const lesson of lessons) {
    try {
      await prisma.lesson.upsert({
        where: { level: lesson.level },
        update: lesson,
        create: lesson,
      });
      successCount++;
    } catch (error) {
      console.error(`  ✗ Error inserting lesson ${lesson.level}:`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Seed completed!`);
  console.log(`   - Successfully inserted: ${successCount} lessons`);
  console.log(`   - Errors: ${errorCount}`);
  
  // Display summary statistics
  const lessonStats = await prisma.lesson.groupBy({
    by: ['type'],
    _count: true,
  });

  console.log('\n📊 Lesson Statistics:');
  lessonStats.forEach((stat) => {
    console.log(`   - ${stat.type}: ${stat._count} lessons`);
  });

  const totalXP = lessons.reduce((sum, lesson) => sum + lesson.xpReward, 0);
  console.log(`\n💎 Total XP available: ${totalXP}`);
}

// Run the seed function
seedLessons()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
