'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
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
import { WordService } from '~/lib/services/word-service';
import { useSyncStore } from '~/lib/stores/sync-store';
import type { Word } from '~/lib/types';

interface UsageItem {
  id: string;
  sentence: string;
  translation: string;
}

function toUsageItems(word?: Word): UsageItem[] {
  if (word?.usages && word.usages.length > 0) {
    return word.usages.map((u, i) => ({
      id: String(i),
      sentence: u.sentence,
      translation: u.translation || '',
    }));
  }
  return [{ id: '0', sentence: '', translation: '' }];
}

type Mode = 'add' | 'edit' | 'view';

interface AddWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  mode?: Mode;
  wordId?: string;
  onSuccess?: () => void;
}

export function AddWordDialog({
  open,
  onOpenChange,
  spaceId,
  mode = 'add',
  wordId,
  onSuccess,
}: AddWordDialogProps) {
  const word = useLiveQuery(() => (wordId ? WordService.getWord(wordId) : undefined), [wordId]);
  const [currentMode, setCurrentMode] = useState<Mode>(mode);

  const [content, setContent] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [description, setDescription] = useState('');
  const [translation, setTranslation] = useState('');
  const [usages, setUsages] = useState<UsageItem[]>([
    { id: nanoid(), sentence: '', translation: '' },
  ]);
  const [level, setLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [relatedWords, setRelatedWords] = useState<Word[]>([]);
  const [relatedWordIds, setRelatedWordIds] = useState<string[]>([]);
  const [originalRelatedWordIds, setOriginalRelatedWordIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Word[]>([]);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [existingWord, setExistingWord] = useState<Word | null>(null);

  const handleSubmitRef = useRef<(() => void) | null>(null);
  const { syncPush } = useSyncStore();

  const isReadOnly = currentMode === 'view';

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    if (currentMode !== 'add' || !content.trim()) {
      setExistingWord(null);
      return;
    }
    const timer = setTimeout(async () => {
      const found = await WordService.checkWordExists(spaceId, content);
      setExistingWord(found ?? null);
    }, 300);
    return () => clearTimeout(timer);
  }, [content, spaceId, currentMode]);

  useEffect(() => {
    if (word && (mode === 'edit' || mode === 'view')) {
      setContent(word.content);
      setPhonetic(word.phonetic || '');
      setDescription(word.description || '');
      setTranslation(word.translation || '');
      setUsages(toUsageItems(word));
      setLevel(word.level);
    }
  }, [word, mode]);

  useEffect(() => {
    if (wordId && (mode === 'edit' || mode === 'view')) {
      WordService.getRelatedWords(wordId).then((words) => {
        const ids = words.map((w) => w.id);
        setRelatedWords(words);
        setRelatedWordIds(ids);
        setOriginalRelatedWordIds(ids);
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

  const resetForm = useCallback(() => {
    setContent('');
    setPhonetic('');
    setDescription('');
    setTranslation('');
    setUsages([{ id: nanoid(), sentence: '', translation: '' }]);
    setLevel(1);
    setRelatedWordIds([]);
    setRelatedWords([]);
    setOriginalRelatedWordIds([]);
    setSearchQuery('');
    setSearchResults([]);
    setCurrentMode('add');
  }, []);

  const handleUsageChange = (usageId: string, field: 'sentence' | 'translation', value: string) => {
    setUsages(
      usages.map((u) => {
        if (u.id !== usageId) return u;
        return { ...u, [field]: value };
      }),
    );
  };

  const addUsage = () => {
    setUsages([...usages, { id: nanoid(), sentence: '', translation: '' }]);
  };

  const removeUsage = (id: string) => {
    if (usages.length > 1) {
      setUsages(usages.filter((u) => u.id !== id));
    }
  };

  const handleSearchWords = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await WordService.getWordsBySpace(spaceId, {
      search: query,
      limit: 10,
    });
    const filtered = results.filter((w) => w.id !== wordId && !relatedWordIds.includes(w.id));
    setSearchResults(filtered);
  };

  const handleAddRelatedWord = (relatedWord: Word) => {
    if (relatedWordIds.includes(relatedWord.id)) return;
    setRelatedWordIds([...relatedWordIds, relatedWord.id]);
    setRelatedWords([...relatedWords, relatedWord]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveRelatedWord = (relatedWordId: string) => {
    setRelatedWordIds(relatedWordIds.filter((id) => id !== relatedWordId));
    setRelatedWords(relatedWords.filter((w) => w.id !== relatedWordId));
  };

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) {
      toast.error('请输入单词内容');
      return;
    }

    setIsSubmitting(true);
    try {
      const filteredUsages = usages
        .filter((u) => u.sentence.trim())
        .map((u) => ({
          sentence: u.sentence.trim(),
          translation: u.translation.trim() || undefined,
        }));

      if (currentMode === 'edit' && wordId) {
        const toAdd = relatedWordIds.filter((id) => !originalRelatedWordIds.includes(id));
        const toRemove = originalRelatedWordIds.filter((id) => !relatedWordIds.includes(id));

        await WordService.updateWord(wordId, {
          content: content.trim(),
          phonetic: phonetic.trim() || undefined,
          description: description.trim() || undefined,
          translation: translation.trim() || undefined,
          usages: filteredUsages.length > 0 ? filteredUsages : undefined,
          level,
        });

        for (const relatedId of toAdd) {
          await WordService.addRelatedWord(wordId, relatedId);
        }
        for (const relatedId of toRemove) {
          await WordService.removeRelatedWord(wordId, relatedId);
        }

        toast.success('保存成功');
      } else {
        const newWordId = await WordService.createWord(spaceId, {
          content: content.trim(),
          phonetic: phonetic.trim() || undefined,
          description: description.trim() || undefined,
          translation: translation.trim() || undefined,
          usages: filteredUsages.length > 0 ? filteredUsages : undefined,
          level,
        });

        for (const relatedId of relatedWordIds) {
          await WordService.addRelatedWord(newWordId, relatedId);
        }

        toast.success('单词添加成功');
        resetForm();
      }

      onOpenChange(false);
      onSuccess?.();

      syncPush(spaceId);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : currentMode === 'edit' ? '保存失败' : '添加失败';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    content,
    usages,
    spaceId,
    phonetic,
    description,
    translation,
    level,
    relatedWordIds,
    currentMode,
    wordId,
    resetForm,
    onOpenChange,
    onSuccess,
    syncPush,
  ]);

  handleSubmitRef.current = handleSubmit;

  const handleDelete = async () => {
    if (!wordId) return;
    setIsDeleting(true);
    try {
      await WordService.deleteWord(wordId);
      toast.success('单词已删除');
      syncPush(spaceId);
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

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
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
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
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

                {relatedWords.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground text-xs">相关词</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {relatedWords.map((rw) => (
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

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-muted-foreground text-xs">音标</Label>
                    <div className="text-sm mt-1">{word?.phonetic || '-'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">记忆难度</Label>
                    <div className="mt-1">
                      <span className="px-2 py-0.5 bg-primary/10 rounded text-sm font-medium">
                        Lv.{word?.level ?? 1}
                      </span>
                    </div>
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
                <Button variant="ghost" onClick={handleClose}>
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
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="输入要记忆的内容"
                    disabled={isReadOnly}
                    className={
                      existingWord
                        ? 'border-destructive focus-visible:ring-destructive mt-1.5'
                        : 'mt-1.5'
                    }
                  />
                  {existingWord && currentMode === 'add' && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>该单词已存在</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">翻译</Label>
                  <Input
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                    placeholder="输入翻译"
                    className="font-medium mt-1.5"
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">相关词</Label>
                  <div className="relative flex flex-wrap items-center gap-1.5 p-2 border rounded-md min-h-[40px] mt-1.5">
                    {relatedWords.map((rw) => (
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
                      value={searchQuery}
                      onChange={(e) => handleSearchWords(e.target.value)}
                      placeholder={relatedWords.length > 0 ? '' : '搜索单词...'}
                      className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {searchResults.map((result) => (
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
                    {usages.map((usage) => (
                      <div key={usage.id} className="flex items-center gap-2">
                        <Input
                          value={usage.sentence}
                          onChange={(e) => handleUsageChange(usage.id, 'sentence', e.target.value)}
                          placeholder="例句（可选）"
                          disabled={isReadOnly}
                          className="flex-1"
                        />
                        {usages.length > 1 && !isReadOnly && (
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phonetic" className="text-muted-foreground text-xs">
                      音标
                    </Label>
                    <Input
                      id="phonetic"
                      value={phonetic}
                      onChange={(e) => setPhonetic(e.target.value)}
                      placeholder="/ˈɪŋɡlɪʃ/"
                      disabled={isReadOnly}
                      className="mt-1.5"
                    />
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
                      value={level}
                      onChange={(e) => setLevel(Number(e.target.value) || 1)}
                      disabled={isReadOnly}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-muted-foreground text-xs">
                    解释/笔记
                  </Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="输入单词的解释、历史、故事等"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1.5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <DialogFooter className="px-6 py-3 border-t shrink-0">
                <Button variant="outline" onClick={handleClose}>
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
