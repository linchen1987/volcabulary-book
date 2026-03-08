'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, ArrowRight, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
  description: string;
  translation: string;
  usages: UsageItem[];
  level: number;
}

interface RelatedWordsState {
  words: Word[];
  ids: string[];
  originalIds: string[];
  searchQuery: string;
  searchResults: Word[];
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

const DEFAULT_FORM_STATE: FormState = {
  content: '',
  phonetic: '',
  description: '',
  translation: '',
  usages: [createEmptyUsage()],
  level: 1,
};

const DEFAULT_RELATED_STATE: RelatedWordsState = {
  words: [],
  ids: [],
  originalIds: [],
  searchQuery: '',
  searchResults: [],
};

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

  const [form, setForm] = useState<FormState>(DEFAULT_FORM_STATE);
  const [related, setRelated] = useState<RelatedWordsState>(DEFAULT_RELATED_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [existingWord, setExistingWord] = useState<Word | null>(null);

  const handleSubmitRef = useRef<(() => void) | null>(null);
  const { syncPush } = useSyncStore();
  const shouldAutoSync = useSpaceAutoSync(spaceId);

  const isReadOnly = currentMode === 'view';

  const resetForm = useCallback(() => {
    setForm(DEFAULT_FORM_STATE);
    setRelated(DEFAULT_RELATED_STATE);
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
        description: word.description || '',
        translation: word.translation || '',
        usages: toUsageItems(word),
        level: word.level,
      });
    }
  }, [word, mode]);

  useEffect(() => {
    if (wordId && (mode === 'edit' || mode === 'view')) {
      WordService.getRelatedWords(wordId).then((words) => {
        const ids = words.map((w) => w.id);
        setRelated({ words, ids, originalIds: ids, searchQuery: '', searchResults: [] });
      });
    }
  }, [wordId, mode]);

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

  const handleUsageChange = (usageId: string, field: 'sentence' | 'translation', value: string) => {
    setForm((prev) => ({
      ...prev,
      usages: prev.usages.map((u) => (u.id !== usageId ? u : { ...u, [field]: value })),
    }));
  };

  const addUsage = () => {
    setForm((prev) => ({ ...prev, usages: [...prev.usages, createEmptyUsage()] }));
  };

  const removeUsage = (id: string) => {
    setForm((prev) => ({
      ...prev,
      usages: prev.usages.length > 1 ? prev.usages.filter((u) => u.id !== id) : prev.usages,
    }));
  };

  const handleSearchWords = async (query: string) => {
    updateRelated('searchQuery', query);
    if (!query.trim()) {
      updateRelated('searchResults', []);
      return;
    }
    const results = await WordService.getWordsBySpace(spaceId, { search: query, limit: 10 });
    const filtered = results.filter((w) => w.id !== wordId && !related.ids.includes(w.id));
    updateRelated('searchResults', filtered);
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
        const toAdd = related.ids.filter((id) => !related.originalIds.includes(id));
        const toRemove = related.originalIds.filter((id) => !related.ids.includes(id));

        await WordService.updateWord(wordId, {
          content: form.content.trim(),
          phonetic: form.phonetic.trim() || undefined,
          description: form.description.trim() || undefined,
          translation: form.translation.trim() || undefined,
          usages: filteredUsages.length > 0 ? filteredUsages : undefined,
          level: form.level,
        });

        await Promise.all(toAdd.map((id) => WordService.addRelatedWord(wordId, id)));
        await Promise.all(toRemove.map((id) => WordService.removeRelatedWord(wordId, id)));

        toast.success('保存成功');
      } else {
        const newWordId = await WordService.createWord(spaceId, {
          content: form.content.trim(),
          phonetic: form.phonetic.trim() || undefined,
          description: form.description.trim() || undefined,
          translation: form.translation.trim() || undefined,
          usages: filteredUsages.length > 0 ? filteredUsages : undefined,
          level: form.level,
        });

        await Promise.all(related.ids.map((id) => WordService.addRelatedWord(newWordId, id)));

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
                  <div className="text-lg font-semibold mt-1">{word?.content}</div>
                </div>

                {related.words.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">相关词</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {related.words.map((rw) => (
                        <span
                          key={rw.id}
                          className="px-2.5 py-1 text-sm bg-primary/10 rounded-full"
                        >
                          {rw.content}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {word?.translation && (
                  <div>
                    <Label className="text-muted-foreground text-xs">翻译</Label>
                    <p className="text-sm leading-relaxed mt-1">{word.translation}</p>
                  </div>
                )}

                {word?.usages && word.usages.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">例句</Label>
                    <div className="space-y-2 mt-1.5">
                      {word.usages.map(
                        (usage) =>
                          usage.sentence && (
                            <div key={usage.sentence} className="pl-3 border-l-2 border-muted">
                              <p className="text-sm leading-relaxed">{usage.sentence}</p>
                              {usage.translation && (
                                <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                                  {usage.translation}
                                </p>
                              )}
                            </div>
                          ),
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-muted-foreground text-xs">记忆难度</Label>
                  <div className="mt-1">
                    <span className="px-2 py-0.5 bg-primary/10 rounded text-sm font-medium">
                      Lv.{word?.level ?? 1}
                    </span>
                  </div>
                </div>

                {word?.description && (
                  <div>
                    <Label className="text-muted-foreground text-xs">解释/笔记</Label>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed mt-1">
                      {word.description}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="px-6 py-3 border-t shrink-0">
                {currentMode === 'view' && wordId && (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentMode('edit')}
                      className="text-primary hover:text-primary"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                  </>
                )}
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
                          {existingWord.translation && (
                            <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 truncate">
                              {existingWord.translation}
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
                  <Label className="text-muted-foreground text-xs">翻译</Label>
                  <Input
                    value={form.translation}
                    onChange={(e) => updateForm('translation', e.target.value)}
                    placeholder="输入翻译"
                    className="font-medium mt-1.5"
                    disabled={isReadOnly}
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
                        {rw.content}
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
                      <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
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
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-muted-foreground text-xs">例句</Label>
                    {!isReadOnly && (
                      <Button variant="ghost" size="sm" onClick={addUsage} className="h-6 text-xs">
                        <Plus className="w-3 h-3 mr-1" /> 添加
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {form.usages.map((usage) => (
                      <div key={usage.id} className="flex items-center gap-2">
                        <Input
                          value={usage.sentence}
                          onChange={(e) => handleUsageChange(usage.id, 'sentence', e.target.value)}
                          placeholder="例句（可选）"
                          disabled={isReadOnly}
                          className="flex-1"
                        />
                        {form.usages.length > 1 && !isReadOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeUsage(usage.id)}
                            className="text-muted-foreground hover:text-destructive shrink-0 h-9 w-9"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="level" className="text-muted-foreground text-xs">
                    记忆难度
                  </Label>
                  <Input
                    id="level"
                    type="number"
                    min={0}
                    max={10}
                    value={form.level}
                    onChange={(e) => updateForm('level', Number(e.target.value) || 1)}
                    disabled={isReadOnly}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-muted-foreground text-xs">
                    解释/笔记
                  </Label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    placeholder="输入单词的解释、历史、故事等"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1.5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isReadOnly}
                  />
                </div>
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
