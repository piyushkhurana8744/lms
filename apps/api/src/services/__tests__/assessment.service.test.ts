import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssessmentService } from '../assessment.service';
import { AssessmentModel, AssessmentSubmissionModel } from '@edtech/database';
import mongoose from 'mongoose';

vi.mock('@edtech/database', () => ({
  runInTransaction: vi.fn(async (work: any) => work(undefined)),
  AssessmentModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn()
  },
  AssessmentSubmissionModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn()
  },
  NotificationIntentModel: { updateOne: vi.fn().mockResolvedValue({}) }
}));

vi.mock('../audit.service', () => ({
  AuditService: {
    logEvent: vi.fn().mockResolvedValue(true)
  }
}));

describe('Assessment & Quizzes Service Test Suite', () => {
  const tenantId = new mongoose.Types.ObjectId().toString();
  const actorId = new mongoose.Types.ObjectId().toString();
  const assessmentId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. should create an independent quiz with questions', async () => {
    (AssessmentModel.findOne as any).mockResolvedValue(null);
    (AssessmentModel.create as any).mockResolvedValue({
      _id: assessmentId,
      tenantId,
      type: 'QUIZ',
      scope: 'INDEPENDENT',
      title: 'SEO Master Quiz',
      slug: 'seo-master-quiz',
      showOnWebsite: true,
      questions: [{ questionText: 'Q1', options: [{ text: 'A', isCorrect: true }] }]
    });

    const result = await AssessmentService.createAssessment(
      tenantId,
      {
        type: 'QUIZ',
        scope: 'INDEPENDENT',
        title: 'SEO Master Quiz',
        description: 'Test your SEO skills',
        showOnWebsite: true,
        questions: [{ questionText: 'Q1', questionType: 'MCQ', options: [{ text: 'A', isCorrect: true }], points: 10 }]
      },
      actorId
    );

    expect(result.title).toBe('SEO Master Quiz');
    expect(result.scope).toBe('INDEPENDENT');
    expect(result.showOnWebsite).toBe(true);
  });

  it('2. should accurately auto-grade a quiz submission', async () => {
    const mockQuiz = {
      _id: assessmentId,
      tenantId,
      type: 'QUIZ',
      passingScorePercent: 60,
      maxAttempts: 3,
      title: 'Digital Marketing Quiz',
      questions: [
        {
          points: 50,
          options: [
            { text: 'Correct Opt', isCorrect: true },
            { text: 'Wrong Opt', isCorrect: false }
          ]
        },
        {
          points: 50,
          options: [
            { text: 'Wrong 1', isCorrect: false },
            { text: 'Correct 2', isCorrect: true }
          ]
        }
      ]
    };

    (AssessmentModel.findOne as any).mockResolvedValue(mockQuiz);
    (AssessmentSubmissionModel.countDocuments as any).mockResolvedValue(0);
    (AssessmentSubmissionModel.create as any).mockResolvedValue({
      _id: new mongoose.Types.ObjectId().toString()
    });

    // Student answers Q0 with index 0 (correct), Q1 with index 0 (wrong) => 50/100 points = 50% (Fail if threshold 60)
    const result = await AssessmentService.submitQuiz({
      tenantId,
      assessmentId,
      userId: actorId,
      answers: [
        { questionIndex: 0, selectedOptionIndex: 0 },
        { questionIndex: 1, selectedOptionIndex: 0 }
      ]
    });

    expect(result.score).toBe(50);
    expect(result.maxScore).toBe(100);
    expect(result.scorePercentage).toBe(50);
    expect(result.passed).toBe(false);
  });

  it('3. should pass quiz when score meets or exceeds passingScorePercent', async () => {
    const mockQuiz = {
      _id: assessmentId,
      tenantId,
      type: 'QUIZ',
      passingScorePercent: 60,
      maxAttempts: 3,
      title: 'Digital Marketing Quiz',
      questions: [
        {
          points: 50,
          options: [
            { text: 'Correct Opt', isCorrect: true },
            { text: 'Wrong Opt', isCorrect: false }
          ]
        },
        {
          points: 50,
          options: [
            { text: 'Wrong 1', isCorrect: false },
            { text: 'Correct 2', isCorrect: true }
          ]
        }
      ]
    };

    (AssessmentModel.findOne as any).mockResolvedValue(mockQuiz);
    (AssessmentSubmissionModel.countDocuments as any).mockResolvedValue(0);
    (AssessmentSubmissionModel.create as any).mockResolvedValue({
      _id: new mongoose.Types.ObjectId().toString()
    });

    // Student answers both correctly => 100/100 points = 100%
    const result = await AssessmentService.submitQuiz({
      tenantId,
      assessmentId,
      userId: actorId,
      answers: [
        { questionIndex: 0, selectedOptionIndex: 0 },
        { questionIndex: 1, selectedOptionIndex: 1 }
      ]
    });

    expect(result.score).toBe(100);
    expect(result.scorePercentage).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('4. should submit practical assignment and allow trainer grading', async () => {
    const mockAssignment = {
      _id: assessmentId,
      tenantId,
      type: 'ASSIGNMENT',
      title: 'Growth Capstone',
      assignmentDetails: { maxScore: 100 }
    };

    (AssessmentModel.findOne as any).mockResolvedValue(mockAssignment);
    (AssessmentSubmissionModel.countDocuments as any).mockResolvedValue(0);

    const mockSubmissionDoc: any = {
      _id: 'sub-1',
      tenantId,
      type: 'ASSIGNMENT',
      maxScore: 100,
      userId: actorId,
      score: 0,
      status: 'SUBMITTED',
      revision: 0,
      gradingHistory: [],
      save: vi.fn().mockResolvedValue(true)
    };

    (AssessmentSubmissionModel.create as any).mockResolvedValue(mockSubmissionDoc);
    (AssessmentSubmissionModel.findOne as any).mockReturnValue({ session: vi.fn().mockResolvedValue(mockSubmissionDoc) });
    (AssessmentSubmissionModel.findOneAndUpdate as any).mockResolvedValue({
      ...mockSubmissionDoc,
      score: 95,
      scorePercentage: 95,
      passed: true,
      status: 'GRADED',
      feedback: 'Outstanding campaign wireframes!',
      revision: 1
    });

    const submission = await AssessmentService.submitAssignment({
      tenantId,
      assessmentId,
      userId: actorId,
      linkUrl: 'https://drive.google.com/my-deck'
    });

    expect(submission.status).toBe('SUBMITTED');

    // Trainer grades the submission
    const graded = await AssessmentService.gradeSubmission({
      tenantId,
      submissionId: 'sub-1',
      score: 95,
      feedback: 'Outstanding campaign wireframes!',
      graderId: actorId
    });

    expect(graded.score).toBe(95);
    expect(graded.scorePercentage).toBe(95);
    expect(graded.passed).toBe(true);
    expect(graded.status).toBe('GRADED');
    expect(graded.feedback).toBe('Outstanding campaign wireframes!');
  });
});
