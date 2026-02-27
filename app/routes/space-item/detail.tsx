'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageHeader } from '~/components/page-header';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { SpaceService, WordService } from '~/lib/services/note-service';
import { parseSpaceId } from '~/lib/utils/token';

export default function WordDetailPage() {
  const { spaceToken, wordId } = useParams();
  const spaceId = parseSpaceId(spaceToken || '');
  const wId = wordId || '';

  useLiveQuery(() => SpaceService.getSpace(spaceId), [spaceId]);
  const word = useLiveQuery(() => WordService.getWord(wId), [wId]);

  if (!word) return null;

  return (
    <>
      <PageHeader
        title={word.content}
        leftActions={
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to={`/spaces/${spaceToken}`} title="返回列表">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8 space-y-6">
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

            {word.translations && word.translations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">翻译</h3>
                <ul className="list-disc list-inside space-y-1">
                  {word.translations.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {word.description && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">解释</h3>
                <p className="text-sm">{word.description}</p>
              </div>
            )}

            {word.usages && word.usages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">例句</h3>
                <ul className="space-y-2">
                  {word.usages.map((usage) => (
                    <li key={usage.sentence} className="text-sm">
                      <p>{usage.sentence}</p>
                      {usage.translation && (
                        <p className="text-muted-foreground">{usage.translation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        <footer className="text-muted-foreground text-sm">
          <p>创建于: {new Date(word.createdAt).toLocaleString()}</p>
          <p>更新于: {new Date(word.updatedAt).toLocaleString()}</p>
        </footer>
      </div>
    </>
  );
}
