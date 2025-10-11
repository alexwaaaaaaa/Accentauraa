import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interview Response Interface
 */
export interface IInterviewResponse {
  questionIndex: number;
  audioUrl?: string;
  videoUrl?: string;
  transcript?: string;
  analysis?: Record<string, any>;
}

/**
 * Interview Final Results Interface
 */
export interface IInterviewFinalResults {
  overallConfidence: number;
  grammarScore: number;
  feedback: string;
  mistakes: string[];
  strengths: string[];
}

/**
 * Interview Session Interface
 */
export interface IInterviewSession extends Document {
  sessionId: string;
  userId: string;
  interviewType: string;
  questions: string[];
  responses: IInterviewResponse[];
  finalResults?: IInterviewFinalResults;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Interview Response Schema
 */
const InterviewResponseSchema = new Schema<IInterviewResponse>(
  {
    questionIndex: {
      type: Number,
      required: true,
    },
    audioUrl: String,
    videoUrl: String,
    transcript: String,
    analysis: Schema.Types.Mixed,
  },
  { _id: false }
);

/**
 * Interview Final Results Schema
 */
const InterviewFinalResultsSchema = new Schema<IInterviewFinalResults>(
  {
    overallConfidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    grammarScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    feedback: {
      type: String,
      required: true,
    },
    mistakes: [String],
    strengths: [String],
  },
  { _id: false }
);

/**
 * Interview Session Schema
 */
const InterviewSessionSchema = new Schema<IInterviewSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    interviewType: {
      type: String,
      required: true,
    },
    questions: {
      type: [String],
      required: true,
    },
    responses: [InterviewResponseSchema],
    finalResults: InterviewFinalResultsSchema,
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
      required: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'interview_sessions',
  }
);

// Indexes for efficient querying
InterviewSessionSchema.index({ userId: 1, startedAt: -1 });
InterviewSessionSchema.index({ status: 1, startedAt: -1 });

export const InterviewSession = mongoose.model<IInterviewSession>(
  'InterviewSession',
  InterviewSessionSchema
);
