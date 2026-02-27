'use client';

import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { DataToolsService } from '~/lib/services/data-tools-service';

export default function DataToolsPage() {
  const [isClearingSyncEvents, setIsClearingSyncEvents] = useState(false);

  const clearSyncEvents = async () => {
    setIsClearingSyncEvents(true);
    try {
      await DataToolsService.clearSyncEvents(undefined);
      toast.success('同步事件已清除');
    } catch (error) {
      console.error('Clear syncEvents failed:', error);
      toast.error('清除失败');
    } finally {
      setIsClearingSyncEvents(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">数据工具</h1>
          <p className="text-muted-foreground">数据操作、维护任务和数据库管理。</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>清除所有同步事件</CardTitle>
            <CardDescription>
              删除 <code>syncEvents</code> 表中的所有记录。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button onClick={clearSyncEvents} disabled={isClearingSyncEvents}>
                {isClearingSyncEvents ? '清除中...' : '清除同步事件'}
              </Button>
              <Button variant="outline" asChild>
                <Link to="/playground">返回 Playground</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
