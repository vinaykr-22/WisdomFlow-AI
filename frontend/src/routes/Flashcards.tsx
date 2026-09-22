import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import {
  Layers,
  RotateCcw,
  Bookmark,
  Plus,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  CheckCircle2,
  FileText,
  Lightbulb,
  Eye,
  EyeOff,
  LayoutGrid,
  Maximize2,
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

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  hint: string | null;
  is_bookmarked: boolean;
}

interface FlashcardSetItem {
  id: string;
  title: string;
  card_count: number;
  created_at: string;
}

export default function Flashcards() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Data
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docId, setDocId] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Active Deck State
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [title, setTitle] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Session Knowledge States
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [needsReviewIds, setNeedsReviewIds] = useState<Set<string>>(new Set());

  // View Modes: 'focus' (single card study) | 'grid' (deck overview) | 'list' (sets library) | 'create'
  const [view, setView] = useState<'focus' | 'grid' | 'list' | 'create'>('create');
  const [setsList, setSetsList] = useState<FlashcardSetItem[]>([]);

  // Open a specific flashcard set
  const openSet = useCallback(async (setId: string) => {
    setLoading(true);
    setIsRevealed(false);
    setShowHint(false);
    setCurrentIndex(0);
    setMasteredIds(new Set());
    setNeedsReviewIds(new Set());

    try {
      const { data } = await api.get(`/flashcards/sets/${setId}`);
      setCards(data.cards || []);
      setTitle(data.title || 'Flashcard Deck');
      setView('focus');
    } catch {
      toast.error('Load Failed', 'Could not retrieve flashcard set');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load initial sets & documents
  const loadInitialData = useCallback(async () => {
    try {
      const [docsRes, setsRes] = await Promise.all([
        api.get('/documents'),
        api.get('/flashcards/sets').catch(() => ({ data: { sets: [] } })),
      ]);

      setDocs(docsRes.data.documents || []);
      const fetchedSets: FlashcardSetItem[] = setsRes.data.sets || [];
      setSetsList(fetchedSets);

      // Check query params
      const querySetId = searchParams.get('id');
      const queryDocId = searchParams.get('docId') || searchParams.get('doc');

      if (querySetId) {
        openSet(querySetId);
      } else if (queryDocId) {
        setDocId(queryDocId);
        setView('create');
      } else if (fetchedSets.length > 0) {
        setView('list');
      } else {
        setView('create');
      }
    } catch {
      toast.error('Failed to load flashcard data');
    }
  }, [searchParams, toast, openSet]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Generate a new deck
  const handleGenerate = async () => {
    if (!docId) {
      toast.warning('Select Document', 'Choose a document to generate cards from.');
      return;
    }

    setGenerating(true);
    setIsRevealed(false);
    setShowHint(false);
    setCurrentIndex(0);
    setMasteredIds(new Set());
    setNeedsReviewIds(new Set());

    try {
      const { data } = await api.post('/flashcards/generate', { document_id: docId, count });
      const { data: setData } = await api.get(`/flashcards/sets/${data.id}`);
      setCards(setData.cards || []);
      setTitle(setData.title || 'Flashcard Deck');
      setView('focus');
      toast.success('Deck Generated', `Created ${setData.cards.length} study flashcards`);

      // Refresh sets list
      api.get('/flashcards/sets').then((res) => setSetsList(res.data.sets || [])).catch(() => {});
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to generate flashcards';
      toast.error('Generation Failed', errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  // Toggle bookmark on a card
  const toggleBookmark = useCallback(async (card: FlashcardItem) => {
    const nextState = !card.is_bookmarked;
    try {
      await api.patch(`/flashcards/${card.id}`, { is_bookmarked: nextState });
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, is_bookmarked: nextState } : c))
      );
      toast.info(nextState ? 'Card Bookmarked' : 'Bookmark Removed');
    } catch {
      toast.error('Bookmark update failed');
    }
  }, [toast]);

  // Advance card with animation reset
  const advanceCard = useCallback((step: number) => {
    setCurrentIndex((prev) => Math.max(0, Math.min(cards.length - 1, prev + step)));
    setIsRevealed(false);
    setShowHint(false);
  }, [cards.length]);

  // Self-assessment triggers
  const markMastered = (cardId: string) => {
    setMasteredIds((prev) => new Set(prev).add(cardId));
    setNeedsReviewIds((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });

    // Advance to next card if available
    if (currentIndex < cards.length - 1) {
      advanceCard(1);
    }
  };

  const markNeedsReview = (cardId: string) => {
    setNeedsReviewIds((prev) => new Set(prev).add(cardId));
    setMasteredIds((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });

    if (currentIndex < cards.length - 1) {
      advanceCard(1);
    }
  };

  // Keyboard navigation for focus study mode
  useEffect(() => {
    if (view !== 'focus' || cards.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const currentCard = cards[currentIndex];

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRevealed((prev) => !prev);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        advanceCard(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        advanceCard(1);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (currentCard) toggleBookmark(currentCard);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, cards, currentIndex, advanceCard, toggleBookmark]);

  if (loading) {
    return (
      <PageContainer title="Flashcard Deck" description="Loading study cards...">
        <Card>
          <CardContent className="py-16 text-center text-xs text-[var(--color-text-muted)]">
            Loading flashcard deck...
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  // 1. FOCUS STUDY VIEW: Single-Card Deep Practice Mode
  if (view === 'focus' && cards.length > 0) {
    const currentCard = cards[currentIndex];
    const totalCards = cards.length;
    const progressPct = Math.round(((currentIndex + 1) / totalCards) * 100);
    const isMastered = masteredIds.has(currentCard.id);
    const needsReview = needsReviewIds.has(currentCard.id);

    return (
      <PageContainer
        title={title}
        description="Active recall practice. Reveal response to verify conceptual retention."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView('grid')}
              leftIcon={<LayoutGrid size={13} />}
            >
              DECK OVERVIEW
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setView('list')}
            >
              ALL DECKS
            </Button>
          </div>
        }
      >
        <div className="max-w-2xl mx-auto space-y-5">
          
          {/* Progress Header Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] text-stone-500 uppercase">
              <span className="font-bold text-stone-900 dark:text-stone-100">
                CARD {String(currentIndex + 1).padStart(2, '0')} // {String(totalCards).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {masteredIds.size} MASTERED
                </span>
                {needsReviewIds.size > 0 && (
                  <span className="text-stone-500">
                    {needsReviewIds.size} TO REVIEW
                  </span>
                )}
              </div>
            </div>
            <Progress value={progressPct} size="sm" />
          </div>

          {/* Physical Index Card */}
          <div
            onClick={() => setIsRevealed(!isRevealed)}
            className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[4px_4px_0px_#18181b] p-8 sm:p-12 min-h-[340px] flex flex-col justify-between cursor-pointer select-none relative group transition-all active:translate-x-[1px] active:translate-y-[1px]"
          >
            {/* Top Card Technical Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-500">
                {isRevealed ? '[ TECHNICAL SOLUTION // ANSWER ]' : '[ QUERY // PROMPT ]'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(currentCard);
                  }}
                  className={`p-1.5 rounded-[2px] border transition-colors cursor-pointer ${
                    currentCard.is_bookmarked
                      ? 'border-stone-900 dark:border-stone-700 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                      : 'border-transparent text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                  }`}
                  title={currentCard.is_bookmarked ? 'Bookmarked' : 'Bookmark card'}
                >
                  <Bookmark
                    size={14}
                    className={currentCard.is_bookmarked ? 'fill-current' : ''}
                  />
                </button>
              </div>
            </div>

            {/* Central Typography Area */}
            <div className="py-6 my-auto text-center space-y-4">
              {!isRevealed ? (
                <div className="space-y-2">
                  <p className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 leading-relaxed max-w-lg mx-auto font-serif">
                    {currentCard.front}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-base sm:text-lg text-stone-800 dark:text-stone-200 leading-relaxed max-w-lg mx-auto font-sans">
                    {currentCard.back}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Hint / Flip Indicator */}
            <div className="flex items-center justify-between font-mono text-[10px] text-stone-500 pt-4 border-t border-stone-200 dark:border-stone-800">
              {currentCard.hint ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="inline-flex items-center gap-1.5 text-stone-900 dark:text-stone-100 underline cursor-pointer font-bold uppercase"
                >
                  <Lightbulb size={11} />
                  <span>{showHint ? `HINT: ${currentCard.hint}` : 'REVEAL HINT'}</span>
                </button>
              ) : (
                <span />
              )}

              <span className="flex items-center gap-1 uppercase">
                {isRevealed ? <EyeOff size={11} /> : <Eye size={11} />}
                <span>CLICK OR SPACE TO {isRevealed ? 'SEE PROMPT' : 'REVEAL ANSWER'}</span>
              </span>
            </div>
          </div>

          {/* Self-Assessment & Knowledge Retention Actions */}
          {isRevealed && (
            <div className="p-4 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 flex items-center justify-between gap-3 shadow-[2px_2px_0px_#18181b]">
              <span className="font-mono text-[10px] font-bold uppercase text-stone-500 hidden sm:inline">
                EVALUATE RETENTION:
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  variant={needsReview ? 'primary' : 'outline'}
                  onClick={() => markNeedsReview(currentCard.id)}
                  leftIcon={<RotateCcw size={12} />}
                  className="flex-1 sm:flex-initial text-xs"
                >
                  NEEDS PRACTICE
                </Button>

                <Button
                  size="sm"
                  variant={isMastered ? 'primary' : 'secondary'}
                  onClick={() => markMastered(currentCard.id)}
                  leftIcon={<CheckCircle2 size={13} />}
                  className="flex-1 sm:flex-initial text-xs"
                >
                  MASTERED
                </Button>
              </div>
            </div>
          )}

          {/* Previous / Next Toolbar */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => advanceCard(-1)}
              disabled={currentIndex === 0}
              leftIcon={<ArrowLeft size={13} />}
              className="font-mono text-xs"
            >
              PREVIOUS
            </Button>

            <div className="font-mono text-[10px] text-stone-500 hidden sm:block uppercase">
              USE <kbd className="px-1 py-0.2 rounded-[2px] bg-stone-200 dark:bg-stone-800 border border-stone-400">SPACE</kbd> TO FLIP, <kbd className="px-1 py-0.2 rounded-[2px] bg-stone-200 dark:bg-stone-800 border border-stone-400">← / →</kbd> TO NAVIGATE
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => advanceCard(1)}
              disabled={currentIndex === totalCards - 1}
              rightIcon={<ArrowRight size={13} />}
              className="font-mono text-xs"
            >
              NEXT CARD
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // 2. GRID OVERVIEW VIEW: Full Deck Review
  if (view === 'grid' && cards.length > 0) {
    return (
      <PageContainer
        title={title}
        description="Comprehensive card list for rapid scanning and reference."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => setView('focus')}
              leftIcon={<Maximize2 size={13} />}
            >
              FOCUS PRACTICE MODE
            </Button>
            <Button size="sm" variant="outline" onClick={() => setView('list')}>
              ALL DECKS
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card, idx) => (
              <div
                key={card.id}
                className="rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-[2px_2px_0px_#18181b] p-5 space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-200 dark:border-stone-800">
                  <span className="font-mono text-[10px] font-bold text-stone-500 uppercase">
                    CARD {String(idx + 1).padStart(2, '0')}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(card)}
                    className={`p-1 rounded-[2px] cursor-pointer ${
                      card.is_bookmarked
                        ? 'text-stone-900 dark:text-stone-100'
                        : 'text-stone-400 hover:text-stone-900'
                    }`}
                  >
                    <Bookmark size={14} className={card.is_bookmarked ? 'fill-current' : ''} />
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="font-mono text-[9px] font-bold text-stone-500 uppercase">
                    // PROMPT
                  </span>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif">{card.front}</p>
                </div>

                <div className="pt-2 border-t border-dashed border-stone-200 dark:border-stone-800 space-y-1">
                  <span className="font-mono text-[9px] font-bold text-stone-500 uppercase">
                    // KEY SOLUTION
                  </span>
                  <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed font-sans">{card.back}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  // 3. LIST VIEW: Flashcard Sets Library
  if (view === 'list') {
    return (
      <PageContainer
        title="Flashcard Decks"
        description="Active recall sets compiled from archived readings."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setView('create')}
            leftIcon={<Plus size={13} />}
          >
            NEW DECK
          </Button>
        }
      >
        <div className="space-y-6">
          {setsList.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 flex items-center justify-center mx-auto shadow-[2px_2px_0px_#18181b]">
                  <Layers size={20} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 font-serif">No decks compiled yet</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 max-w-sm mx-auto">
                    Synthesize an active-recall flashcard deck from your archived study materials.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setView('create')}>
                  CREATE FIRST DECK
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {setsList.map((set) => (
                <Card
                  key={set.id}
                  variant="interactive"
                  onClick={() => openSet(set.id)}
                  className="flex flex-col justify-between"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="primary" size="sm">
                        {set.card_count} CARDS
                      </Badge>
                      <span className="font-mono text-[10px] text-stone-500 uppercase">
                        {new Date(set.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold font-serif line-clamp-1">{set.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between font-mono text-xs font-bold text-stone-900 dark:text-stone-100">
                    <span>PRACTICE DECK</span>
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

  // 4. CREATE VIEW: Generate Deck
  return (
    <PageContainer
      title="Flashcard Architect"
      description="Extract key definitions, formulas, and concepts into an active-recall deck."
      actions={
        setsList.length > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setView('list')} leftIcon={<ChevronLeft size={13} />}>
            DECKS ({setsList.length})
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configure Study Deck</CardTitle>
            <CardDescription>
              Select source reading material and designate card quantity.
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

            {/* Cards Count Select */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-stone-900 dark:text-stone-100">
                CARD QUANTITY
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-[2px] border-[1.5px] border-stone-900 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:outline-none shadow-[2px_2px_0px_#18181b]"
              >
                <option value={5}>5 Cards (Focused review)</option>
                <option value={10}>10 Cards (Standard deck)</option>
                <option value={15}>15 Cards (Comprehensive)</option>
                <option value={20}>20 Cards (Deep drill)</option>
              </select>
            </div>

            {/* Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={generating || !docId}
                isLoading={generating}
                className="w-full h-10 text-xs font-mono font-bold"
                leftIcon={!generating ? <Layers size={14} /> : undefined}
              >
                {generating ? 'SYNTHESIZING CONCEPTS...' : 'GENERATE FLASHCARDS'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
