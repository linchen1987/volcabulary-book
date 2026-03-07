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

interface UsageItem {
  id: string;
  sentence: string;
  translation: string;
}

export default function NewWordPage() {
  const { spaceToken } = useParams();
  const spaceId = parseSpaceId(spaceToken || '');
  const navigate = useNavigate();

  const space = useLiveQuery(() => SpaceService.getSpace(spaceId), [spaceId]);

  const [content, setContent] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [description, setDescription] = useState('');
  const [translation, setTranslation] = useState('');
  const [usages, setUsages] = useState<UsageItem[]>([
    { id: nanoid(), sentence: '', translation: '' },
  ]);
  const [level, setLevel] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
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

      await WordService.createWord(spaceId, {
        content: content.trim(),
        phonetic: phonetic.trim() || undefined,
        description: description.trim() || undefined,
        translation: translation.trim() || undefined,
        usages: filteredUsages.length > 0 ? filteredUsages : undefined,
        level,
      });

      toast.success('单词添加成功');
      navigate(`/spaces/${spaceToken}`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : '添加失败';
      toast.error(message);
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
              <Label htmlFor="content">单词/短语 *</Label>
              <Input
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入要记忆的内容"
              />
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
                        <Trash2 className="w-3 h-3 mr-1" /> 删除例句
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addUsage} className="w-full">
                <Plus className="w-3 h-3 mr-1" /> 添加例句
              </Button>
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
