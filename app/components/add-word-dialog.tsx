'use client';

import { X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { WordService } from '~/lib/services/word-service';
import type { Word } from '~/lib/types';

interface UsageItem {
  id: string;
  sentence: string;
  translation: string;
}

interface AddWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onSuccess?: () => void;
}

export function AddWordDialog({ open, onOpenChange, spaceId, onSuccess }: AddWordDialogProps) {
  const [content, setContent] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [description, setDescription] = useState('');
  const [translation, setTranslation] = useState('');
  const [usages, setUsages] = useState<UsageItem[]>([
    { id: nanoid(), sentence: '', translation: '' },
  ]);
  const [level, setLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [relatedWordIds, setRelatedWordIds] = useState<string[]>([]);
  const [relatedWords, setRelatedWords] = useState<Word[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Word[]>([]);
  const handleSubmitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const resetForm = useCallback(() => {
    setContent('');
    setPhonetic('');
    setDescription('');
    setTranslation('');
    setUsages([{ id: nanoid(), sentence: '', translation: '' }]);
    setLevel(1);
    setRelatedWordIds([]);
    setRelatedWords([]);
    setSearchQuery('');
    setSearchResults([]);
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
    const filtered = results.filter((w) => !relatedWordIds.includes(w.id));
    setSearchResults(filtered);
  };

  const handleAddRelatedWord = (word: Word) => {
    setRelatedWordIds([...relatedWordIds, word.id]);
    setRelatedWords([...relatedWords, word]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveRelatedWord = (wordId: string) => {
    setRelatedWordIds(relatedWordIds.filter((id) => id !== wordId));
    setRelatedWords(relatedWords.filter((w) => w.id !== wordId));
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

      const wordId = await WordService.createWord(spaceId, {
        content: content.trim(),
        phonetic: phonetic.trim() || undefined,
        description: description.trim() || undefined,
        translation: translation.trim() || undefined,
        usages: filteredUsages.length > 0 ? filteredUsages : undefined,
        level,
      });

      for (const relatedId of relatedWordIds) {
        await WordService.addRelatedWord(wordId, relatedId);
      }

      toast.success('单词添加成功');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error('添加失败');
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
    resetForm,
    onOpenChange,
    onSuccess,
  ]);

  handleSubmitRef.current = handleSubmit;

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>添加单词</DialogTitle>
          <DialogDescription>添加一个新的单词到当前单词本</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 px-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="content">单词/短语/句子 *</Label>
            <Input
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入要记忆的内容"
            />
          </div>

          <div className="space-y-3">
            <Label>相关词</Label>
            {relatedWords.length > 0 && (
              <div className="space-y-2">
                {relatedWords.map((rw) => (
                  <div
                    key={rw.id}
                    className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                  >
                    <span className="text-sm flex-1">{rw.content}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRelatedWord(rw.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchWords(e.target.value)}
                placeholder="搜索单词添加为相关词..."
                className="w-full"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleAddRelatedWord(result)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                    >
                      <span className="font-medium">{result.content}</span>
                      {result.phonetic && (
                        <span className="text-muted-foreground text-xs">{result.phonetic}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Label>翻译</Label>
            <Input
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="输入翻译"
              className="font-medium"
            />
            <div className="space-y-2">
              {usages.map((usage) => (
                <div key={usage.id} className="space-y-2 pl-3 border-l-2 border-muted">
                  <Input
                    value={usage.sentence}
                    onChange={(e) => handleUsageChange(usage.id, 'sentence', e.target.value)}
                    placeholder="例句（可选）"
                  />
                  <Input
                    value={usage.translation}
                    onChange={(e) => handleUsageChange(usage.id, 'translation', e.target.value)}
                    placeholder="例句翻译（可选）"
                    className="text-muted-foreground"
                  />
                  {usages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUsage(usage.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      删除例句
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addUsage} className="w-full">
              添加例句
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phonetic">音标</Label>
              <Input
                id="phonetic"
                value={phonetic}
                onChange={(e) => setPhonetic(e.target.value)}
                placeholder="/ˈɪŋɡlɪʃ/"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">记忆难度</Label>
              <Input
                id="level"
                type="number"
                min={0}
                max={10}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">0-10，越大越难</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">解释/笔记</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入单词的解释、历史、故事等"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
