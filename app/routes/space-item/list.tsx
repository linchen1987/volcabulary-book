'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpen,
  CloudDownload,
  Edit2,
  MoreVertical,
  Plus,
  Search as SearchIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AddWordDialog } from '~/components/add-word-dialog';
import { PageHeader } from '~/components/page-header';
import { SyncStatus } from '~/components/sync-status';
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
import { Card } from '~/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Input } from '~/components/ui/input';
import type { SortField, SortOrder } from '~/lib/services/word-service';
import { SpaceService, WordService } from '~/lib/services/word-service';
import { useSyncStore } from '~/lib/stores/sync-store';
import type { Word } from '~/lib/types';
import { cn } from '~/lib/utils';
import { parseSpaceId } from '~/lib/utils/token';

function getTranslationPreview(word: Word): string {
  return word.translation || '';
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'updatedAt-desc', label: '更新时间 (最新)' },
  { value: 'updatedAt-asc', label: '更新时间 (最早)' },
  { value: 'createdAt-desc', label: '创建时间 (最新)' },
  { value: 'createdAt-asc', label: '创建时间 (最早)' },
  { value: 'level-desc', label: '难度 (高到低)' },
  { value: 'level-asc', label: '难度 (低到高)' },
  { value: 'content-asc', label: '内容 (A-Z)' },
  { value: 'content-desc', label: '内容 (Z-A)' },
];

type DialogMode = 'add' | 'edit' | 'view' | null;

export default function WordListPage() {
  const { spaceToken } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const spaceId = parseSpaceId(spaceToken || '');

  const q = searchParams.get('q') || '';
  const levelFilter = searchParams.get('level') ? Number(searchParams.get('level')) : undefined;
  const sortValue = searchParams.get('sort') || 'updatedAt-desc';
  const [sortBy, sortOrder] = sortValue.split('-') as [SortField, SortOrder];

  const [inputQuery, setInputQuery] = useState(q);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | undefined>();
  const [visibleTranslations, setVisibleTranslations] = useState<Set<string>>(new Set());
  const [hoveredTranslations, setHoveredTranslations] = useState<Set<string>>(new Set());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [wordToDelete, setWordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isSyncing, syncPull, ensurePulled, syncPush } = useSyncStore();

  useEffect(() => {
    ensurePulled(spaceId);
  }, [spaceId, ensurePulled]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !dialogMode) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setDialogMode('add');
        setSelectedWordId(undefined);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogMode]);

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

  const setSortValue = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', value);
    setSearchParams(params);
  };

  const toggleTranslation = (wordId: string) => {
    setVisibleTranslations((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const setTranslationHover = (wordId: string, isHovered: boolean) => {
    setHoveredTranslations((prev) => {
      const next = new Set(prev);
      if (isHovered) {
        next.add(wordId);
      } else {
        next.delete(wordId);
      }
      return next;
    });
  };

  const handlePull = async () => {
    await syncPull(spaceId);
  };

  const handleDeleteWord = async () => {
    if (!wordToDelete) return;

    setIsDeleting(true);
    try {
      await WordService.deleteWord(wordToDelete);
      toast.success('单词已删除');
      syncPush(spaceId);
    } catch (error) {
      console.error(error);
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setWordToDelete(null);
    }
  };

  const openDeleteDialog = (wordId: string) => {
    setWordToDelete(wordId);
    setIsDeleteDialogOpen(true);
  };

  const openViewDialog = (wordId: string) => {
    setSelectedWordId(wordId);
    setDialogMode('view');
  };

  const openEditDialog = (wordId: string) => {
    setSelectedWordId(wordId);
    setDialogMode('edit');
  };

  const openAddDialog = () => {
    setSelectedWordId(undefined);
    setDialogMode('add');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setSelectedWordId(undefined);
  };

  if (!space) return null;

  return (
    <>
      <PageHeader title={space.name}>
        <div className="flex items-center gap-3 w-full max-w-[500px] justify-end">
          <SyncStatus spaceId={spaceId} isSyncing={isSyncing} />
          <Button
            onClick={handlePull}
            disabled={isSyncing}
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="从远程拉取数据"
          >
            <CloudDownload className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
          </Button>
          <form onSubmit={handleSearchSubmit} className="relative group flex-1 max-w-[320px]">
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

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <select
            value={levelFilter === undefined ? '' : levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value === '' ? undefined : Number(e.target.value))
            }
            className="h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
          >
            <option value="">全部 {stats && `(${stats.total})`}</option>
            {stats &&
              Object.keys(stats.byLevel)
                .map(Number)
                .sort((a, b) => a - b)
                .map((level) => (
                  <option key={level} value={level}>
                    Lv.{level} ({stats.byLevel[level]})
                  </option>
                ))}
          </select>

          <div className="h-5 w-px bg-border" />

          <select
            value={sortValue}
            onChange={(e) => setSortValue(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="h-px bg-border mb-6" />

        <div className="space-y-4 pb-20">
          {words?.map((word) => {
            const isTranslationVisible = visibleTranslations.has(word.id);
            const isHovered = hoveredTranslations.has(word.id);
            const shouldShowTranslation = isTranslationVisible || isHovered;
            const translation = getTranslationPreview(word);

            return (
              <Card key={word.id} className="p-4 hover:shadow-md transition-all">
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0 flex-1 flex items-baseline gap-2">
                    <h3 className="text-lg font-semibold truncate">{word.content}</h3>
                    {word.phonetic && (
                      <span className="text-sm text-muted-foreground shrink-0">
                        {word.phonetic}
                      </span>
                    )}
                    {shouldShowTranslation && translation && (
                      <span className="text-sm text-muted-foreground truncate">{translation}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {translation && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleTranslation(word.id)}
                        onMouseEnter={() => setTranslationHover(word.id, true)}
                        onMouseLeave={() => setTranslationHover(word.id, false)}
                        className={cn(
                          'h-8 w-8',
                          isTranslationVisible && 'text-primary hover:text-primary',
                        )}
                        title={isTranslationVisible ? '隐藏翻译' : '显示翻译'}
                      >
                        <BookOpen className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(word.id)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-2xl p-2 min-w-[120px]">
                        <DropdownMenuItem onClick={() => openViewDialog(word.id)}>
                          详情
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(word.id)}
                          className="text-destructive focus:text-destructive rounded-xl"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <span className="px-2 py-1 bg-primary/10 rounded-full text-xs font-medium">
                      Lv.{word.level}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}

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
        onClick={openAddDialog}
        className="fixed right-6 bottom-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 z-50 flex items-center justify-center"
        aria-label="添加单词"
      >
        <Plus className="w-6 h-6" />
      </button>

      <AddWordDialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && closeDialog()}
        spaceId={spaceId}
        mode={dialogMode || 'add'}
        wordId={selectedWordId}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
            <AlertDialogDescription>此操作无法撤销。单词将被永久删除。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWord}
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
