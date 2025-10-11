import mongoose, { Schema, Document } from 'mongoose';

/**
 * Feedback Interface
 */
export interface IFeedback extends Document {
  userId: string;
  lessonId?: string;
  type: 'bug' | 'feature' | 'general';
  message: string;
  rating?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * Feedback Schema
 */
const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    lessonId: {
      type: String,
      index: true,
    },
    type: {
      type: String,
      enum: ['bug', 'feature', 'general'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'feedback',
  }
);

// Indexes for efficient querying
FeedbackSchema.index({ type: 1, createdAt: -1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>('Feedback', FeedbackSchema);
