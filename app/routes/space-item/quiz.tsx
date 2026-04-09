'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  Eye,
  Lightbulb,
  RotateCcw,
  Shuffle,
  Target,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { LevelSelector } from '~/components/level-selector';
import { PageHeader } from '~/components/page-header';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import type { WordStats } from '~/lib/services/word-service';
import { SpaceService, WordService } from '~/lib/services/word-service';
import type { Word } from '~/lib/types';
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
  const [selectedLevel, setSelectedLevel] = useState<number | 'all'>('all');
  const [quizCount, setQuizCount] = useState(10);
  const [quizWords, setQuizWords] = useState<QuizWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

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
  }, [availableCount, quizCount]);

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

  const revealAnswer = () => {
    setShowAnswer(true);
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

  const restartQuiz = () => {
    setQuizState('setup');
    setQuizWords([]);
    setCurrentIndex(0);
    setShowAnswer(false);
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

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
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
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                进度: {currentIndex + 1} / {quizWords.length}
              </span>
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-green-500" />
                <span>{quizWords.filter((q) => q.passed === true).length}</span>
                <ThumbsDown className="w-4 h-4 text-red-500" />
                <span>{quizWords.filter((q) => q.passed === false).length}</span>
              </div>
            </div>

            <Progress value={((currentIndex + 1) / quizWords.length) * 100} className="h-2" />

            <QuizCard
              quizWord={currentQuizWord}
              showAnswer={showAnswer}
              onReveal={revealAnswer}
              onMark={markWord}
              onLevelChange={handleLevelChange}
            />
          </div>
        )}

        {quizState === 'result' && (
          <ResultPanel
            quizWords={quizWords}
            onRestart={restartQuiz}
            spaceToken={spaceToken || ''}
          />
        )}
      </div>
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
    <Card className="p-6">
      <CardContent className="space-y-6 p-0">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">测验设置</h2>
            <p className="text-sm text-muted-foreground">选择测验范围和数量</p>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-sm font-medium">测验范围</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedLevel('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedLevel === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              全部 ({stats?.total || 0})
            </button>
            {levels.map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedLevel(level)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedLevel === level
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Lv.{level} ({stats?.byLevel[level] || 0})
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="quiz-count" className="text-sm font-medium">
            测验数量
          </label>
          <div className="flex items-center gap-4">
            <input
              id="quiz-count"
              type="range"
              min={1}
              max={Math.max(availableCount, 1)}
              value={quizCount}
              onChange={(e) => setQuizCount(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-bold w-16 text-right">{quizCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">可选单词数: {availableCount}</p>
        </div>

        <Button
          onClick={onStart}
          disabled={availableCount === 0}
          className="w-full h-12 text-lg gap-2"
        >
          <Shuffle className="w-5 h-5" />
          开始测验
        </Button>

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
  onReveal,
  onMark,
  onLevelChange,
}: {
  quizWord: QuizWord;
  showAnswer: boolean;
  onReveal: () => void;
  onMark: (passed: boolean) => void;
  onLevelChange: (wordId: string, level: number) => void;
}) {
  const { word } = quizWord;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold mb-2">{word.content}</h2>
          {word.phonetic && <p className="text-muted-foreground">{word.phonetic}</p>}
        </div>

        <div className="flex justify-center mb-6">
          <LevelSelector value={word.level} onChange={(level) => onLevelChange(word.id, level)} />
        </div>

        {showAnswer && (
          <div className="space-y-4 mb-6">
            {(() => {
              if (!hasTranslationOrUsages(word)) return null;
              const display = getTranslationDisplay(word);
              return (
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    翻译与例句
                  </h3>
                  <div className="space-y-3">
                    {display.translation && <p className="text-sm">{display.translation}</p>}
                    {display.usages?.map(
                      (usage) =>
                        usage.sentence && (
                          <div
                            key={usage.sentence}
                            className="ml-4 space-y-1 border-l-2 border-muted-foreground/20 pl-3"
                          >
                            <p className="text-sm">{usage.sentence}</p>
                            {usage.translation && (
                              <p className="text-sm text-muted-foreground">{usage.translation}</p>
                            )}
                          </div>
                        ),
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          {!showAnswer && (
            <Button onClick={onReveal} variant="outline" size="lg" className="gap-2 h-14 px-6">
              <Eye className="w-5 h-5" />
              显示答案
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            onClick={() => onMark(false)}
            className="gap-2 h-14 px-8 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            <ThumbsDown className="w-5 h-5" />
            不通过
          </Button>
          <Button
            size="lg"
            onClick={() => onMark(true)}
            className="gap-2 h-14 px-8 bg-green-600 hover:bg-green-700"
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
    <div className="space-y-6">
      <Card className="p-6">
        <CardContent className="p-0">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Award className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">测验完成！</h2>
            <p className="text-muted-foreground">
              正确率: {percentage}% ({passed}/{total})
            </p>
          </div>

          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                <Check className="w-5 h-5" />
                <span className="text-2xl font-bold">{passed}</span>
              </div>
              <p className="text-sm text-muted-foreground">通过</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-red-600 mb-1">
                <X className="w-5 h-5" />
                <span className="text-2xl font-bold">{failed}</span>
              </div>
              <p className="text-sm text-muted-foreground">不通过</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={onRestart} variant="outline" className="flex-1 gap-2 h-12">
              <RotateCcw className="w-4 h-4" />
              再测一次
            </Button>
            <Button asChild className="flex-1 gap-2 h-12">
              <Link to={`/spaces/${spaceToken}`}>
                <ArrowRight className="w-4 h-4" />
                返回列表
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="p-6">
        <CardContent className="p-0">
          <h3 className="font-bold mb-4">测验结果详情</h3>
          <div className="space-y-2">
            {quizWords.map((qw) => (
              <div
                key={qw.word.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  qw.passed ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  {qw.passed ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  <span className="font-medium">{qw.word.content}</span>
                </div>
                <span className="text-sm text-muted-foreground">Lv.{qw.word.level}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
