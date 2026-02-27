'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search as SearchIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { PageHeader } from '~/components/page-header';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { SpaceService, WordService } from '~/lib/services/note-service';
import { parseSpaceId } from '~/lib/utils/token';

export default function WordListPage() {
  const { spaceToken } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const spaceId = parseSpaceId(spaceToken || '');
  const q = searchParams.get('q') || '';

  const [, setSearchQuery] = useState(q);
  const [inputQuery, setInputQuery] = useState(q);

  const space = useLiveQuery(() => SpaceService.getSpace(spaceId), [spaceId]);
  const words = useLiveQuery(() => WordService.getWordsBySpace(spaceId), [spaceId]);
  const wordCount = useLiveQuery(() => WordService.getWordCountBySpace(spaceId), [spaceId]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setSearchQuery(inputQuery);
    if (inputQuery) {
      setSearchParams({ q: inputQuery });
    } else {
      setSearchParams({});
    }
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
                onClick={() => {
                  setInputQuery('');
                  setSearchQuery('');
                  setSearchParams({});
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full text-muted-foreground transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </form>
        </div>
      </PageHeader>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-6">
        <Card className="border-none shadow-sm overflow-hidden bg-card p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-muted-foreground">单词数量</p>
              <p className="text-2xl font-bold">{wordCount || 0}</p>
            </div>
            <Link to={`/spaces/${spaceToken}/new`}>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> 添加单词
              </Button>
            </Link>
          </div>
        </Card>

        <div className="space-y-4 pb-20">
          {words?.map((word) => (
            <Link key={word.id} to={`/spaces/${spaceToken}/${word.id}`}>
              <Card className="p-4 hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{word.content}</h3>
                    {word.phonetic && (
                      <p className="text-sm text-muted-foreground">{word.phonetic}</p>
                    )}
                    {word.translations && word.translations.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {word.translations.join('; ')}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-1 bg-primary/10 rounded-full text-xs font-medium">
                    Lv.{word.level}
                  </span>
                </div>
              </Card>
            </Link>
          ))}

          {words?.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <SearchIcon className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold">暂无单词</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                点击上方按钮添加你的第一个单词
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
