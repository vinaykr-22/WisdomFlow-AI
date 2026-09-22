import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Plus,
  ChevronLeft,
  MessageSquare,
  FileText,
  Check,
} from 'lucide-react';
import { PageContainer } from '../components/layout';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { useToast } from '../components/ui/useToast';

interface Doc {
  id: string;
  title: string;
}

interface Question {
  id: string;
  question_index: number;
  question_type: string;
  question: string;
  options: Record<string, string> | null;
}

interface Result {
  question_id: string;
  question: string;
  your_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

interface QuizListItem {
  id: string;
  title: string;
  difficulty: string;
  question_count: number;
  created_at: string;
}

export default function Quizzes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Data & Selection
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docId, setDocId] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Active Quiz State
  const [quizId, setQuizId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState<string>('Knowledge Check');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Results State
  const [score, setScore] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'missed'>('all');

  // Past Quizzes List
  const [quizList, setQuizList] = useState<QuizListItem[]>([]);
  const [view, setView] = useState<'take' | 'results' | 'create' | 'list'>('create');

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      const [docsRes, listRes] = await Promise.all([
        api.get('/documents'),
        api.get('/quizzes').catch(() => ({ data: { quizzes: [] } })),
      ]);

      const fetchedDocs: Doc[] = docsRes.data.documents || [];
      setDocs(fetchedDocs);
      const fetchedQuizzes: QuizListItem[] = listRes.data.quizzes || [];
      setQuizList(fetchedQuizzes);

      // Check query param
      const queryDocId = searchParams.get('docId') || searchParams.get('doc');
      if (queryDocId) {
        setDocId(queryDocId);
        setView('create');
      } else if (fetchedQuizzes.length > 0) {
        setView('list');
      } else {
        setView('create');
      }
    } catch {
      toast.error('Failed to load quiz data');
    }
  }, [searchParams, toast]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Generate new quiz
  const handleGenerate = async () => {
    if (!docId) {
      toast.warning('Select Document', 'Please select a document to test.');
      return;
    }

    setLoading(true);
    setAnswers({});
    setScore(null);
    setResults([]);
    setCurrentQIndex(0);

    try {
      const { data } = await api.post('/quizzes/generate', {
        document_id: docId,
        difficulty,
        question_count: count,
      });

      setQuizId(data.id);
      const { data: quizData } = await api.get(`/quizzes/${data.id}`);
      setQuizTitle(quizData.title || 'Knowledge Assessment');
      setQuestions(quizData.questions || []);
      setView('take');
      toast.success('Quiz Ready', `Generated ${quizData.questions.length} questions`);

      // Refresh list
      api.get('/quizzes').then((res) => setQuizList(res.data.quizzes || [])).catch(() => {});
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to generate quiz';
      toast.error('Generation Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Open an existing quiz
  const openExistingQuiz = async (id: string) => {
    setLoading(true);
    setAnswers({});
    setScore(null);
    setResults([]);
    setCurrentQIndex(0);

    try {
      const { data } = await api.get(`/quizzes/${id}`);
      setQuizId(data.id);
      setQuizTitle(data.title || 'Knowledge Assessment');
      setDifficulty(data.difficulty || 'medium');
      setQuestions(data.questions || []);
      setView('take');
    } catch {
      toast.error('Load Error', 'Could not open selected quiz');
    } finally {
      setLoading(false);
    }
  };

  // Select an answer option
  const selectOption = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
  };

  // Submit quiz
  const handleSubmit = async () => {
    if (!quizId) return;
    setSubmitting(true);

    try {
      const { data } = await api.post(`/quizzes/${quizId}/submit`, { answers });
      setScore(data.score);
      setResults(data.results || []);
      setView('results');
      toast.success('Assessment Completed', `Score: ${Math.round(data.score)}%`);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to submit quiz';
      toast.error('Submission Failed', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Retake current quiz
  const handleRetake = () => {
    setAnswers({});
    setScore(null);
    setResults([]);
    setCurrentQIndex(0);
    setView('take');
  };

  // Keyboard navigation for taking quiz
  useEffect(() => {
    if (view !== 'take' || questions.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const currentQ = questions[currentQIndex];
      if (!currentQ) return;

      // Handle numbers 1-4
      if (['1', '2', '3', '4'].includes(e.key)) {
        const num = parseInt(e.key, 10);
        if (currentQ.question_type === 'true_false') {
          if (num === 1) selectOption(currentQ.id, 'True');
          if (num === 2) selectOption(currentQ.id, 'False');
        } else if (currentQ.options) {
          const keys = Object.keys(currentQ.options);
          if (keys[num - 1]) selectOption(currentQ.id, keys[num - 1]);
        }
      }

      // Handle letter keys A, B, C, D
      const upper = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(upper)) {
        if (currentQ.options && currentQ.options[upper]) {
          selectOption(currentQ.id, upper);
        }
      }

      // Arrow keys
      if (e.key === 'ArrowLeft' && currentQIndex > 0) {
        setCurrentQIndex((prev) => prev - 1);
      }
      if (e.key === 'ArrowRight' && currentQIndex < questions.length - 1) {
        setCurrentQIndex((prev) => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, questions, currentQIndex]);

  // 1. RESULTS VIEW: Scannable Assessment Evaluation
  if (view === 'results' && results.length > 0) {
    const total = results.length;
    const correctCount = results.filter((r) => r.is_correct).length;
    const incorrectCount = total - correctCount;
    const roundedScore = Math.round(score ?? 0);
    const missedResults = results.filter((r) => !r.is_correct);

    const displayedResults = reviewFilter === 'missed' ? missedResults : results;

    // Compose missed topics string for tutor review action
    const missedTopicsSummary = missedResults
      .slice(0, 3)
      .map((r) => r.question)
      .join('; ');

    return (
      <PageContainer
        title="Quiz Results"
        description="Performance breakdown and conceptual explanations for review."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setView('list')}>
              All Quizzes
            </Button>
            <Button size="sm" variant="secondary" onClick={handleRetake} leftIcon={<RotateCcw size={14} />}>
              Retake Quiz
            </Button>
          </div>
        }
      >
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* Focused Score Summary Strip */}
          <Card className="p-5 border-[var(--color-border)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl ${
                    roundedScore >= 70
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {roundedScore}%
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--color-text)]">
                    {roundedScore >= 80
                      ? 'Excellent comprehension'
                      : roundedScore >= 60
                      ? 'Solid foundation with areas to review'
                      : 'Requires conceptual review'}
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {correctCount} correct · {incorrectCount} incorrect out of {total} questions
                  </p>
                </div>
              </div>

              {/* Recommended Next Action */}
              {incorrectCount > 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    navigate(
                      `/chat?q=${encodeURIComponent(
                        `I missed questions on this quiz about: ${missedTopicsSummary}. Can you explain these concepts clearly?`
                      )}`
                    )
                  }
                  leftIcon={<MessageSquare size={14} />}
                >
                  Review Missed with AI Tutor
                </Button>
              )}
            </div>
          </Card>

          {/* Review Filter Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  reviewFilter === 'all'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                All Questions ({total})
              </button>
              {incorrectCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter('missed')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    reviewFilter === 'missed'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                  }`}
                >
                  Missed Only ({incorrectCount})
                </button>
              )}
            </div>

            <span className="text-xs text-[var(--color-text-muted)]">
              Showing {displayedResults.length} questions
            </span>
          </div>

          {/* Detailed Question Review List */}
          <div className="space-y-4">
            {displayedResults.map((r, idx) => (
              <Card
                key={r.question_id}
                className={`border-l-4 ${
                  r.is_correct ? 'border-l-emerald-500' : 'border-l-[var(--color-error)]'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Status Indicator & Question */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {r.is_correct ? (
                        <CheckCircle2 size={18} className="text-emerald-500" />
                      ) : (
                        <XCircle size={18} className="text-[var(--color-error)]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                          Question {idx + 1}
                        </span>
                        <Badge variant={r.is_correct ? 'success' : 'danger'} size="sm">
                          {r.is_correct ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>
                      <p className="text-base font-semibold text-[var(--color-text)] leading-snug">
                        {r.question}
                      </p>
                    </div>
                  </div>

                  {/* Answers Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                    <div
                      className={`p-3 rounded-lg border text-xs ${
                        r.is_correct
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : 'bg-red-500/5 border-red-500/20 text-red-800 dark:text-red-300'
                      }`}
                    >
                      <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5 opacity-75">
                        Your Answer
                      </span>
                      <span className="font-semibold text-sm">{r.your_answer || '(No answer provided)'}</span>
                    </div>

                    {!r.is_correct && (
                      <div className="p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
                        <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5 opacity-75">
                          Correct Answer
                        </span>
                        <span className="font-semibold text-sm">{r.correct_answer}</span>
                      </div>
                    )}
                  </div>

                  {/* Explanation */}
                  {r.explanation && (
                    <div className="ml-7 p-3.5 rounded-lg bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] space-y-1">
                      <span className="font-semibold text-[var(--color-text)] block">Explanation</span>
                      <p className="leading-relaxed">{r.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  // 2. TAKE QUIZ VIEW: Distraction-Free Assessment Interface
  if (view === 'take' && questions.length > 0) {
    const q = questions[currentQIndex];
    const totalQ = questions.length;
    const isLast = currentQIndex === totalQ - 1;
    const answeredCount = Object.keys(answers).length;
    const progressPct = Math.round(((currentQIndex + 1) / totalQ) * 100);

    return (
      <PageContainer
        title={quizTitle}
        description="Select the most accurate response. Use keys 1-4 or A-D to respond."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (answeredCount > 0 && !window.confirm('Quit quiz? Unsubmitted answers will be lost.')) return;
              setView('list');
            }}
          >
            Exit Quiz
          </Button>
        }
      >
        <div className="max-w-2xl mx-auto space-y-5">
          
          {/* Progress Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text)]">
                Question {currentQIndex + 1} of {totalQ}
              </span>
              <span>{answeredCount} of {totalQ} answered</span>
            </div>
            <Progress value={progressPct} size="sm" />
          </div>

          {/* Dominant Question Workspace */}
          <Card className="p-4 sm:p-8 border-[var(--color-border)]">
            <div className="space-y-6">
              
              {/* Question Headline */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[var(--color-primary)] uppercase tracking-wider">
                  {q.question_type === 'true_false' ? 'True / False' : 'Multiple Choice'}
                </span>
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-[var(--color-text)] leading-snug">
                  {q.question}
                </h2>
              </div>

              {/* Answer Options List */}
              <div className="space-y-2.5">
                {q.question_type === 'true_false' ? (
                  ['True', 'False'].map((opt, optIdx) => {
                    const isSelected = answers[q.id] === opt;
                    const keyNumber = optIdx + 1;

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => selectOption(q.id, opt)}
                        className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-lg border text-left transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                              isSelected
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                            }`}
                          >
                            {keyNumber}
                          </span>
                          <span
                            className={`text-sm sm:text-base font-medium ${
                              isSelected ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text)]'
                            }`}
                          >
                            {opt}
                          </span>
                        </div>

                        {isSelected && <Check size={16} className="text-[var(--color-primary)] mr-1" />}
                      </button>
                    );
                  })
                ) : (
                  q.options &&
                  Object.entries(q.options).map(([optKey, optVal]) => {
                    const isSelected = answers[q.id] === optKey;

                    return (
                      <button
                        key={optKey}
                        type="button"
                        onClick={() => selectOption(q.id, optKey)}
                        className={`w-full flex items-start justify-between p-3.5 sm:p-4 rounded-lg border text-left transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 dark:bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)]'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span
                            className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-colors ${
                              isSelected
                                ? 'bg-[var(--color-primary)] text-white'
                                : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                            }`}
                          >
                            {optKey}
                          </span>
                          <span
                            className={`text-sm sm:text-base leading-relaxed ${
                              isSelected ? 'text-[var(--color-primary)] font-semibold' : 'text-[var(--color-text)]'
                            }`}
                          >
                            {optVal}
                          </span>
                        </div>

                        {isSelected && (
                          <Check size={16} className="text-[var(--color-primary)] flex-shrink-0 mt-1 ml-2" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom Navigation Toolbar */}
              <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-between gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  leftIcon={<ArrowLeft size={14} />}
                >
                  Previous
                </Button>

                {/* Mobile Question Indicator */}
                <span className="text-xs font-semibold text-[var(--color-text-muted)] sm:hidden">
                  {currentQIndex + 1} / {totalQ}
                </span>

                {/* Question jump pills for tablet/desktop */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {questions.map((item, idx) => {
                    const isCurrent = idx === currentQIndex;
                    const isAnswered = !!answers[item.id];

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCurrentQIndex(idx)}
                        className={`w-6 h-6 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[var(--color-primary)] text-white shadow-xs'
                            : isAnswered
                            ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                            : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                        }`}
                        title={`Question ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                {/* Next / Submit */}
                {isLast ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmit}
                    isLoading={submitting}
                    disabled={answeredCount === 0}
                    rightIcon={<CheckCircle2 size={14} />}
                  >
                    Submit Quiz
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                    rightIcon={<ArrowRight size={14} />}
                  >
                    <span className="hidden sm:inline">Next Question</span>
                    <span className="sm:hidden">Next</span>
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Keyboard Accessibility Hint on desktop */}
          <p className="hidden sm:block text-center text-[11px] text-[var(--color-text-muted)]">
            Tip: Press <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-hover)] border border-[var(--color-border)]">1-4</kbd> or <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-hover)] border border-[var(--color-border)]">A-D</kbd> to choose an answer.
          </p>
        </div>
      </PageContainer>
    );
  }

  // 3. LIST VIEW: Past Quizzes Library
  if (view === 'list') {
    return (
      <PageContainer
        title="Quizzes & Assessments"
        description="Verify your comprehension through grounded recall and concept testing."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setView('create')}
            leftIcon={<Plus size={14} />}
          >
            New Quiz
          </Button>
        }
      >
        <div className="space-y-6">
          {quizList.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto">
                  <HelpCircle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--color-text)]">No quizzes generated yet</h3>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
                    Generate an assessment from any of your uploaded documents to test your retention.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setView('create')}>
                  Generate First Quiz
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizList.map((quiz) => (
                <Card
                  key={quiz.id}
                  variant="interactive"
                  onClick={() => openExistingQuiz(quiz.id)}
                  className="flex flex-col justify-between"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="primary" size="sm">
                        {quiz.difficulty} difficulty
                      </Badge>
                      <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                        {quiz.question_count} questions
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold line-clamp-1">{quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
                    <span>Take Assessment</span>
                    <ArrowRight size={13} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  // 4. CREATE VIEW: Generate Assessment
  return (
    <PageContainer
      title="Quiz Generator"
      description="Create a targeted multiple-choice or true/false assessment from your source documents."
      actions={
        quizList.length > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setView('list')} leftIcon={<ChevronLeft size={14} />}>
            My Quizzes ({quizList.length})
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configure Assessment</CardTitle>
            <CardDescription>
              Select study material and configure target difficulty.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Document Select */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                <FileText size={13} className="text-[var(--color-primary)]" /> Source Document
              </label>
              <select
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">Choose document to test...</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Difficulty & Count Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="easy">Easy (Definitions & Facts)</option>
                  <option value="medium">Medium (Application & Analysis)</option>
                  <option value="hard">Hard (Synthesis & Edge Cases)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Question Count
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value={3}>3 Questions (Quick check)</option>
                  <option value={5}>5 Questions (Standard)</option>
                  <option value={10}>10 Questions (Comprehensive)</option>
                  <option value={15}>15 Questions (Exam prep)</option>
                </select>
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={loading || !docId}
                isLoading={loading}
                className="w-full h-11 text-sm font-semibold"
                leftIcon={!loading ? <HelpCircle size={16} /> : undefined}
              >
                {loading ? 'Synthesizing Questions...' : 'Start Assessment'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
