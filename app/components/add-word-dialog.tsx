'use client';

import { nanoid } from 'nanoid';
import { useState } from 'react';
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

interface TranslationGroupItem {
  id: string;
  translation: string;
  usages: Array<{ sentence: string; translation: string }>;
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
  const [translationGroups, setTranslationGroups] = useState<TranslationGroupItem[]>([
    { id: nanoid(), translation: '', usages: [{ sentence: '', translation: '' }] },
  ]);
  const [level, setLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setContent('');
    setPhonetic('');
    setDescription('');
    setTranslationGroups([
      { id: nanoid(), translation: '', usages: [{ sentence: '', translation: '' }] },
    ]);
    setLevel(1);
  };

  const handleGroupChange = (groupId: string, _field: 'translation', value: string) => {
    setTranslationGroups(
      translationGroups.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, translation: value };
      }),
    );
  };

  const handleUsageChange = (
    groupId: string,
    usageIndex: number,
    field: 'sentence' | 'translation',
    value: string,
  ) => {
    setTranslationGroups(
      translationGroups.map((g) => {
        if (g.id !== groupId) return g;
        const newUsages = g.usages.map((u, i) => (i === usageIndex ? { ...u, [field]: value } : u));
        return { ...g, usages: newUsages };
      }),
    );
  };

  const addUsageToGroup = (groupId: string) => {
    setTranslationGroups(
      translationGroups.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, usages: [...g.usages, { sentence: '', translation: '' }] };
      }),
    );
  };

  const removeUsageFromGroup = (groupId: string, usageIndex: number) => {
    setTranslationGroups(
      translationGroups.map((g) => {
        if (g.id !== groupId) return g;
        if (g.usages.length <= 1) return g;
        return {
          ...g,
          usages: g.usages.filter((_, i) => i !== usageIndex),
        };
      }),
    );
  };

  const addTranslationGroup = () => {
    setTranslationGroups([
      ...translationGroups,
      { id: nanoid(), translation: '', usages: [{ sentence: '', translation: '' }] },
    ]);
  };

  const removeTranslationGroup = (id: string) => {
    if (translationGroups.length > 1) {
      setTranslationGroups(translationGroups.filter((g) => g.id !== id));
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('请输入单词内容');
      return;
    }

    setIsSubmitting(true);
    try {
      const filteredGroups = translationGroups
        .filter((g) => g.translation.trim() || g.usages.some((u) => u.sentence.trim()))
        .map((g) => {
          const filteredUsages = g.usages
            .filter((u) => u.sentence.trim())
            .map((u) => ({
              sentence: u.sentence.trim(),
              translation: u.translation.trim() || undefined,
            }));

          return {
            id: g.id,
            translation: g.translation.trim(),
            usages: filteredUsages.length > 0 ? filteredUsages : undefined,
          };
        });

      await WordService.createWord(spaceId, {
        content: content.trim(),
        phonetic: phonetic.trim() || undefined,
        description: description.trim() || undefined,
        translationGroups: filteredGroups.length > 0 ? filteredGroups : undefined,
        level,
      });

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
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加单词</DialogTitle>
          <DialogDescription>添加一个新的单词到当前单词本</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
            <div className="flex items-center justify-between">
              <Label>翻译组</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addTranslationGroup}
                className="h-7 gap-1"
              >
                添加组
              </Button>
            </div>
            {translationGroups.map((group) => (
              <div key={group.id} className="space-y-2 p-4 border rounded-lg bg-muted/30">
                <Input
                  value={group.translation}
                  onChange={(e) => handleGroupChange(group.id, 'translation', e.target.value)}
                  placeholder="翻译"
                  className="font-medium"
                />
                {group.usages.map((usage, usageIndex) => (
                  <div
                    key={`${group.id}-usage-${usageIndex}`}
                    className="space-y-2 pl-3 border-l-2 border-muted"
                  >
                    <Input
                      value={usage.sentence}
                      onChange={(e) =>
                        handleUsageChange(group.id, usageIndex, 'sentence', e.target.value)
                      }
                      placeholder={`例句 ${usageIndex + 1}（可选）`}
                    />
                    <Input
                      value={usage.translation}
                      onChange={(e) =>
                        handleUsageChange(group.id, usageIndex, 'translation', e.target.value)
                      }
                      placeholder="例句翻译（可选）"
                      className="text-muted-foreground"
                    />
                    {group.usages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUsageFromGroup(group.id, usageIndex)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        删除例句
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addUsageToGroup(group.id)}
                  className="w-full"
                >
                  添加例句
                </Button>
                {translationGroups.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTranslationGroup(group.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    删除此组
                  </Button>
                )}
              </div>
            ))}
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

        <DialogFooter>
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
