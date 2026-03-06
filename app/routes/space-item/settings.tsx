'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '~/components/page-header';
import { StorageConfig } from '~/components/storage-config';
import { SyncButton } from '~/components/sync-button';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { DataToolsService } from '~/lib/services/data-tools-service';
import { FsService } from '~/lib/services/fs-service';
import { SpaceService } from '~/lib/services/word-service';
import { useSyncStore } from '~/lib/stores/sync-store';
import { parseSpaceId } from '~/lib/utils/token';

export default function SpaceSettingsPage() {
  const { spaceToken } = useParams();
  const spaceId = parseSpaceId(spaceToken || '');
  const navigate = useNavigate();

  const space = useLiveQuery(() => SpaceService.getSpace(spaceId), [spaceId]);

  const [spaceName, setSpaceName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isClearingSyncEvents, setIsClearingSyncEvents] = useState(false);

  const { isSyncing, syncPush, syncPull } = useSyncStore();

  useState(() => {
    if (space && !spaceName) {
      setSpaceName(space.name);
    }
  });

  if (space && spaceName === '' && space.name) {
    setSpaceName(space.name);
  }

  const handleSaveName = async () => {
    if (!spaceName.trim()) {
      toast.error('名称不能为空');
      return;
    }
    setIsSavingName(true);
    try {
      await SpaceService.updateSpace(spaceId, { name: spaceName.trim() });
      toast.success('名称已更新');
    } catch (error) {
      console.error(error);
      toast.error('更新失败');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteSpace = async () => {
    setIsDeleting(true);
    try {
      await SpaceService.deleteSpace(spaceId);
      toast.success('空间已删除');
      navigate('/spaces');
    } catch (error) {
      console.error(error);
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const clearSyncEvents = async () => {
    setIsClearingSyncEvents(true);
    try {
      await DataToolsService.clearSyncEvents(spaceId);
      toast.success('同步事件已清除');
    } catch (error) {
      console.error('Clear syncEvents failed:', error);
      toast.error('清除失败');
    } finally {
      setIsClearingSyncEvents(false);
    }
  };

  const handleSync = async () => {
    await syncPush(spaceId, { showToast: true });
  };

  const handlePull = async () => {
    await syncPull(spaceId);
  };

  const handlePush = async () => {
    await syncPush(spaceId, { showToast: true, skipPull: true });
  };

  return (
    <>
      <PageHeader title="设置" />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>空间信息</CardTitle>
              <CardDescription>修改空间名称</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="spaceName">空间名称</Label>
                <div className="flex gap-2">
                  <Input
                    id="spaceName"
                    value={spaceName}
                    onChange={(e) => setSpaceName(e.target.value)}
                    placeholder="输入空间名称"
                  />
                  <Button onClick={handleSaveName} disabled={isSavingName}>
                    <Save className="w-4 h-4 mr-1" />
                    {isSavingName ? '保存中...' : '保存'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>存储配置</CardTitle>
              <CardDescription>配置数据同步的存储后端</CardDescription>
            </CardHeader>
            <CardContent>
              <StorageConfig />
            </CardContent>
          </Card>

          {FsService.isConfigured() && (
            <Card>
              <CardHeader>
                <CardTitle>数据同步</CardTitle>
                <CardDescription>同步此空间的数据到远程存储</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SyncStatus spaceId={spaceId} isSyncing={isSyncing} />
                <SyncButton
                  isSyncing={isSyncing}
                  onSync={handleSync}
                  onPull={handlePull}
                  onPush={handlePush}
                  variant="full"
                />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>数据管理</CardTitle>
              <CardDescription>维护和管理此空间的数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <h3 className="font-medium">清除同步事件</h3>
                <p className="text-sm text-muted-foreground">删除此空间的所有同步事件记录</p>
                <Button onClick={clearSyncEvents} disabled={isClearingSyncEvents}>
                  {isClearingSyncEvents ? '清除中...' : '清除同步事件'}
                </Button>
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-4">
                <h3 className="font-medium text-destructive">危险操作</h3>
                <p className="text-sm text-muted-foreground">
                  删除此空间及其所有单词数据，此操作不可撤销
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  删除空间
                </Button>
              </div>

              <div className="h-px bg-border" />

              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link to={`/spaces/${spaceToken}`}>返回空间</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除此空间吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。空间 "{space?.name}" 及其所有单词数据将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSpace}
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
