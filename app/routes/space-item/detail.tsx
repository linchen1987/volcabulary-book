'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '~/components/page-header';
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
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { SpaceService, WordService } from '~/lib/services/word-service';
import type { Word } from '~/lib/types';
import { parseSpaceId } from '~/lib/utils/token';

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

export default function WordDetailPage() {
  const { spaceToken, wordId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const spaceId = parseSpaceId(spaceToken || '');
  const wId = wordId || '';
  const navigate = useNavigate();

  useLiveQuery(() => SpaceService.getSpace(spaceId), [spaceId]);
  const word = useLiveQuery(() => WordService.getWord(wId), [wId]);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [content, setContent] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [description, setDescription] = useState('');
  const [translation, setTranslation] = useState('');
  const [usages, setUsages] = useState<UsageItem[]>([]);
  const [level, setLevel] = useState(1);
  const [relatedWords, setRelatedWords] = useState<Word[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Word[]>([]);

  useEffect(() => {
    if (word && searchParams.get('edit') === 'true') {
      setContent(word.content);
      setPhonetic(word.phonetic || '');
      setDescription(word.description || '');
      setTranslation(word.translation || '');
      setUsages(toUsageItems(word));
      setLevel(word.level);
      setIsEditing(true);
      searchParams.delete('edit');
      setSearchParams(searchParams);
    }
  }, [word, searchParams, setSearchParams]);

  useEffect(() => {
    if (wId) {
      WordService.getRelatedWords(wId).then(setRelatedWords);
    }
  }, [wId]);

  const startEditing = () => {
    if (word) {
      setContent(word.content);
      setPhonetic(word.phonetic || '');
      setDescription(word.description || '');
      setTranslation(word.translation || '');
      setUsages(toUsageItems(word));
      setLevel(word.level);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

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

  const handleSave = async () => {
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

      await WordService.updateWord(wId, {
        content: content.trim(),
        phonetic: phonetic.trim() || undefined,
        description: description.trim() || undefined,
        translation: translation.trim() || undefined,
        usages: filteredUsages.length > 0 ? filteredUsages : undefined,
        level,
      });

      toast.success('保存成功');
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      toast.error('保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await WordService.deleteWord(wId);
      toast.success('单词已删除');
      navigate(`/spaces/${spaceToken}`);
    } catch (error) {
      console.error(error);
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
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

    const filtered = results.filter(
      (w) => w.id !== wId && !relatedWords.some((rw) => rw.id === w.id),
    );
    setSearchResults(filtered);
  };

  const handleAddRelatedWord = async (relatedWordId: string) => {
    try {
      await WordService.addRelatedWord(wId, relatedWordId);
      const updated = await WordService.getRelatedWords(wId);
      setRelatedWords(updated);
      setSearchQuery('');
      setSearchResults([]);
      toast.success('已添加相关词');
    } catch (error) {
      console.error(error);
      toast.error('添加失败');
    }
  };

  const handleRemoveRelatedWord = async (relatedWordId: string) => {
    try {
      await WordService.removeRelatedWord(wId, relatedWordId);
      const updated = await WordService.getRelatedWords(wId);
      setRelatedWords(updated);
      toast.success('已移除相关词');
    } catch (error) {
      console.error(error);
      toast.error('移除失败');
    }
  };

  if (!word) return null;

  return (
    <>
      <PageHeader
        title={isEditing ? '编辑单词' : word.content}
        leftActions={
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to={`/spaces/${spaceToken}`} title="返回列表">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        }
      >
        {!isEditing && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={startEditing} className="rounded-full">
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="rounded-full text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </PageHeader>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-6">
        {isEditing ? (
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
                <Label>相关词</Label>
                {relatedWords.length > 0 && (
                  <div className="space-y-2">
                    {relatedWords.map((rw) => (
                      <div
                        key={rw.id}
                        className="flex items-center justify-between p-2 border rounded-md bg-muted/30"
                      >
                        <Link
                          to={`/spaces/${spaceToken}/${rw.id}`}
                          className="text-sm hover:underline flex-1"
                          target="_blank"
                        >
                          {rw.content}
                        </Link>
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
                          onClick={() => handleAddRelatedWord(result.id)}
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
                <Button onClick={handleSave} disabled={isSubmitting} className="flex-1">
                  <Save className="w-4 h-4 mr-1" />
                  {isSubmitting ? '保存中...' : '保存'}
                </Button>
                <Button variant="outline" onClick={cancelEditing} className="flex-1">
                  <X className="w-4 h-4 mr-1" />
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold">{word.content}</h2>
                    {word.phonetic && <p className="text-muted-foreground mt-1">{word.phonetic}</p>}
                  </div>
                  <span className="px-3 py-1.5 bg-primary/10 rounded-full text-sm font-medium shrink-0">
                    Lv.{word.level}
                  </span>
                </div>

                {word.description && (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">解释/笔记</h3>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {word.description}
                    </p>
                  </div>
                )}

                {(word.translation || word.usages?.some((u) => u.sentence)) && (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">翻译与例句</h3>
                    <div className="space-y-3">
                      {word.translation && (
                        <p className="text-sm leading-relaxed">{word.translation}</p>
                      )}
                      {word.usages?.map(
                        (usage) =>
                          usage.sentence && (
                            <div
                              key={usage.sentence}
                              className="ml-4 space-y-1 border-l-2 border-primary/30 pl-3"
                            >
                              <p className="text-sm leading-relaxed">{usage.sentence}</p>
                              {usage.translation && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {usage.translation}
                                </p>
                              )}
                            </div>
                          ),
                      )}
                    </div>
                  </div>
                )}

                {relatedWords.length > 0 && (
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">相关词</h3>
                    <div className="flex flex-wrap gap-2">
                      {relatedWords.map((rw) => (
                        <Link
                          key={rw.id}
                          to={`/spaces/${spaceToken}/${rw.id}`}
                          className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 rounded-full transition-colors"
                        >
                          {rw.content}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>创建于: {new Date(word.createdAt).toLocaleString()}</p>
              <p>更新于: {new Date(word.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。单词 "{word.content}" 将被永久删除。
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
