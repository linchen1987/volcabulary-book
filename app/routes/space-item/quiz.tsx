'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Lightbulb,
  RotateCcw,
  Shuffle,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { AddWordDialog } from '~/components/add-word-dialog';
import { LevelSelector } from '~/components/level-selector';
import { PageHeader } from '~/components/page-header';
import { SpeakButton } from '~/components/speak-button';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Progress } from '~/components/ui/progress';
import { useQuizConfig } from '~/hooks/use-quiz-config';
import type { WordStats } from '~/lib/services/word-service';
import { SpaceService, WordService } from '~/lib/services/word-service';
import type { Word } from '~/lib/types';
import { cn } from '~/lib/utils';
import { parseSpaceId } from '~/lib/utils/token';

type QuizState = 'setup' | 'quiz' | 'result';

function hasTranslationOrUsages(word: Word): boolean {
  return !!(word.translation || word.usages?.some((u) => u.sentence));
}

function getTranslationDisplay(word: Word): {
  translation?: string;
  usages?: Array<{ sentence: string; translation?: string }>;
} {
  if (word.translation || word.usages) {
    return {
      translation: word.translation,
      usages: word.usages,
    };
  }
  return {};
}

interface QuizWord {
  word: Word;
  passed: boolean | null;
}

export default function QuizPage() {
  const { spaceToken } = useParams();
  const spaceId = parseSpaceId(spaceToken || '');

  const space = useLiveQuery(() => SpaceService.getSpace(spaceId), [spaceId]);
  const stats = useLiveQuery(() => WordService.getStats(spaceId), [spaceId]);
  const allWords = useLiveQuery(() => WordService.getWordsBySpace(spaceId), [spaceId]);

  const [quizState, setQuizState] = useState<QuizState>('setup');
  const { selectedLevel, setSelectedLevel, quizCount, setQuizCount } = useQuizConfig();
  const [quizWords, setQuizWords] = useState<QuizWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [dialogMode, setDialogMode] = useState<'view' | 'edit' | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | undefined>();

  const currentQuizWord = quizWords[currentIndex];

  const availableCount = useMemo(() => {
    if (!stats) return 0;
    if (selectedLevel === 'all') return stats.total;
    return stats.byLevel[selectedLevel] || 0;
  }, [stats, selectedLevel]);

  useEffect(() => {
    if (quizCount > availableCount && availableCount > 0) {
      setQuizCount(availableCount);
    }
  }, [availableCount, quizCount, setQuizCount]);

  const startQuiz = () => {
    if (!allWords || allWords.length === 0) {
      toast.error('没有可测验的单词');
      return;
    }

    let filteredWords = allWords;
    if (selectedLevel !== 'all') {
      filteredWords = allWords.filter((w) => w.level === selectedLevel);
    }

    if (filteredWords.length === 0) {
      toast.error('没有符合筛选条件的单词');
      return;
    }

    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(quizCount, shuffled.length));

    setQuizWords(selected.map((word) => ({ word, passed: null })));
    setCurrentIndex(0);
    setShowAnswer(false);
    setQuizState('quiz');
  };

  const toggleAnswer = () => {
    setShowAnswer((prev) => !prev);
  };

  const handleLevelChange = useCallback(async (wordId: string, newLevel: number) => {
    try {
      await WordService.updateWordLevel(wordId, newLevel);
      setQuizWords((prev) =>
        prev.map((qw) =>
          qw.word.id === wordId ? { ...qw, word: { ...qw.word, level: newLevel } } : qw,
        ),
      );
    } catch (error) {
      console.error('Failed to update word level:', error);
    }
  }, []);

  const markWord = async (passed: boolean) => {
    if (!currentQuizWord) return;

    const updatedWords = [...quizWords];
    updatedWords[currentIndex] = { ...currentQuizWord, passed };

    setQuizWords(updatedWords);

    if (currentIndex < updatedWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      setQuizState('result');
    }
  };

  const stopQuiz = () => {
    setQuizState('setup');
    setQuizWords([]);
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const openViewDialog = (wordId: string) => {
    setSelectedWordId(wordId);
    setDialogMode('view');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedWordId(undefined);
  };

  const handleNavigateToWord = (wordId: string, mode: 'edit' | 'view') => {
    closeDialog();
    setTimeout(() => {
      setSelectedWordId(wordId);
      setDialogMode(mode);
    }, 0);
  };

  if (!space) return null;

  return (
    <>
      <PageHeader
        title="测验"
        leftActions={
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to={`/spaces/${spaceToken}`} title="返回列表">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        }
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-12">
        {quizState === 'setup' && (
          <SetupPanel
            stats={stats}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            quizCount={quizCount}
            setQuizCount={setQuizCount}
            availableCount={availableCount}
            onStart={startQuiz}
          />
        )}

        {quizState === 'quiz' && currentQuizWord && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                {currentIndex + 1} / {quizWords.length}
              </span>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-sm font-medium">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-md">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{quizWords.filter((q) => q.passed === true).length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>{quizWords.filter((q) => q.passed === false).length}</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 transition-colors"
                  onClick={stopQuiz}
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="text-xs">结束</span>
                </Button>
              </div>
            </div>

            <Progress value={((currentIndex + 1) / quizWords.length) * 100} className="h-1.5" />

            <div className="pt-2">
              <QuizCard
                quizWord={currentQuizWord}
                showAnswer={showAnswer}
                onToggleAnswer={toggleAnswer}
                onMark={markWord}
                onLevelChange={handleLevelChange}
                onViewDetail={() => openViewDialog(currentQuizWord.word.id)}
              />
            </div>
          </div>
        )}

        {quizState === 'result' && (
          <ResultPanel quizWords={quizWords} onRestart={stopQuiz} spaceToken={spaceToken || ''} />
        )}
      </div>

      <AddWordDialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && closeDialog()}
        spaceId={spaceId}
        // 必须默认传 'add'，确保 dialogMode 变为 'view' 时能触发组件内部 mode 的变化
        mode={dialogMode || 'add'}
        wordId={selectedWordId}
        onSuccess={() => {}}
        onNavigateToWord={handleNavigateToWord}
      />
    </>
  );
}

function SetupPanel({
  stats,
  selectedLevel,
  setSelectedLevel,
  quizCount,
  setQuizCount,
  availableCount,
  onStart,
}: {
  stats?: WordStats;
  selectedLevel: number | 'all';
  setSelectedLevel: (level: number | 'all') => void;
  quizCount: number;
  setQuizCount: (count: number) => void;
  availableCount: number;
  onStart: () => void;
}) {
  const levels = stats
    ? Object.keys(stats.byLevel)
        .map(Number)
        .sort((a, b) => a - b)
    : [];

  return (
    <Card className="p-6 sm:p-8 border-none shadow-sm ring-1 ring-border/50 bg-card">
      <CardContent className="space-y-8 p-0">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">测验设置</h2>
        </div>

        <div className="space-y-4">
          <label className="text-base font-medium text-foreground block">测验范围</label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelectedLevel('all')}
              className={cn(
                'px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                selectedLevel === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 ring-offset-1 ring-offset-background'
                  : 'bg-secondary/60 hover:bg-secondary text-secondary-foreground hover:shadow-sm',
              )}
            >
              全部 ({stats?.total || 0})
            </button>
            {levels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedLevel(level)}
                className={cn(
                  'px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  selectedLevel === level
                    ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20 ring-offset-1 ring-offset-background'
                    : 'bg-secondary/60 hover:bg-secondary text-secondary-foreground hover:shadow-sm',
                )}
              >
                Lv.{level} ({stats?.byLevel[level] || 0})
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-base font-medium text-foreground block">测验数量</label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              max={Math.max(availableCount, 1)}
              value={quizCount}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= 1 && val <= Math.max(availableCount, 1)) {
                  setQuizCount(val);
                }
              }}
              className="w-24 h-11 text-base rounded-xl text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              / {availableCount} 个单词
            </span>
          </div>
        </div>

        <div className="pt-2">
          <Button
            onClick={onStart}
            disabled={availableCount === 0}
            size="lg"
            className="w-full h-14 text-base font-medium gap-2 rounded-xl shadow-sm"
          >
            <Shuffle className="w-5 h-5" />
            开始测验
          </Button>
        </div>

        {availableCount === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            没有可选的单词，请先添加单词或更改筛选条件
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function QuizCard({
  quizWord,
  showAnswer,
  onToggleAnswer,
  onMark,
  onLevelChange,
  onViewDetail,
}: {
  quizWord: QuizWord;
  showAnswer: boolean;
  onToggleAnswer: () => void;
  onMark: (passed: boolean) => void;
  onLevelChange: (wordId: string, level: number) => void;
  onViewDetail: () => void;
}) {
  const { word } = quizWord;

  return (
    <Card className="overflow-hidden border-none shadow-sm ring-1 ring-border/50">
      <CardContent className="p-6 sm:p-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">{word.content}</h2>
            <SpeakButton text={word.content} size="lg" />
          </div>
          {word.phonetic && (
            <p className="text-lg text-muted-foreground font-medium">{word.phonetic}</p>
          )}
        </div>

        <div className="flex items-center justify-center">
          <div className="flex items-center justify-center gap-2 bg-secondary/40 p-1.5 rounded-2xl border border-border/50 shadow-sm">
            <div className="px-2">
              <LevelSelector
                value={word.level}
                onChange={(level) => onLevelChange(word.id, level)}
              />
            </div>
            <div className="w-px h-6 bg-border/50 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-4 gap-2 font-medium rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              onClick={onViewDetail}
              title="查看详情"
            >
              <BookOpen className="w-4 h-4" />
              <span>详情</span>
            </Button>
            <div className="w-px h-6 bg-border/50 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-9 px-4 gap-2 font-medium rounded-xl transition-all',
                showAnswer
                  ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
              onClick={onToggleAnswer}
              title={showAnswer ? '隐藏答案' : '显示答案'}
            >
              {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showAnswer ? '隐藏' : '答案'}</span>
            </Button>
          </div>
        </div>

        {showAnswer && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {(() => {
              if (!hasTranslationOrUsages(word)) return null;
              const display = getTranslationDisplay(word);
              return (
                <div className="bg-secondary/30 rounded-2xl p-6 border border-border/50">
                  <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    翻译与例句
                  </h3>
                  <div className="space-y-4">
                    {display.translation && (
                      <p className="text-base text-foreground leading-relaxed">
                        {display.translation}
                      </p>
                    )}
                    {display.usages && display.usages.length > 0 && (
                      <div className="space-y-4 pt-2">
                        {display.usages.map(
                          (usage) =>
                            usage.sentence && (
                              <div
                                key={usage.sentence}
                                className="pl-4 border-l-2 border-primary/30 space-y-1.5"
                              >
                                <p className="text-base text-foreground leading-relaxed">
                                  {usage.sentence}
                                </p>
                                {usage.translation && (
                                  <p className="text-sm text-muted-foreground">
                                    {usage.translation}
                                  </p>
                                )}
                              </div>
                            ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onMark(false)}
            className="gap-2.5 h-14 flex-1 max-w-[200px] text-base rounded-2xl border-red-200 bg-red-50/30 hover:bg-red-100/50 hover:text-red-700 hover:border-red-300 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-900/40 dark:hover:text-red-400 transition-colors shadow-sm"
          >
            <ThumbsDown className="w-5 h-5" />
            不通过
          </Button>
          <Button
            size="lg"
            onClick={() => onMark(true)}
            className="gap-2.5 h-14 flex-1 max-w-[200px] text-base rounded-2xl bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
          >
            <ThumbsUp className="w-5 h-5" />
            通过
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultPanel({
  quizWords,
  onRestart,
  spaceToken,
}: {
  quizWords: QuizWord[];
  onRestart: () => void;
  spaceToken: string;
}) {
  const passed = quizWords.filter((q) => q.passed === true).length;
  const failed = quizWords.filter((q) => q.passed === false).length;
  const total = quizWords.length;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <Card className="p-8 sm:p-10 border-none shadow-sm ring-1 ring-border/50 bg-card text-center">
        <CardContent className="p-0 space-y-8">
          <div>
            <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center ring-8 ring-primary/5">
              <Award className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-3">测验完成！</h2>
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground font-medium">
              正确率: {percentage}% ({passed}/{total})
            </div>
          </div>

          <div className="flex justify-center gap-12 bg-secondary/30 rounded-2xl p-6 border border-border/50">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                <Check className="w-6 h-6" />
                <span className="text-4xl font-bold">{passed}</span>
              </div>
              <p className="font-medium text-muted-foreground">通过</p>
            </div>
            <div className="w-px bg-border/50" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                <X className="w-6 h-6" />
                <span className="text-4xl font-bold">{failed}</span>
              </div>
              <p className="font-medium text-muted-foreground">不通过</p>
            </div>
          </div>

          <div className="flex gap-4 pt-2">
            <Button
              onClick={onRestart}
              variant="outline"
              className="flex-1 gap-2 h-14 text-base rounded-xl shadow-sm"
            >
              <RotateCcw className="w-5 h-5" />
              再测一次
            </Button>
            <Button asChild className="flex-1 gap-2 h-14 text-base rounded-xl shadow-sm">
              <Link to={`/spaces/${spaceToken}`}>
                <ArrowRight className="w-5 h-5" />
                返回列表
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="p-6 sm:p-8 border-none shadow-sm ring-1 ring-border/50">
        <CardContent className="p-0">
          <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">测验结果详情</h3>
          <div className="space-y-3">
            {quizWords.map((qw) => (
              <div
                key={qw.word.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-xl border',
                  qw.passed
                    ? 'bg-green-50/50 border-green-200/50 dark:bg-green-900/10 dark:border-green-900/30'
                    : 'bg-red-50/50 border-red-200/50 dark:bg-red-900/10 dark:border-red-900/30',
                )}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={cn(
                      'p-1.5 rounded-full',
                      qw.passed
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30',
                    )}
                  >
                    {qw.passed ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <span className="font-medium text-base">{qw.word.content}</span>
                </div>
                <span
                  className={cn(
                    'text-sm font-medium px-2.5 py-1 rounded-lg',
                    qw.passed
                      ? 'text-green-700 bg-green-100/50 dark:text-green-400 dark:bg-green-900/20'
                      : 'text-red-700 bg-red-100/50 dark:text-red-400 dark:bg-red-900/20',
                  )}
                >
                  Lv.{qw.word.level}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
