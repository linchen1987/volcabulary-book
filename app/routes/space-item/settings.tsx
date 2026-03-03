'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { AlertCircle, Check, Eye, EyeOff, Save, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { useLocalStorage } from '~/hooks/use-local-storage';
import { STORAGE_KEYS } from '~/lib/constants';
import { DataToolsService } from '~/lib/services/data-tools-service';
import { FsService, type StorageType } from '~/lib/services/fs-service';
import { SpaceService } from '~/lib/services/note-service';
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

  const [storageType, setStorageType] = useLocalStorage(
    STORAGE_KEYS.STORAGE_TYPE,
    'none' as StorageType,
  );

  const [url, setUrl] = useLocalStorage(STORAGE_KEYS.WEBDAV_URL, 'https://dav.jianguoyun.com/dav/');
  const [username, setUsername] = useLocalStorage(STORAGE_KEYS.WEBDAV_USERNAME, '');
  const [password, setPassword] = useLocalStorage(STORAGE_KEYS.WEBDAV_PASSWORD, '');

  const [s3Bucket, setS3Bucket] = useLocalStorage(STORAGE_KEYS.S3_BUCKET, '');
  const [s3Endpoint, setS3Endpoint] = useLocalStorage(STORAGE_KEYS.S3_ENDPOINT, '');
  const [s3AccessKeyId, setS3AccessKeyId] = useLocalStorage(STORAGE_KEYS.S3_ACCESS_KEY_ID, '');
  const [s3SecretAccessKey, setS3SecretAccessKey] = useLocalStorage(
    STORAGE_KEYS.S3_SECRET_ACCESS_KEY,
    '',
  );
  const [s3Region, setS3Region] = useLocalStorage(STORAGE_KEYS.S3_REGION, '');

  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'success' | 'error'
  >('idle');

  const [isClearingSyncEvents, setIsClearingSyncEvents] = useState(false);

  useState(() => {
    if (space && !spaceName) {
      setSpaceName(space.name);
    }
  });

  if (space && spaceName === '' && space.name) {
    setSpaceName(space.name);
  }

  const handleStorageTypeChange = (type: StorageType) => {
    setStorageType(type);
    FsService.setStorageType(type);
    setConnectionStatus('idle');
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    try {
      FsService.clearCache();
      const exists = await FsService.exists('/');
      if (exists) {
        setConnectionStatus('success');
        toast.success('连接成功！');
      } else {
        throw new Error('Could not connect to root');
      }
    } catch (e) {
      setConnectionStatus('error');
      toast.error('连接失败');
      console.error(e);
    }
  };

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
            <CardContent className="space-y-4">
              <div>
                <Label className="block mb-4">存储类型</Label>
                <RadioGroup
                  value={storageType}
                  onValueChange={(v) => handleStorageTypeChange(v as StorageType)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none">不使用远程存储</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="webdav" id="webdav" />
                    <Label htmlFor="webdav">WebDAV</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="s3" id="s3" />
                    <Label htmlFor="s3">S3 Compatible</Label>
                  </div>
                </RadioGroup>
              </div>

              {storageType === 'webdav' && (
                <>
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>用户名</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>密码</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-zinc-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-zinc-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {storageType === 's3' && (
                <>
                  <div className="space-y-2">
                    <Label>Endpoint</Label>
                    <Input
                      value={s3Endpoint}
                      onChange={(e) => setS3Endpoint(e.target.value)}
                      placeholder="https://s3.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Region</Label>
                    <Input
                      value={s3Region}
                      onChange={(e) => setS3Region(e.target.value)}
                      placeholder="us-east-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bucket</Label>
                    <Input
                      value={s3Bucket}
                      onChange={(e) => setS3Bucket(e.target.value)}
                      placeholder="my-bucket"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Access Key ID</Label>
                    <Input
                      value={s3AccessKeyId}
                      onChange={(e) => setS3AccessKeyId(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Secret Access Key</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={s3SecretAccessKey}
                        onChange={(e) => setS3SecretAccessKey(e.target.value)}
                        className="pr-10"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-zinc-500" />
                        ) : (
                          <Eye className="w-4 h-4 text-zinc-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {storageType !== 'none' && (
                <div className="pt-2">
                  <Button onClick={handleTestConnection} disabled={connectionStatus === 'testing'}>
                    {connectionStatus === 'testing' ? '测试中...' : '测试连接'}
                  </Button>
                </div>
              )}

              {connectionStatus === 'success' && (
                <div className="p-3 bg-green-100 text-green-700 rounded flex items-center gap-2 text-sm dark:bg-green-900/20 dark:text-green-400">
                  <Check className="w-4 h-4" /> 连接成功
                </div>
              )}

              {connectionStatus === 'error' && (
                <div className="p-3 bg-red-100 text-red-700 rounded flex items-center gap-2 text-sm dark:bg-red-900/20 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" /> 连接失败
                </div>
              )}
            </CardContent>
          </Card>

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
