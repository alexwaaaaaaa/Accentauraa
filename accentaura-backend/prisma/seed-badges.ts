import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Placeholder icon URLs (can be replaced with actual S3/Firebase URLs later)
const PLACEHOLDER_ICON_BASE = 'https://placeholder.accentaura.com/badges';

// Badge definitions with requirements and metadata
const badges = [
  // Lesson Completion Badges
  {
    name: 'First Steps',
    description: 'Complete your first lesson',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/first_steps.png`,
    requirement: 'complete_1_lesson',
  },
  {
    name: 'Getting Started',
    description: 'Complete 5 lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/getting_started.png`,
    requirement: 'complete_5_lessons',
  },
  {
    name: 'Dedicated Learner',
    description: 'Complete 10 lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/dedicated_learner.png`,
    requirement: 'complete_10_lessons',
  },
  {
    name: 'Committed Student',
    description: 'Complete 25 lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/committed_student.png`,
    requirement: 'complete_25_lessons',
  },
  {
    name: 'Half Century',
    description: 'Complete 50 lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/half_century.png`,
    requirement: 'complete_50_lessons',
  },
  {
    name: 'Century Club',
    description: 'Complete 100 lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/century_club.png`,
    requirement: 'complete_100_lessons',
  },

  // Level Achievement Badges
  {
    name: 'Novice',
    description: 'Reach level 5',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/novice.png`,
    requirement: 'reach_level_5',
  },
  {
    name: 'Intermediate',
    description: 'Reach level 10',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/intermediate.png`,
    requirement: 'reach_level_10',
  },
  {
    name: 'Advanced',
    description: 'Reach level 20',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/advanced.png`,
    requirement: 'reach_level_20',
  },
  {
    name: 'Expert',
    description: 'Reach level 30',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/expert.png`,
    requirement: 'reach_level_30',
  },
  {
    name: 'Master',
    description: 'Reach level 50',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/master.png`,
    requirement: 'reach_level_50',
  },
  {
    name: 'Grandmaster',
    description: 'Reach level 75',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/grandmaster.png`,
    requirement: 'reach_level_75',
  },
  {
    name: 'Legend',
    description: 'Reach level 100',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/legend.png`,
    requirement: 'reach_level_100',
  },

  // Streak Badges
  {
    name: 'Consistent',
    description: 'Maintain a 3-day streak',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/consistent.png`,
    requirement: 'streak_3_days',
  },
  {
    name: 'Dedicated',
    description: 'Maintain a 7-day streak',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/dedicated.png`,
    requirement: 'streak_7_days',
  },
  {
    name: 'Committed',
    description: 'Maintain a 14-day streak',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/committed.png`,
    requirement: 'streak_14_days',
  },
  {
    name: 'Unstoppable',
    description: 'Maintain a 30-day streak',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/unstoppable.png`,
    requirement: 'streak_30_days',
  },
  {
    name: 'Legendary Streak',
    description: 'Maintain a 60-day streak',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/legendary_streak.png`,
    requirement: 'streak_60_days',
  },
  {
    name: 'Century Streak',
    description: 'Maintain a 100-day streak',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/century_streak.png`,
    requirement: 'streak_100_days',
  },

  // XP Milestone Badges
  {
    name: 'XP Collector',
    description: 'Earn 1,000 total XP',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/xp_collector.png`,
    requirement: 'earn_1000_xp',
  },
  {
    name: 'XP Enthusiast',
    description: 'Earn 5,000 total XP',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/xp_enthusiast.png`,
    requirement: 'earn_5000_xp',
  },
  {
    name: 'XP Master',
    description: 'Earn 10,000 total XP',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/xp_master.png`,
    requirement: 'earn_10000_xp',
  },
  {
    name: 'XP Legend',
    description: 'Earn 25,000 total XP',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/xp_legend.png`,
    requirement: 'earn_25000_xp',
  },
  {
    name: 'XP Champion',
    description: 'Earn 50,000 total XP',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/xp_champion.png`,
    requirement: 'earn_50000_xp',
  },

  // Lesson Type Specific Badges
  {
    name: 'Vocabulary Virtuoso',
    description: 'Complete 20 vocabulary lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/vocabulary_virtuoso.png`,
    requirement: 'complete_20_vocabulary_lessons',
  },
  {
    name: 'Grammar Guru',
    description: 'Complete 20 grammar lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/grammar_guru.png`,
    requirement: 'complete_20_grammar_lessons',
  },
  {
    name: 'Speaking Star',
    description: 'Complete 20 speaking lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/speaking_star.png`,
    requirement: 'complete_20_speaking_lessons',
  },
  {
    name: 'Listening Legend',
    description: 'Complete 20 listening lessons',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/listening_legend.png`,
    requirement: 'complete_20_listening_lessons',
  },

  // Performance Badges
  {
    name: 'Perfect Score',
    description: 'Complete a lesson with 100% score',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/perfect_score.png`,
    requirement: 'perfect_score_1_lesson',
  },
  {
    name: 'Perfectionist',
    description: 'Complete 10 lessons with 100% score',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/perfectionist.png`,
    requirement: 'perfect_score_10_lessons',
  },
  {
    name: 'Speed Learner',
    description: 'Complete a lesson in under 5 minutes',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/speed_learner.png`,
    requirement: 'complete_lesson_under_5_minutes',
  },

  // Special Achievement Badges
  {
    name: 'Early Bird',
    description: 'Complete a lesson before 8 AM',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/early_bird.png`,
    requirement: 'complete_lesson_before_8am',
  },
  {
    name: 'Night Owl',
    description: 'Complete a lesson after 10 PM',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/night_owl.png`,
    requirement: 'complete_lesson_after_10pm',
  },
  {
    name: 'Weekend Warrior',
    description: 'Complete 10 lessons on weekends',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/weekend_warrior.png`,
    requirement: 'complete_10_lessons_weekend',
  },

  // AI Practice Badges
  {
    name: 'Conversation Starter',
    description: 'Complete 10 AI chat sessions',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/conversation_starter.png`,
    requirement: 'complete_10_ai_chats',
  },
  {
    name: 'Speech Practitioner',
    description: 'Complete 10 speech analysis sessions',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/speech_practitioner.png`,
    requirement: 'complete_10_speech_analyses',
  },
  {
    name: 'Interview Ready',
    description: 'Complete 5 AI interview simulations',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/interview_ready.png`,
    requirement: 'complete_5_interviews',
  },
  {
    name: 'Confident Speaker',
    description: 'Achieve 90%+ confidence score in speech analysis',
    iconUrl: `${PLACEHOLDER_ICON_BASE}/confident_speaker.png`,
    requirement: 'speech_confidence_90_percent',
  },
];

// Main seed function
async function seedBadges() {
  console.log('🏆 Starting badge seed...');

  let successCount = 0;
  let errorCount = 0;

  for (const badge of badges) {
    try {
      await prisma.badge.upsert({
        where: { name: badge.name },
        update: {
          description: badge.description,
          iconUrl: badge.iconUrl,
          requirement: badge.requirement,
        },
        create: badge,
      });
      console.log(`  ✓ Seeded badge: ${badge.name} (${badge.requirement})`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Error seeding badge "${badge.name}":`, error);
      errorCount++;
    }
  }

  console.log(`\n✅ Badge seed completed!`);
  console.log(`   - Successfully seeded: ${successCount} badges`);
  console.log(`   - Errors: ${errorCount}`);

  // Display badge categories
  const categories = {
    'Lesson Completion': badges.filter(b => b.requirement.includes('complete_') && b.requirement.includes('_lesson')).length,
    'Level Achievement': badges.filter(b => b.requirement.includes('reach_level_')).length,
    'Streak': badges.filter(b => b.requirement.includes('streak_')).length,
    'XP Milestone': badges.filter(b => b.requirement.includes('earn_') && b.requirement.includes('_xp')).length,
    'Lesson Type': badges.filter(b => b.requirement.includes('vocabulary') || b.requirement.includes('grammar') || b.requirement.includes('speaking') || b.requirement.includes('listening')).length,
    'Performance': badges.filter(b => b.requirement.includes('perfect_score') || b.requirement.includes('under_')).length,
    'Special': badges.filter(b => b.requirement.includes('before_') || b.requirement.includes('after_') || b.requirement.includes('weekend')).length,
    'AI Practice': badges.filter(b => b.requirement.includes('ai_') || b.requirement.includes('speech_') || b.requirement.includes('interview')).length,
  };

  console.log('\n📊 Badge Categories:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`   - ${category}: ${count} badges`);
  });

  console.log(`\n💎 Total badges available: ${badges.length}`);
}

// Run the seed function
seedBadges()
  .catch((error) => {
    console.error('❌ Badge seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
