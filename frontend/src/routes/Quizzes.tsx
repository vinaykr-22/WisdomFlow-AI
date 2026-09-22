import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import {
  HelpCircle,
  CheckCircle2,
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
        title="Evaluation Report"
        description="Scored performance matrix and conceptual breakdowns for targeted review."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setView('list')}>
              EXAMINATION CATALOG
            </Button>
            <Button size="sm" variant="secondary" onClick={handleRetake} leftIcon={<RotateCcw size={12} />}>
              RETAKE TEST
            </Button>
          </div>
        }
      >
        <div className="space-y-6 max-w-4xl mx-auto">
          
          {/* Focused Score Summary Strip */}
          <div className="p-5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-[var(--color-surface)] shadow-[2px_2px_0px_#18181b]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 flex items-center justify-center font-mono font-bold text-xl shadow-[2px_2px_0px_#18181b] ${
                    roundedScore >= 70
                      ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                  }`}
                >
                  {roundedScore}%
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 font-serif">
                    {roundedScore >= 80
                      ? 'High Comprehension Level'
                      : roundedScore >= 60
                      ? 'Adequate Comprehension · Review Key Topics'
                      : 'Remedial Review Required'}
                  </h2>
                  <p className="font-mono text-xs text-stone-600 dark:text-stone-400 mt-0.5 uppercase">
                    [ {correctCount} CORRECT // {incorrectCount} INCORRECT // {total} TOTAL ]
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
                  leftIcon={<MessageSquare size={13} />}
                  className="font-mono text-xs"
                >
                  REVIEW MISSED IN TUTOR
                </Button>
              )}
            </div>
          </div>

          {/* Review Filter Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReviewFilter('all')}
                className={`px-3 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                  reviewFilter === 'all'
                    ? 'border-stone-900 dark:border-stone-700 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-[1px_1px_0px_#18181b]'
                    : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200/50'
                }`}
              >
                ALL ITEMS ({total})
              </button>
              {incorrectCount > 0 && (
                <button
                  type="button"
                  onClick={() => setReviewFilter('missed')}
                  className={`px-3 py-1 rounded-[2px] font-mono text-[10px] font-bold uppercase transition-all cursor-pointer border ${
                    reviewFilter === 'missed'
                      ? 'border-stone-900 dark:border-stone-700 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-[1px_1px_0px_#18181b]'
                      : 'border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-200/50'
                  }`}
                >
                  MISSED ONLY ({incorrectCount})
                </button>
              )}
            </div>

            <span className="font-mono text-[10px] text-stone-500 uppercase">
              SHOWING {displayedResults.length} OF {total}
            </span>
          </div>

          {/* Detailed Question Review List */}
          <div className="space-y-4">
            {displayedResults.map((r, idx) => (
              <div
                key={r.question_id}
                className={`p-5 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b] space-y-4 ${
                  r.is_correct ? 'border-l-[6px] border-l-stone-900 dark:border-l-stone-100' : 'border-l-[6px] border-l-stone-400 dark:border-l-stone-600'
                }`}
              >
                {/* Status Indicator & Question */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 font-mono text-xs font-bold">
                    {r.is_correct ? (
                      <span className="px-1 py-0.2 rounded-[2px] bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900">[+]</span>
                    ) : (
                      <span className="px-1 py-0.2 rounded-[2px] bg-stone-300 dark:bg-stone-700 text-stone-900 dark:text-stone-100">[-]</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 font-mono text-[10px]">
                      <span className="font-bold uppercase tracking-wider text-stone-500">
                        ITEM {String(idx + 1).padStart(2, '0')}
                      </span>
                      <Badge variant={r.is_correct ? 'success' : 'neutral'} size="sm">
                        {r.is_correct ? 'CORRECT' : 'INCORRECT'}
                      </Badge>
                    </div>
                    <p className="text-base font-bold text-stone-900 dark:text-stone-100 leading-snug font-serif">
                      {r.question}
                    </p>
                  </div>
                </div>

                {/* Answers Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-8">
                  <div className="p-3 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-mono">
                    <span className="font-bold uppercase text-[10px] block mb-1 text-stone-500">
                      // YOUR SUBMISSION
                    </span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">{r.your_answer || '(None)'}</span>
                  </div>

                  {!r.is_correct && (
                    <div className="p-3 rounded-[2px] border border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-xs font-mono">
                      <span className="font-bold uppercase text-[10px] block mb-1 text-stone-500">
                        // KEY ANSWER
                      </span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">{r.correct_answer}</span>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                {r.explanation && (
                  <div className="ml-8 p-3.5 rounded-[2px] bg-stone-100 dark:bg-stone-900 border border-dashed border-stone-400 dark:border-stone-700 text-xs text-stone-700 dark:text-stone-300 space-y-1">
                    <span className="font-mono text-[10px] font-bold uppercase text-stone-500 block">// TECHNICAL RATIONALE</span>
                    <p className="leading-relaxed font-sans">{r.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  // 2. TAKE QUIZ VIEW: High-Contrast Examination Interface
  if (view === 'take' && questions.length > 0) {
    const q = questions[currentQIndex];
    const totalQ = questions.length;
    const isLast = currentQIndex === totalQ - 1;
    const answeredCount = Object.keys(answers).length;
    const progressPct = Math.round(((currentQIndex + 1) / totalQ) * 100);

    return (
      <PageContainer
        title={quizTitle}
        description="Select the most accurate response. Use hotkeys 1-4 or A-D to respond."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (answeredCount > 0 && !window.confirm('Quit assessment? Unsubmitted answers will be lost.')) return;
              setView('list');
            }}
          >
            EXIT ASSESSMENT
          </Button>
        }
      >
        <div className="max-w-2xl mx-auto space-y-5">
          
          {/* Progress Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] text-stone-500 uppercase">
              <span className="font-bold text-stone-900 dark:text-stone-100">
                QUESTION {String(currentQIndex + 1).padStart(2, '0')} // {String(totalQ).padStart(2, '0')}
              </span>
              <span>{answeredCount} OF {totalQ} ANSWERED</span>
            </div>
            <Progress value={progressPct} size="sm" />
          </div>

          {/* Dominant Question Workspace */}
          <div className="p-5 sm:p-8 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[3px_3px_0px_#18181b] space-y-6">
            
            {/* Question Headline */}
            <div className="space-y-1.5 pb-4 border-b border-stone-200 dark:border-stone-800">
              <span className="font-mono text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                [ {q.question_type === 'true_false' ? 'BINARY // TRUE OR FALSE' : 'MULTIPLE CHOICE QUESTION'} ]
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-snug font-serif">
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
                      className={`w-full flex items-center justify-between p-3.5 sm:p-4 rounded-[2px] border-[1.5px] text-left transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-800 shadow-[2px_2px_0px_#18181b]'
                          : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-900 dark:hover:border-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-[2px] flex items-center justify-center font-mono text-xs font-bold border transition-colors ${
                            isSelected
                              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700'
                          }`}
                        >
                          {keyNumber}
                        </span>
                        <span
                          className={`text-sm sm:text-base ${
                            isSelected ? 'font-bold text-stone-900 dark:text-stone-100' : 'text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          {opt}
                        </span>
                      </div>

                      {isSelected && <Check size={16} className="text-stone-900 dark:text-stone-100 mr-1" />}
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
                      className={`w-full flex items-start justify-between p-3.5 sm:p-4 rounded-[2px] border-[1.5px] text-left transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'border-stone-900 dark:border-stone-100 bg-stone-100 dark:bg-stone-800 shadow-[2px_2px_0px_#18181b]'
                          : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-900 dark:hover:border-stone-100'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-[2px] flex items-center justify-center font-mono text-xs font-bold flex-shrink-0 mt-0.5 border transition-colors ${
                            isSelected
                              ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 border-stone-900 dark:border-stone-100'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700'
                          }`}
                        >
                          {optKey}
                        </span>
                        <span
                          className={`text-sm sm:text-base leading-relaxed ${
                            isSelected ? 'font-bold text-stone-900 dark:text-stone-100' : 'text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          {optVal}
                        </span>
                      </div>

                      {isSelected && (
                        <Check size={16} className="text-stone-900 dark:text-stone-100 flex-shrink-0 mt-1 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Bottom Navigation Toolbar */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentQIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
                leftIcon={<ArrowLeft size={13} />}
                className="font-mono text-xs"
              >
                PREVIOUS
              </Button>

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
                      className={`w-6 h-6 rounded-[2px] font-mono text-xs font-bold transition-all cursor-pointer border ${
                        isCurrent
                          ? 'border-stone-900 dark:border-stone-100 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 shadow-[1px_1px_0px_#18181b]'
                          : isAnswered
                          ? 'border-stone-900 dark:border-stone-700 bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100'
                          : 'border-stone-300 dark:border-stone-700 text-stone-400'
                      }`}
                      title={`Item ${idx + 1}`}
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
                  rightIcon={<CheckCircle2 size={13} />}
                >
                  SUBMIT EXAMINATION
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentQIndex((prev) => Math.min(totalQ - 1, prev + 1))}
                  rightIcon={<ArrowRight size={13} />}
                >
                  <span className="hidden sm:inline">NEXT ITEM</span>
                  <span className="sm:hidden">NEXT</span>
                </Button>
              )}
            </div>
          </div>

          {/* Technical Keyboard Hint */}
          <p className="hidden sm:block text-center font-mono text-[10px] text-stone-500 uppercase">
            HOTKEYS: USE <kbd className="px-1 py-0.2 rounded-[2px] bg-stone-200 dark:bg-stone-800 border border-stone-400">1-4</kbd> OR <kbd className="px-1 py-0.2 rounded-[2px] bg-stone-200 dark:bg-stone-800 border border-stone-400">A-D</kbd> TO SELECT RESPONSE.
          </p>
        </div>
      </PageContainer>
    );
  }

  // 3. LIST VIEW: Past Quizzes Library
  if (view === 'list') {
    return (
      <PageContainer
        title="Assessment Catalog"
        description="Objective retention and comprehension testing archive."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setView('create')}
            leftIcon={<Plus size={13} />}
          >
            CREATE TEST
          </Button>
        }
      >
        <div className="space-y-6">
          {quizList.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#18181b]">
                  <HelpCircle size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">No tests generated yet</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
                    Synthesize an assessment from any archived document to test conceptual retention.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setView('create')}>
                  COMPILE ASSESSMENT
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
                        {quiz.difficulty.toUpperCase()}
                      </Badge>
                      <span className="font-mono text-[10px] text-stone-500 uppercase">
                        {quiz.question_count} ITEMS
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold font-serif line-clamp-1">{quiz.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                    <span>TAKE ASSESSMENT</span>
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
      title="Assessment Architect"
      description="Synthesize a structured examination from primary study texts."
      actions={
        quizList.length > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setView('list')} leftIcon={<ChevronLeft size={13} />}>
            CATALOG ({quizList.length})
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configure Examination</CardTitle>
            <CardDescription>
              Select study material and designate target difficulty parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Document Select */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <FileText size={12} /> [ SOURCE READING ]
              </label>
              <select
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                className="w-full px-3 py-2 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none shadow-[2px_2px_0px_#18181b]"
              >
                <option value="">SELECT ARCHIVED READING...</option>
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
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  DIFFICULTY PARAMETER
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                  className="w-full px-3 py-2 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none shadow-[2px_2px_0px_#18181b]"
                >
                  <option value="easy">Level 1 (Core Definitions)</option>
                  <option value="medium">Level 2 (Applied Analysis)</option>
                  <option value="hard">Level 3 (Synthesis & Edge Cases)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                  ITEM QUANTITY
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none shadow-[2px_2px_0px_#18181b]"
                >
                  <option value={3}>3 Items (Quick Retention)</option>
                  <option value={5}>5 Items (Standard Evaluation)</option>
                  <option value={10}>10 Items (Comprehensive Exam)</option>
                  <option value={15}>15 Items (Full Diagnostic)</option>
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
                className="w-full h-10 text-xs font-mono font-bold"
                leftIcon={!loading ? <HelpCircle size={14} /> : undefined}
              >
                {loading ? 'COMPILING EXAMINATION...' : 'START ASSESSMENT'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
