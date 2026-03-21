'use client';

import { Check, CloudOff, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { FsService } from '~/lib/services/fs-service';
import { getLastSyncTime } from '~/lib/services/sync/service';

interface SyncStatusProps {
  spaceId: string;
  isSyncing: boolean;
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} 天前`;

  return new Date(timestamp).toLocaleDateString('zh-CN');
}

export function SyncStatus({ spaceId, isSyncing }: SyncStatusProps) {
  const [lastSyncTime, setLastSyncTime] = useState<number | undefined>();

  useEffect(() => {
    if (!isSyncing) {
      setLastSyncTime(getLastSyncTime(spaceId));
    }
  }, [spaceId, isSyncing]);

  const isConfigured = FsService.isConfigured();

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CloudOff className="w-4 h-4" />
        <span>未配置远程存储</span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>正在同步...</span>
      </div>
    );
  }

  if (lastSyncTime) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span>{formatTimeAgo(lastSyncTime)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <RefreshCw className="w-4 h-4" />
      <span>尚未同步</span>
    </div>
  );
}
