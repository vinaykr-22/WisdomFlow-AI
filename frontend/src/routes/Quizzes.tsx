import { useEffect, useState } from 'react';
import api from '../api/client';
import { HelpCircle, CheckCircle, XCircle, Trophy, RotateCcw, ArrowRight } from 'lucide-react';

interface Doc { id: string; title: string }
interface Question { id: string; question_index: number; question_type: string; question: string; options: Record<string, string> | null }
interface Result { question_id: string; question: string; your_answer: string; correct_answer: string; is_correct: boolean; explanation: string }

export default function Quizzes() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docId, setDocId] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);

  useEffect(() => { api.get('/documents').then(({ data }) => setDocs(data.documents)); }, []);

  const handleGenerate = async () => {
    if (!docId) return;
    setLoading(true);
    setQuizId(null);
    setQuestions([]);
    setAnswers({});
    setScore(null);
    setResults([]);
    setCurrentQIndex(0);
    try {
      const { data } = await api.post('/quizzes/generate', { document_id: docId, difficulty, question_count: count });
      setQuizId(data.id);
      const { data: quizData } = await api.get(`/quizzes/${data.id}`);
      setQuestions(quizData.questions);
    } catch { alert('Failed to generate quiz'); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!quizId) return;
    try {
      const { data } = await api.post(`/quizzes/${quizId}/submit`, { answers });
      setScore(data.score);
      setResults(data.results);
    } catch { alert('Failed to submit quiz'); }
  };

  const allAnswered = questions.every((q) => answers[q.id]);

  if (results.length > 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        
        {/* Score Banner */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white text-center shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 text-white/10">
            <Trophy size={160} />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-200 font-semibold uppercase tracking-wider mb-2">Quiz Completed</p>
            <h2 className="text-6xl font-bold mb-4">{Math.round(score ?? 0)}%</h2>
            <p className="text-lg opacity-90 max-w-lg mx-auto">
              You got {results.filter(r => r.is_correct).length} out of {results.length} questions correct.
            </p>
            <button 
              onClick={() => { setQuizId(null); setQuestions([]); setScore(null); setResults([]); }} 
              className="mt-6 inline-flex items-center gap-2 bg-white text-indigo-700 px-6 py-2.5 rounded-full font-bold hover:shadow-md hover:bg-indigo-50 transition-all cursor-pointer"
            >
              <RotateCcw size={18} /> Retake Quiz
            </button>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Review Answers</h3>
          <div className="grid gap-4">
            {results.map((r, idx) => (
              <div key={r.question_id} className={`bg-white dark:bg-slate-900 border-2 rounded-2xl p-6 shadow-sm ${r.is_correct ? 'border-emerald-100 dark:border-emerald-900/50' : 'border-red-100 dark:border-red-900/50'}`}>
                <div className="flex items-start gap-4">
                  <div className={`mt-1 flex-shrink-0 ${r.is_correct ? 'text-emerald-500' : 'text-red-500'}`}>
                    {r.is_correct ? <CheckCircle size={24} /> : <XCircle size={24} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3"><span className="text-slate-400 dark:text-slate-500 mr-2">{idx + 1}.</span>{r.question}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-semibold mb-1">Your Answer</p>
                        <p className={`font-medium ${r.is_correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{r.your_answer || '(No answer)'}</p>
                      </div>
                      {!r.is_correct && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 uppercase font-semibold mb-1">Correct Answer</p>
                          <p className="font-medium text-emerald-800 dark:text-emerald-300">{r.correct_answer}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Explanation</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{r.explanation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (questions.length > 0) {
    const q = questions[currentQIndex];
    const isLast = currentQIndex === questions.length - 1;
    
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
        
        {/* Progress Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Question {currentQIndex + 1} of {questions.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Knowledge Check</p>
          </div>
          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 w-8 rounded-full transition-all ${idx === currentQIndex ? 'bg-indigo-600' : idx < currentQIndex ? 'bg-indigo-200 dark:bg-indigo-800' : 'bg-slate-100 dark:bg-slate-800'}`} 
              />
            ))}
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-8 min-h-[400px] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-8 leading-tight">{q.question}</h2>
          
          <div className="space-y-3 flex-1">
            {q.question_type === 'true_false' ? (
              ['True', 'False'].map((opt) => (
                <label key={opt} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-inner' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <input 
                    type="radio" 
                    name={q.id} 
                    value={opt} 
                    checked={answers[q.id] === opt} 
                    onChange={() => setAnswers({ ...answers, [q.id]: opt })} 
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className={`text-lg ${answers[q.id] === opt ? 'font-semibold text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                </label>
              ))
            ) : (
              q.options && Object.entries(q.options).map(([key, val]) => (
                <label key={key} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === key ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-inner' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                  <input 
                    type="radio" 
                    name={q.id} 
                    value={key} 
                    checked={answers[q.id] === key} 
                    onChange={() => setAnswers({ ...answers, [q.id]: key })} 
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex items-start gap-3">
                    <span className={`font-bold w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${answers[q.id] === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}>{key}</span>
                    <span className={`text-lg mt-0.5 ${answers[q.id] === key ? 'font-medium text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-300'}`}>{val}</span>
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="mt-8 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-6">
            <button 
              onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
              disabled={currentQIndex === 0}
              className="px-6 py-2 rounded-xl text-slate-500 dark:text-slate-400 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-0 transition-all cursor-pointer"
            >
              Previous
            </button>
            
            {isLast ? (
              <button 
                onClick={handleSubmit} 
                disabled={!allAnswered} 
                className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-emerald-200 dark:shadow-none"
              >
                Submit Answers <CheckCircle size={18} />
              </button>
            ) : (
              <button 
                onClick={() => setCurrentQIndex(currentQIndex + 1)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-200 dark:shadow-none"
              >
                Next <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pt-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <HelpCircle size={32} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Quiz Generator</h2>
        <p className="text-slate-500 dark:text-slate-400">Test your knowledge with AI-generated assessments.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Select Document</label>
          <select 
            value={docId} 
            onChange={(e) => setDocId(e.target.value)} 
            className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          >
            <option value="">Choose a topic to test...</option>
            {docs.map((d) => (<option key={d.id} value={d.id}>{d.title}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Difficulty</label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)} 
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Question Count</label>
            <select 
              value={count} 
              onChange={(e) => setCount(Number(e.target.value))} 
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            >
              {[3, 5, 10, 15].map((n) => (<option key={n} value={n}>{n} questions</option>))}
            </select>
          </div>
        </div>

        <button 
          onClick={handleGenerate} 
          disabled={!docId || loading} 
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all mt-4"
        >
          {loading ? (
            <span className="flex items-center gap-2 animate-pulse"><RotateCcw size={18} className="animate-spin" /> Generating Quiz...</span>
          ) : (
            <span className="flex items-center gap-2">Start Quiz <ArrowRight size={18} /></span>
          )}
        </button>
      </div>
    </div>
  );
}
