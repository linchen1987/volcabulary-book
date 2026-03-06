'use client';

import { CloudDownload, CloudUpload, RefreshCw } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { FsService } from '~/lib/services/fs-service';

interface SyncButtonProps {
  isSyncing: boolean;
  onSync: () => void;
  onPull?: () => void;
  onPush?: () => void;
  variant?: 'full' | 'simple';
}

export function SyncButton({
  isSyncing,
  onSync,
  onPull,
  onPush,
  variant = 'simple',
}: SyncButtonProps) {
  const isConfigured = FsService.isConfigured();

  if (!isConfigured) {
    return null;
  }

  if (variant === 'full') {
    return (
      <div className="flex gap-2">
        <Button onClick={onPull} disabled={isSyncing} variant="outline" size="sm">
          <CloudDownload className="w-4 h-4 mr-1" />
          拉取
        </Button>
        <Button onClick={onPush} disabled={isSyncing} variant="outline" size="sm">
          <CloudUpload className="w-4 h-4 mr-1" />
          推送
        </Button>
        <Button onClick={onSync} disabled={isSyncing} size="sm">
          <RefreshCw className={`w-4 h-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          同步
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={onSync} disabled={isSyncing} variant="outline" size="sm">
      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
    </Button>
  );
}
