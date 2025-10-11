import mongoose, { Schema, Document } from 'mongoose';

/**
 * AI Interaction Log Interface
 */
export interface IAIInteractionLog extends Document {
  userId: string;
  type: 'chat' | 'speech' | 'interview';
  prompt?: string;
  response?: string;
  audioUrl?: string;
  videoUrl?: string;
  analysis?: {
    confidence?: number;
    grammarScore?: number;
    feedback?: string;
    pronunciation?: Record<string, any>;
    bodyLanguage?: Record<string, any>;
  };
  conversationId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * AI Interaction Log Schema
 */
const AIInteractionLogSchema = new Schema<IAIInteractionLog>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['chat', 'speech', 'interview'],
      required: true,
    },
    prompt: {
      type: String,
    },
    response: {
      type: String,
    },
    audioUrl: {
      type: String,
    },
    videoUrl: {
      type: String,
    },
    analysis: {
      confidence: Number,
      grammarScore: Number,
      feedback: String,
      pronunciation: Schema.Types.Mixed,
      bodyLanguage: Schema.Types.Mixed,
    },
    conversationId: {
      type: String,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'ai_interactions',
  }
);

// Indexes for efficient querying
AIInteractionLogSchema.index({ userId: 1, timestamp: -1 });
AIInteractionLogSchema.index({ type: 1, timestamp: -1 });

export const AIInteractionLog = mongoose.model<IAIInteractionLog>(
  'AIInteractionLog',
  AIInteractionLogSchema
);
