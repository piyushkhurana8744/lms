import { Schema, model, Document, Types } from 'mongoose';
import { tenantIsolationPlugin } from '../plugin/tenantIsolationPlugin';

export type AssessmentType = 'QUIZ' | 'ASSIGNMENT';
export type AssessmentScope = 'INDEPENDENT' | 'COURSE_LINKED' | 'BATCH_LINKED';
export type AssessmentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface IQuizOption {
  text: string;
  isCorrect: boolean;
}

export interface IQuizQuestion {
  questionText: string;
  questionType: 'MCQ' | 'TRUE_FALSE' | 'SHORT_TEXT';
  options: IQuizOption[];
  explanation?: string;
  points: number;
}

export interface IAssignmentDetails {
  submissionType: 'FILE_UPLOAD' | 'URL_LINK' | 'TEXT';
  maxScore: number;
  rubric?: string;
  dueDate?: Date;
  attachmentUrls?: string[];
}

export interface IAssessmentDocument extends Document {
  tenantId: Types.ObjectId;
  type: AssessmentType;
  scope: AssessmentScope;
  courseId?: Types.ObjectId | null;
  moduleId?: Types.ObjectId | null;
  batchId?: Types.ObjectId | null;
  title: string;
  slug: string;
  description: string;
  instructions?: string;
  showOnWebsite: boolean;
  status: AssessmentStatus;
  durationMinutes?: number;
  passingScorePercent?: number;
  maxAttempts?: number;
  questions?: IQuizQuestion[];
  assignmentDetails?: IAssignmentDetails;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuizOptionSchema = new Schema<IQuizOption>(
  {
    text: { type: String, required: true },
    isCorrect: { type: Boolean, default: false }
  },
  { _id: false }
);

const QuizQuestionSchema = new Schema<IQuizQuestion>(
  {
    questionText: { type: String, required: true },
    questionType: {
      type: String,
      enum: ['MCQ', 'TRUE_FALSE', 'SHORT_TEXT'],
      default: 'MCQ'
    },
    options: [QuizOptionSchema],
    explanation: String,
    points: { type: Number, default: 1 }
  },
  { _id: false }
);

const AssignmentDetailsSchema = new Schema<IAssignmentDetails>(
  {
    submissionType: {
      type: String,
      enum: ['FILE_UPLOAD', 'URL_LINK', 'TEXT'],
      default: 'FILE_UPLOAD'
    },
    maxScore: { type: Number, default: 100 },
    rubric: String,
    dueDate: Date,
    attachmentUrls: [{ type: String }]
  },
  { _id: false }
);

const AssessmentSchema = new Schema<IAssessmentDocument>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    type: { type: String, enum: ['QUIZ', 'ASSIGNMENT'], required: true, index: true },
    scope: {
      type: String,
      enum: ['INDEPENDENT', 'COURSE_LINKED', 'BATCH_LINKED'],
      default: 'INDEPENDENT',
      index: true
    },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course', default: null, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'CourseModule', default: null },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', default: null, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, required: true, trim: true },
    instructions: { type: String, trim: true },
    showOnWebsite: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true
    },
    durationMinutes: { type: Number, default: 30 },
    passingScorePercent: { type: Number, default: 60 },
    maxAttempts: { type: Number, default: 3 },
    questions: [QuizQuestionSchema],
    assignmentDetails: AssignmentDetailsSchema,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

AssessmentSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
AssessmentSchema.index({ tenantId: 1, type: 1, status: 1 });
AssessmentSchema.index({ tenantId: 1, showOnWebsite: 1 });

AssessmentSchema.plugin(tenantIsolationPlugin);

export const AssessmentModel = model<IAssessmentDocument>('Assessment', AssessmentSchema);
