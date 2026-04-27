'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, ArrowRight, Edit2, Loader2, Save, Trash2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { LevelSelector } from '~/components/level-selector';
import { SpeakButton } from '~/components/speak-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { useSpaceAutoSync } from '~/hooks/use-space-auto-sync';
import { WordService } from '~/lib/services/word-service';
import { useSyncStore } from '~/lib/stores/sync-store';
import type { Word } from '~/lib/types';

type Mode = 'add' | 'edit' | 'view';

interface UsageItem {
  id: string;
  sentence: string;
  translation: string;
}

interface FormState {
  content: string;
  phonetic: string;
  translation: string;
  usages: UsageItem[];
  level: number;
}

const SEARCH_PAGE_SIZE = 20;

interface RelatedWordsState {
  words: Word[];
  ids: string[];
  originalIds: string[];
  searchQuery: string;
  searchResults: Word[];
  searchOffset: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

interface BaseWordState {
  word: Word | null;
  wordId: string | undefined;
  originalWordId: string | undefined;
  searchQuery: string;
  searchResults: Word[];
  searchOffset: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

const createEmptyUsage = (): UsageItem => ({ id: nanoid(), sentence: '', translation: '' });

const toUsageItems = (word?: Word): UsageItem[] =>
  word?.usages?.length
    ? word.usages.map((u, i) => ({
        id: String(i),
        sentence: u.sentence,
        translation: u.translation || '',
      }))
    : [createEmptyUsage()];

const createDefaultFormState = (): FormState => ({
  content: '',
  phonetic: '',
  translation: '',
  usages: [createEmptyUsage()],
  level: 1,
});

const createDefaultRelatedState = (): RelatedWordsState => ({
  words: [],
  ids: [],
  originalIds: [],
  searchQuery: '',
  searchResults: [],
  searchOffset: 0,
  hasMore: false,
  isLoadingMore: false,
});

const createDefaultBaseWordState = (): BaseWordState => ({
  word: null,
  wordId: undefined,
  originalWordId: undefined,
  searchQuery: '',
  searchResults: [],
  searchOffset: 0,
  hasMore: false,
  isLoadingMore: false,
});

interface AddWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  mode?: Mode;
  wordId?: string;
  onSuccess?: () => void;
  onNavigateToWord?: (wordId: string, mode: 'edit' | 'view') => void;
}

export function AddWordDialog({
  open,
  onOpenChange,
  spaceId,
  mode = 'add',
  wordId,
  onSuccess,
  onNavigateToWord,
}: AddWordDialogProps) {
  const word = useLiveQuery(() => (wordId ? WordService.getWord(wordId) : undefined), [wordId]);
  const [currentMode, setCurrentMode] = useState<Mode>(mode);

  const [form, setForm] = useState<FormState>(createDefaultFormState);
  const [related, setRelated] = useState<RelatedWordsState>(createDefaultRelatedState);
  const [baseWordState, setBaseWordState] = useState<BaseWordState>(createDefaultBaseWordState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [existingWord, setExistingWord] = useState<Word | null>(null);

  const translationRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const handleSubmitRef = useRef<(() => void) | null>(null);
  const { syncPush } = useSyncStore();
  const shouldAutoSync = useSpaceAutoSync(spaceId);

  const isReadOnly = currentMode === 'view';

  const resetForm = useCallback(() => {
    setForm(createDefaultFormState());
    setRelated(createDefaultRelatedState());
    setBaseWordState(createDefaultBaseWordState());
    setCurrentMode('add');
    setExistingWord(null);
  }, []);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateRelated = <K extends keyof RelatedWordsState>(
    key: K,
    value: RelatedWordsState[K],
  ) => {
    setRelated((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    setCurrentMode(mode);
    if (mode === 'add') {
      resetForm();
    }
  }, [mode, resetForm]);

  useEffect(() => {
    if (currentMode === 'view' || !form.content.trim()) {
      setExistingWord(null);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await WordService.checkWordExists(spaceId, form.content);
      setExistingWord(found && found.id !== wordId ? found : null);
    }, 300);
    return () => clearTimeout(timer);
  }, [form.content, spaceId, currentMode, wordId]);

  useEffect(() => {
    if (word && (mode === 'edit' || mode === 'view')) {
      setForm({
        content: word.content,
        phonetic: word.phonetic || '',
        translation: word.description || '',
        usages: toUsageItems(word),
        level: word.level,
      });
      requestAnimationFrame(() => {
        if (translationRef.current) {
          adjustTextareaHeight(translationRef.current);
        }
      });
    }
  }, [word, mode, adjustTextareaHeight]);

  useEffect(() => {
    if (wordId && (mode === 'edit' || mode === 'view')) {
      WordService.getRelatedWords(wordId).then((words) => {
        const ids = words.map((w) => w.id);
        setRelated({
          words,
          ids,
          originalIds: ids,
          searchQuery: '',
          searchResults: [],
          searchOffset: 0,
          hasMore: false,
          isLoadingMore: false,
        });
      });
    }
  }, [wordId, mode]);

  useEffect(() => {
    if (!word || mode === 'add') return;
    if (mode !== 'edit' && mode !== 'view') return;

    if (word.baseWordId !== undefined && word.baseWordId !== word.id) {
      WordService.getWord(word.baseWordId).then((bw) => {
        if (bw) {
          setBaseWordState((prev) => ({
            ...prev,
            word: bw,
            wordId: bw.id,
            originalWordId: bw.id,
          }));
        }
      });
    }
  }, [word, mode]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isReadOnly) {
        e.preventDefault();
        handleSubmitRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isReadOnly]);

  const searchRelatedWords = useCallback(
    async (query: string, offset: number, append: boolean) => {
      if (!query.trim()) {
        setRelated((prev) => ({
          ...prev,
          searchResults: [],
          searchOffset: 0,
          hasMore: false,
          isLoadingMore: false,
        }));
        return;
      }
      const results = await WordService.getWordsBySpace(spaceId, {
        search: query,
        limit: SEARCH_PAGE_SIZE,
        offset,
      });
      const filtered = results.filter((w) => w.id !== wordId && !related.ids.includes(w.id));
      const hasMore = results.length === SEARCH_PAGE_SIZE;
      setRelated((prev) => ({
        ...prev,
        searchResults: append ? [...prev.searchResults, ...filtered] : filtered,
        searchOffset: offset + filtered.length,
        hasMore,
        isLoadingMore: false,
      }));
    },
    [spaceId, wordId, related.ids],
  );

  const handleSearchWords = (query: string) => {
    updateRelated('searchQuery', query);
    searchRelatedWords(query, 0, false);
  };

  const handleLoadMore = () => {
    if (related.isLoadingMore || !related.hasMore) return;
    setRelated((prev) => ({ ...prev, isLoadingMore: true }));
    searchRelatedWords(related.searchQuery, related.searchOffset, true);
  };

  const handleAddRelatedWord = (relatedWord: Word) => {
    if (related.ids.includes(relatedWord.id)) return;
    setRelated((prev) => ({
      ...prev,
      ids: [...prev.ids, relatedWord.id],
      words: [...prev.words, relatedWord],
      searchQuery: '',
      searchResults: [],
    }));
  };

  const handleRemoveRelatedWord = (relatedWordId: string) => {
    setRelated((prev) => ({
      ...prev,
      ids: prev.ids.filter((id) => id !== relatedWordId),
      words: prev.words.filter((w) => w.id !== relatedWordId),
    }));
  };

  const searchBaseWords = useCallback(
    async (query: string, offset: number, append: boolean) => {
      if (!query.trim()) {
        setBaseWordState((prev) => ({
          ...prev,
          searchResults: [],
          searchOffset: 0,
          hasMore: false,
          isLoadingMore: false,
        }));
        return;
      }
      const results = await WordService.getWordsBySpace(spaceId, {
        search: query,
        limit: SEARCH_PAGE_SIZE,
        offset,
      });
      const hasMore = results.length === SEARCH_PAGE_SIZE;
      setBaseWordState((prev) => ({
        ...prev,
        searchResults: append ? [...prev.searchResults, ...results] : results,
        searchOffset: offset + results.length,
        hasMore,
        isLoadingMore: false,
      }));
    },
    [spaceId],
  );

  const handleSearchBaseWords = (query: string) => {
    setBaseWordState((prev) => ({ ...prev, searchQuery: query }));
    searchBaseWords(query, 0, false);
  };

  const handleLoadMoreBaseWords = () => {
    if (baseWordState.isLoadingMore || !baseWordState.hasMore) return;
    setBaseWordState((prev) => ({ ...prev, isLoadingMore: true }));
    searchBaseWords(baseWordState.searchQuery, baseWordState.searchOffset, true);
  };

  const handleSelectBaseWord = (selectedWord: Word) => {
    setBaseWordState((prev) => ({
      ...prev,
      word: selectedWord,
      wordId: selectedWord.id,
      searchQuery: '',
      searchResults: [],
      searchOffset: 0,
      hasMore: false,
      isLoadingMore: false,
    }));
  };

  const handleClearBaseWord = () => {
    setBaseWordState((prev) => ({
      ...prev,
      word: null,
      wordId: undefined,
      searchQuery: '',
      searchResults: [],
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (!form.content.trim()) {
      toast.error('请输入单词内容');
      return;
    }

    setIsSubmitting(true);
    try {
      const filteredUsages = form.usages
        .filter((u) => u.sentence.trim())
        .map((u) => ({
          sentence: u.sentence.trim(),
          translation: u.translation.trim() || undefined,
        }));

      if (currentMode === 'edit' && wordId) {
        await WordService.updateWord(wordId, {
          content: form.content.trim(),
          phonetic: form.phonetic.trim() || undefined,
          description: form.translation.trim() || undefined,
          usages: filteredUsages.length > 0 ? filteredUsages : undefined,
          level: form.level,
        });

        const effectiveEditRelatedIds =
          baseWordState.wordId && !related.ids.includes(baseWordState.wordId)
            ? [...related.ids, baseWordState.wordId]
            : related.ids;

        await WordService.batchUpdateRelations(
          wordId,
          effectiveEditRelatedIds,
          related.originalIds,
        );

        const baseChanged = baseWordState.wordId !== baseWordState.originalWordId;
        if (baseChanged) {
          await WordService.setBaseWordId(wordId, baseWordState.wordId, spaceId);
        }

        toast.success('保存成功');
      } else {
        const newWordId = await WordService.createWord(spaceId, {
          content: form.content.trim(),
          phonetic: form.phonetic.trim() || undefined,
          description: form.translation.trim() || undefined,
          usages: filteredUsages.length > 0 ? filteredUsages : undefined,
          level: form.level,
        });

        const effectiveAddRelatedIds =
          baseWordState.wordId && !related.ids.includes(baseWordState.wordId)
            ? [...related.ids, baseWordState.wordId]
            : related.ids;

        await Promise.all(
          effectiveAddRelatedIds.map((id) => WordService.addRelatedWord(newWordId, id)),
        );

        if (baseWordState.wordId) {
          await WordService.setBaseWordId(newWordId, baseWordState.wordId, spaceId);
        }

        toast.success('单词添加成功');
        resetForm();
      }

      onOpenChange(false);
      onSuccess?.();

      if (shouldAutoSync) {
        syncPush(spaceId);
      }
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : currentMode === 'edit' ? '保存失败' : '添加失败';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    form,
    related,
    baseWordState,
    currentMode,
    wordId,
    resetForm,
    onOpenChange,
    onSuccess,
    syncPush,
    shouldAutoSync,
    spaceId,
  ]);

  handleSubmitRef.current = handleSubmit;

  const handleDelete = async () => {
    if (!wordId) return;
    setIsDeleting(true);
    try {
      await WordService.deleteWord(wordId);
      toast.success('单词已删除');
      if (shouldAutoSync) {
        syncPush(spaceId);
      }
      setIsDeleteDialogOpen(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  const handleNavigateToExistingWord = () => {
    if (!existingWord) return;
    onNavigateToWord?.(existingWord.id, 'edit');
  };

  const renderActionButtons = (showEdit: boolean) =>
    wordId && (
      <div className="flex items-center gap-4 pt-3 border-t">
        {showEdit && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setCurrentMode('edit')}
            className="text-primary px-0"
          >
            <Edit2 className="w-2 h-2" />
            编辑
          </Button>
        )}
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="text-destructive px-0"
        >
          <Trash2 className="w-2 h-2" />
          删除
        </Button>
      </div>
    );

  const getDialogTitle = () => {
    if (currentMode === 'view') return word?.content || '单词详情';
    if (currentMode === 'edit') return '编辑单词';
    return '添加单词';
  };

  if (currentMode === 'view' && !isReadOnly) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] flex flex-col p-0"
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="text-base">{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          {currentMode === 'view' ? (
            <>
              <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1">
                <div>
                  <Label className="text-muted-foreground text-xs">单词/短语</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-semibold">{word?.content}</span>
                    <SpeakButton text={word?.content || ''} size="md" />
                  </div>
                </div>

                {word?.description && (
                  <div>
                    <Label className="text-muted-foreground text-xs">翻译/例句/解释</Label>
                    <p className="text-sm leading-relaxed mt-1 whitespace-pre-wrap">
                      {word.description}
                    </p>
                  </div>
                )}

                {related.words.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">相关词</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {related.words.map((rw) => (
                        <button
                          key={rw.id}
                          type="button"
                          onClick={() => onNavigateToWord?.(rw.id, 'view')}
                          className="px-2.5 py-1 text-sm bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
                        >
                          {rw.content}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {word?.baseWordId && word.baseWordId !== word.id && (
                  <div>
                    <Label className="text-muted-foreground text-xs">词族</Label>
                    <div className="mt-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (word?.baseWordId) {
                            onNavigateToWord?.(word.baseWordId, 'view');
                          }
                        }}
                        className="px-2.5 py-1 text-sm bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
                      >
                        {baseWordState.word?.content || '...'}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground text-xs">难度</Label>
                  <LevelSelector value={word?.level ?? 1} className="mt-3" />
                </div>

                {renderActionButtons(true)}
              </div>

              <DialogFooter className="px-6 py-3 border-t shrink-0">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1">
                <div>
                  <Label htmlFor="content" className="text-muted-foreground text-xs">
                    单词/短语 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="content"
                    value={form.content}
                    onChange={(e) => updateForm('content', e.target.value)}
                    placeholder="输入要记忆的内容"
                    disabled={isReadOnly}
                    className={
                      existingWord
                        ? 'border-amber-500 focus-visible:ring-amber-500 mt-1.5'
                        : 'mt-1.5'
                    }
                  />
                  {existingWord && (
                    <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                            该单词已存在
                          </div>
                          <div className="mt-1.5 flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                              {existingWord.content}
                            </span>
                            {existingWord.phonetic && (
                              <span className="text-xs text-amber-600 dark:text-amber-400">
                                {existingWord.phonetic}
                              </span>
                            )}
                          </div>
                          {existingWord.description && (
                            <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 truncate">
                              {existingWord.description}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleNavigateToExistingWord}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-md transition-colors shrink-0"
                        >
                          去编辑
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">翻译/例句/解释</Label>
                  <Textarea
                    ref={translationRef}
                    value={form.translation}
                    onChange={(e) => {
                      updateForm('translation', e.target.value);
                      adjustTextareaHeight(e.target);
                    }}
                    placeholder="输入翻译、例句、解释等"
                    className="mt-1.5 resize-none overflow-hidden"
                    disabled={isReadOnly}
                    rows={1}
                  />
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">相关词</Label>
                  <div className="relative flex flex-wrap items-center gap-1.5 p-2 border rounded-md min-h-[40px] mt-1.5">
                    {related.words.map((rw) => (
                      <span
                        key={rw.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-primary/10 rounded-full"
                      >
                        <button
                          type="button"
                          onClick={() => onNavigateToWord?.(rw.id, 'view')}
                          className="hover:underline"
                        >
                          {rw.content}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRelatedWord(rw.id)}
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary/30"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <input
                      value={related.searchQuery}
                      onChange={(e) => handleSearchWords(e.target.value)}
                      placeholder={related.words.length > 0 ? '' : '搜索单词...'}
                      className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                    {related.searchResults.length > 0 && (
                      <div
                        className="absolute z-10 left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
                        onScroll={(e) => {
                          const el = e.currentTarget;
                          if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) {
                            handleLoadMore();
                          }
                        }}
                      >
                        {related.searchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleAddRelatedWord(result)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                          >
                            <span className="font-medium">{result.content}</span>
                            {result.phonetic && (
                              <span className="text-muted-foreground text-xs">
                                {result.phonetic}
                              </span>
                            )}
                          </button>
                        ))}
                        {related.isLoadingMore && (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">词族</Label>
                  <div className="relative flex flex-wrap items-center gap-1.5 p-2 border rounded-md min-h-[40px] mt-1.5">
                    {baseWordState.word && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-sm bg-primary/10 rounded-full">
                        <span>{baseWordState.word.content}</span>
                        <button
                          type="button"
                          onClick={handleClearBaseWord}
                          className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary/30"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    <input
                      value={baseWordState.searchQuery}
                      onChange={(e) => handleSearchBaseWords(e.target.value)}
                      placeholder={baseWordState.word ? '' : '搜索单词设置词族...'}
                      className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                    {baseWordState.searchResults.length > 0 && (
                      <div
                        className="absolute z-10 left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
                        onScroll={(e) => {
                          const el = e.currentTarget;
                          if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) {
                            handleLoadMoreBaseWords();
                          }
                        }}
                      >
                        {baseWordState.searchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleSelectBaseWord(result)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                          >
                            <span className="font-medium">{result.content}</span>
                            {result.phonetic && (
                              <span className="text-muted-foreground text-xs">
                                {result.phonetic}
                              </span>
                            )}
                          </button>
                        ))}
                        {baseWordState.isLoadingMore && (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">难度</Label>
                  <LevelSelector
                    value={form.level}
                    onChange={(level) => updateForm('level', level)}
                    disabled={isReadOnly}
                    className="mt-3"
                  />
                </div>

                {currentMode === 'edit' && renderActionButtons(false)}
              </div>

              <DialogFooter className="px-6 py-3 border-t shrink-0">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-1" />
                  {isSubmitting ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。单词 "{word?.content}" 将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
