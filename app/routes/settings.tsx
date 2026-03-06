import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { StorageConfig } from '~/components/storage-config';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center gap-4">
          <Link to="/spaces">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">设置</h1>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>存储配置</CardTitle>
            <CardDescription>配置数据同步的存储后端</CardDescription>
          </CardHeader>
          <CardContent>
            <StorageConfig />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
