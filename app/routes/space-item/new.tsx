'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '~/components/page-header';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { SpaceService, WordService } from '~/lib/services/word-service';
import { parseSpaceId } from '~/lib/utils/token';

interface TranslationGroupItem {
  id: string;
  translation: string;
  usages: Array<{ sentence: string; translation: string }>;
}

export default function NewWordPage() {
  const { spaceToken } = useParams();
  const spaceId = parseSpaceId(spaceToken || '');
  const navigate = useNavigate();

  const space = useLiveQuery(() => SpaceService.getSpace(spaceId), [spaceId]);

  const [content, setContent] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [description, setDescription] = useState('');
  const [translationGroups, setTranslationGroups] = useState<TranslationGroupItem[]>([
    { id: nanoid(), translation: '', usages: [{ sentence: '', translation: '' }] },
  ]);
  const [level, setLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGroupChange = (groupId: string, field: 'translation', value: string) => {
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
      navigate(`/spaces/${spaceToken}`);
    } catch (error) {
      console.error(error);
      toast.error('添加失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!space) return null;

  return (
    <>
      <PageHeader
        title="添加单词"
        leftActions={
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to={`/spaces/${spaceToken}`} title="返回列表">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-6">
        <Card>
          <CardContent className="p-6 space-y-6">
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
                  <Plus className="w-3 h-3" /> 添加
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
                          <Trash2 className="w-3 h-3 mr-1" /> 删除例句
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
                    <Plus className="w-3 h-3 mr-1" /> 添加例句
                  </Button>
                  {translationGroups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTranslationGroup(group.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> 删除此组
                    </Button>
                  )}
                </div>
              ))}
            </div>

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
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">数字越大表示越难记住</p>
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

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/spaces/${spaceToken}`)}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
