'use client';

import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { useLocalStorage } from '~/hooks/use-local-storage';
import { STORAGE_KEYS } from '~/lib/constants';
import { FsService, type StorageType } from '~/lib/services/fs-service';

interface StorageConfigProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function StorageConfig({ onConnectionChange }: StorageConfigProps) {
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

  const handleStorageTypeChange = (type: StorageType) => {
    setStorageType(type);
    FsService.setStorageType(type);
    setConnectionStatus('idle');
    onConnectionChange?.(false);
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    try {
      FsService.clearCache();
      const exists = await FsService.exists('/');
      if (exists) {
        setConnectionStatus('success');
        onConnectionChange?.(true);
        toast.success('连接成功！');
      } else {
        throw new Error('Could not connect to root');
      }
    } catch (e) {
      setConnectionStatus('error');
      onConnectionChange?.(false);
      toast.error('连接失败');
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
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
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
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
    </div>
  );
}
