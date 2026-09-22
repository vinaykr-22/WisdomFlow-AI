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
        description="Active recall practice. Reveal the answer and assess your retention."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView('grid')}
              leftIcon={<LayoutGrid size={14} />}
            >
              Deck Overview
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setView('list')}
            >
              All Decks
            </Button>
          </div>
        }
      >
        <div className="max-w-2xl mx-auto space-y-5">
          
          {/* Progress Header Strip */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text)]">
                Card {currentIndex + 1} of {totalCards}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {masteredIds.size} mastered
                </span>
                {needsReviewIds.size > 0 && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {needsReviewIds.size} to review
                  </span>
                )}
              </div>
            </div>
            <Progress value={progressPct} size="sm" />
          </div>

          {/* Central Serious Study Flashcard */}
          <div
            onClick={() => setIsRevealed(!isRevealed)}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all p-8 sm:p-12 min-h-[340px] flex flex-col justify-between cursor-pointer select-none relative group"
          >
            {/* Top Card Controls */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                {isRevealed ? 'Answer' : 'Prompt / Concept'}
              </span>

              <div className="flex items-center gap-2">
                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(currentCard);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    currentCard.is_bookmarked
                      ? 'text-amber-500 bg-amber-500/10'
                      : 'text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-[var(--color-surface-hover)]'
                  }`}
                  title={currentCard.is_bookmarked ? 'Bookmarked' : 'Bookmark card'}
                >
                  <Bookmark
                    size={16}
                    className={currentCard.is_bookmarked ? 'fill-current' : ''}
                  />
                </button>
              </div>
            </div>

            {/* Central Typography Area */}
            <div className="py-6 my-auto text-center space-y-4">
              {!isRevealed ? (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <p className="text-xl sm:text-2xl font-semibold text-[var(--color-text)] leading-relaxed max-w-lg mx-auto">
                    {currentCard.front}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <p className="text-lg sm:text-xl text-[var(--color-text)] leading-relaxed max-w-lg mx-auto">
                    {currentCard.back}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Hint / Flip Indicator */}
            <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] pt-4 border-t border-[var(--color-border)]">
              {currentCard.hint ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowHint(!showHint);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline cursor-pointer font-medium"
                >
                  <Lightbulb size={13} />
                  <span>{showHint ? `Hint: ${currentCard.hint}` : 'Show Hint'}</span>
                </button>
              ) : (
                <span />
              )}

              <span className="flex items-center gap-1 text-[11px]">
                {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>Click or Space to {isRevealed ? 'see prompt' : 'reveal answer'}</span>
              </span>
            </div>
          </div>

          {/* Self-Assessment & Knowledge Retention Actions */}
          {isRevealed && (
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="text-xs font-semibold text-[var(--color-text-muted)] hidden sm:inline">
                How well did you know this?
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  size="sm"
                  variant={needsReview ? 'primary' : 'outline'}
                  onClick={() => markNeedsReview(currentCard.id)}
                  leftIcon={<RotateCcw size={13} />}
                  className="flex-1 sm:flex-initial text-xs"
                >
                  Needs Practice
                </Button>

                <Button
                  size="sm"
                  variant={isMastered ? 'primary' : 'secondary'}
                  onClick={() => markMastered(currentCard.id)}
                  leftIcon={<CheckCircle2 size={13} />}
                  className="flex-1 sm:flex-initial text-xs"
                >
                  Mastered
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
              leftIcon={<ArrowLeft size={14} />}
            >
              Previous
            </Button>

            <div className="text-xs text-[var(--color-text-muted)] hidden sm:block">
              Use <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[10px]">Space</kbd> to flip, <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[10px]">← / →</kbd> to navigate
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => advanceCard(1)}
              disabled={currentIndex === totalCards - 1}
              rightIcon={<ArrowRight size={14} />}
            >
              Next Card
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
              leftIcon={<Maximize2 size={14} />}
            >
              Study Focus Mode
            </Button>
            <Button size="sm" variant="outline" onClick={() => setView('list')}>
              All Decks
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card, idx) => (
              <Card key={card.id} className="border-[var(--color-border)]">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase">
                      Card {idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleBookmark(card)}
                      className={`p-1 rounded cursor-pointer ${
                        card.is_bookmarked
                          ? 'text-amber-500'
                          : 'text-[var(--color-text-muted)] hover:text-amber-500'
                      }`}
                    >
                      <Bookmark size={15} className={card.is_bookmarked ? 'fill-current' : ''} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">
                      Prompt
                    </span>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{card.front}</p>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)] space-y-1">
                    <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase">
                      Answer
                    </span>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{card.back}</p>
                  </div>
                </CardContent>
              </Card>
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
        description="Active recall sets generated from your uploaded learning materials."
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => setView('create')}
            leftIcon={<Plus size={14} />}
          >
            New Deck
          </Button>
        }
      >
        <div className="space-y-6">
          {setsList.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mx-auto">
                  <Layers size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--color-text)]">No flashcards created yet</h3>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
                    Generate an interactive active-recall deck from your uploaded study materials.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setView('create')}>
                  Create First Deck
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
                        {set.card_count} flashcards
                      </Badge>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(set.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold line-clamp-1">{set.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 flex items-center justify-between text-xs font-semibold text-[var(--color-primary)]">
                    <span>Study Deck</span>
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
      title="Flashcard Generator"
      description="Synthesize key definitions, formulas, and concepts into an active-recall deck."
      actions={
        setsList.length > 0 ? (
          <Button size="sm" variant="outline" onClick={() => setView('list')} leftIcon={<ChevronLeft size={14} />}>
            My Decks ({setsList.length})
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Configure Study Deck</CardTitle>
            <CardDescription>
              Select source reading material and desired number of cards.
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
                <option value="">Choose document to synthesize...</option>
                {docs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Cards Count Select */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Number of Cards
              </label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value={5}>5 Cards (Focused review)</option>
                <option value={10}>10 Cards (Standard)</option>
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
                className="w-full h-11 text-sm font-semibold"
                leftIcon={!generating ? <Layers size={16} /> : undefined}
              >
                {generating ? 'Extracting Core Concepts...' : 'Generate Flashcards'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
