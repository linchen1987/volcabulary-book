'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowUpDown, Edit2, Plus, Search as SearchIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { AddWordDialog } from '~/components/add-word-dialog';
import { PageHeader } from '~/components/page-header';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import type { SortField, SortOrder } from '~/lib/services/word-service';
import { SpaceService, WordService } from '~/lib/services/word-service';
import type { Word } from '~/lib/types';
import { cn } from '~/lib/utils';
import { parseSpaceId } from '~/lib/utils/token';

function getTranslationPreview(word: Word): string {
  if (word.translationGroups && word.translationGroups.length > 0) {
    return word.translationGroups
      .filter((g) => g.translation)
      .map((g) => g.translation)
      .join('; ');
  }
  return '';
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'updatedAt', label: '更新时间' },
  { value: 'createdAt', label: '创建时间' },
  { value: 'level', label: '难度' },
  { value: 'content', label: '内容' },
];

export default function WordListPage() {
  const { spaceToken } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const spaceId = parseSpaceId(spaceToken || '');

  const q = searchParams.get('q') || '';
  const levelFilter = searchParams.get('level') ? Number(searchParams.get('level')) : undefined;
  const sortBy = (searchParams.get('sort') as SortField) || 'updatedAt';
  const sortOrder = (searchParams.get('order') as SortOrder) || 'desc';

  const [inputQuery, setInputQuery] = useState(q);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const space = useLiveQuery(() => SpaceService.getSpace(spaceId), [spaceId]);
  const stats = useLiveQuery(() => WordService.getStats(spaceId), [spaceId]);
  const words = useLiveQuery(
    () =>
      WordService.getWordsBySpace(spaceId, {
        search: q,
        levelFilter,
        sortBy,
        sortOrder,
      }),
    [spaceId, q, levelFilter, sortBy, sortOrder],
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (inputQuery) {
      params.set('q', inputQuery);
    } else {
      params.delete('q');
    }
    setSearchParams(params);
  };

  const clearSearch = () => {
    setInputQuery('');
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    setSearchParams(params);
  };

  const setLevelFilter = (level?: number) => {
    const params = new URLSearchParams(searchParams);
    if (level !== undefined) {
      params.set('level', String(level));
    } else {
      params.delete('level');
    }
    setSearchParams(params);
  };

  const toggleSortOrder = () => {
    const params = new URLSearchParams(searchParams);
    params.set('order', sortOrder === 'desc' ? 'asc' : 'desc');
    setSearchParams(params);
  };

  const setSortBy = (sort: SortField) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    setSearchParams(params);
  };

  if (!space) return null;

  return (
    <>
      <PageHeader title={space.name}>
        <div className="flex items-center gap-1 w-full max-w-[320px] justify-end">
          <form onSubmit={handleSearchSubmit} className="relative group w-full">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="搜索单词..."
              className="pl-9 h-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary/20 transition-all rounded-full text-sm"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
            />
            {inputQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full text-muted-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>
        </div>
      </PageHeader>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-6">
        <Card className="border-none shadow-sm overflow-hidden bg-card p-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {stats && (
                <>
                  <button
                    type="button"
                    onClick={() => setLevelFilter(undefined)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                      levelFilter === undefined
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80',
                    )}
                  >
                    全部 ({stats.total})
                  </button>
                  {Object.keys(stats.byLevel)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setLevelFilter(level)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                          levelFilter === level
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80',
                        )}
                      >
                        Lv.{level} ({stats.byLevel[level]})
                      </button>
                    ))}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <Button variant="ghost" size="icon" onClick={toggleSortOrder} className="h-9 w-9">
                <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-4 pb-20">
          {words?.map((word) => (
            <Card key={word.id} className="p-4 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <Link to={`/spaces/${spaceToken}/${word.id}`} className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate">{word.content}</h3>
                  {word.phonetic && (
                    <p className="text-sm text-muted-foreground">{word.phonetic}</p>
                  )}
                  {(() => {
                    const preview = getTranslationPreview(word);
                    return preview ? (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{preview}</p>
                    ) : null;
                  })()}
                </Link>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Link to={`/spaces/${spaceToken}/${word.id}?edit=true`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </Link>
                  <span className="px-2 py-1 bg-primary/10 rounded-full text-xs font-medium">
                    Lv.{word.level}
                  </span>
                </div>
              </div>
            </Card>
          ))}

          {words?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <SearchIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold">
                {q || levelFilter !== undefined ? '没有找到匹配的单词' : '暂无单词'}
              </h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                {q || levelFilter !== undefined
                  ? '尝试修改搜索条件'
                  : '点击右下角按钮添加你的第一个单词'}
              </p>
              {(q || levelFilter !== undefined) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    clearSearch();
                    setLevelFilter(undefined);
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsAddDialogOpen(true)}
        className="fixed right-6 bottom-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 z-50 flex items-center justify-center"
        aria-label="添加单词"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddWordDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} spaceId={spaceId} />
    </>
  );
}
