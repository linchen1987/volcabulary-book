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

interface TranslationGroupItem {
  id: string;
  translation: string;
  usages: Array<{ sentence: string; translation: string }>;
}

function toTranslationGroupItems(word?: Word): TranslationGroupItem[] {
  if (word?.translationGroups && word.translationGroups.length > 0) {
    return word.translationGroups.map((g) => ({
      id: g.id,
      translation: g.translation,
      usages: g.usages?.map((u) => ({
        sentence: u.sentence,
        translation: u.translation || '',
      })) || [{ sentence: '', translation: '' }],
    }));
  }

  return [{ id: nanoid(), translation: '', usages: [{ sentence: '', translation: '' }] }];
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
  const [translationGroups, setTranslationGroups] = useState<TranslationGroupItem[]>([]);
  const [level, setLevel] = useState(1);
  const [relatedWords, setRelatedWords] = useState<Word[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Word[]>([]);

  useEffect(() => {
    if (word && searchParams.get('edit') === 'true') {
      setContent(word.content);
      setPhonetic(word.phonetic || '');
      setDescription(word.description || '');
      setTranslationGroups(toTranslationGroupItems(word));
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
      setTranslationGroups(toTranslationGroupItems(word));
      setLevel(word.level);
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
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

  const handleSave = async () => {
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

      await WordService.updateWord(wId, {
        content: content.trim(),
        phonetic: phonetic.trim() || undefined,
        description: description.trim() || undefined,
        translationGroups: filteredGroups.length > 0 ? filteredGroups : undefined,
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
                          to={`/spaces/${spaceToken}/words/${rw.id}`}
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
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{word.content}</h2>
                {word.phonetic && <p className="text-muted-foreground">{word.phonetic}</p>}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-primary/10 rounded-full text-sm font-medium">
                  Level: {word.level}
                </span>
              </div>

              {word.description && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">解释</h3>
                  <p className="text-sm whitespace-pre-wrap">{word.description}</p>
                </div>
              )}

              {(() => {
                const groups = toTranslationGroupItems(word);
                const hasContent = groups.some(
                  (g) => g.translation || g.usages.some((u) => u.sentence),
                );
                if (!hasContent) return null;
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">翻译与例句</h3>
                    <div className="space-y-4">
                      {groups.map((group, i) => (
                        <div key={group.id || i} className="space-y-2">
                          {group.translation && (
                            <div className="flex items-start gap-2">
                              <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                              <p className="text-sm">{group.translation}</p>
                            </div>
                          )}
                          {group.usages.map(
                            (usage, usageIndex) =>
                              usage.sentence && (
                                <div
                                  key={`${group.id}-usage-${usageIndex}`}
                                  className="ml-4 space-y-1 border-l-2 border-muted pl-3"
                                >
                                  <p className="text-sm">{usage.sentence}</p>
                                  {usage.translation && (
                                    <p className="text-sm text-muted-foreground">
                                      {usage.translation}
                                    </p>
                                  )}
                                </div>
                              ),
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {relatedWords.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">相关词</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedWords.map((rw) => (
                      <Link
                        key={rw.id}
                        to={`/spaces/${spaceToken}/words/${rw.id}`}
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
        )}

        {!isEditing && (
          <footer className="text-muted-foreground text-sm">
            <p>创建于: {new Date(word.createdAt).toLocaleString()}</p>
            <p>更新于: {new Date(word.updatedAt).toLocaleString()}</p>
          </footer>
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
