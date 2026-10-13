import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type SubmissionStatus = 'SUBMITTED' | 'IN_REVIEW' | 'GRADED';

export interface IQuizAnswerItem {
  questionIndex: number;
  selectedOptionIndex: number;
  isCorrect: boolean;
  earnedPoints: number;
}

export interface IAssignmentSubmissionContent {
  submissionText?: string;
  fileUrl?: string;
  fileName?: string;
  linkUrl?: string;
}

export interface IAssessmentSubmissionDocument extends Document {
  tenantId: Types.ObjectId;
  assessmentId: Types.ObjectId;
  userId: Types.ObjectId;
  batchId?: Types.ObjectId | null;
  courseId?: Types.ObjectId | null;
  type: 'QUIZ' | 'ASSIGNMENT';
  attemptNumber: number;
  quizAnswers?: IQuizAnswerItem[];
  assignmentSubmission?: IAssignmentSubmissionContent;
  score: number;
  maxScore: number;
  scorePercentage: number;
  passed?: boolean;
  status: SubmissionStatus;
  feedback?: string;
  gradedBy?: Types.ObjectId | null;
  gradedAt?: Date | null;
  timeSpentSeconds?: number;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  revision: number;
  gradingHistory: Array<{ previousScore: number; newScore: number; graderId: Types.ObjectId; gradedAt: Date; feedback?: string }>;
}

const QuizAnswerItemSchema = new Schema<IQuizAnswerItem>(
  {
    questionIndex: { type: Number, required: true },
    selectedOptionIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    earnedPoints: { type: Number, default: 0 }
  },
  { _id: false }
);

const AssignmentSubmissionContentSchema = new Schema<IAssignmentSubmissionContent>(
  {
    submissionText: String,
    fileUrl: String,
    fileName: String,
    linkUrl: String
  },
  { _id: false }
);

const AssessmentSubmissionSchema = new Schema<IAssessmentSubmissionDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    assessmentId: { type: Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    type: { type: String, enum: ['QUIZ', 'ASSIGNMENT'], required: true },
    attemptNumber: { type: Number, default: 1 },
    quizAnswers: [QuizAnswerItemSchema],
    assignmentSubmission: AssignmentSubmissionContentSchema,
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 100 },
    scorePercentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['SUBMITTED', 'IN_REVIEW', 'GRADED'],
      default: 'SUBMITTED',
      index: true
    },
    feedback: String,
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    gradedAt: { type: Date, default: null },
    timeSpentSeconds: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
    ,revision: { type: Number, default: 0, required: true }
    ,gradingHistory: [{ previousScore: Number, newScore: Number, graderId: { type: Schema.Types.ObjectId, ref: 'User' }, gradedAt: Date, feedback: String, _id: false }]
  },
  { timestamps: true }
);

AssessmentSubmissionSchema.index({ tenantId: 1, assessmentId: 1, userId: 1 });
AssessmentSubmissionSchema.index({ tenantId: 1, userId: 1, status: 1 });
AssessmentSubmissionSchema.index({ tenantId: 1, batchId: 1, status: 1, submittedAt: 1 });

AssessmentSubmissionSchema.plugin(tenantIsolationPlugin);

export const AssessmentSubmissionModel = model<IAssessmentSubmissionDocument>(
  'AssessmentSubmission',
  AssessmentSubmissionSchema
);
