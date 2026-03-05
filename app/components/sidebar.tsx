import { useLiveQuery } from 'dexie-react-hooks';
import {
  Book,
  ChevronDown,
  List,
  Monitor,
  Moon,
  PanelLeft,
  Settings,
  Sun,
  Target,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useTheme } from '~/components/theme-provider';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { SpaceService } from '~/lib/services/word-service';
import { cn } from '~/lib/utils';
import { createSpaceToken } from '~/lib/utils/token';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface SidebarProps {
  spaceId: string;
  isPWA?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ spaceId, isPWA, onClose, className }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { spaceToken } = useParams();
  const spaces = useLiveQuery(() => SpaceService.getAllSpaces()) || [];
  const currentSpace = spaces.find((sp) => sp.id === spaceId);

  const isAllWordsPage = location.pathname === `/spaces/${spaceToken}`;
  const isQuizPage = location.pathname === `/spaces/${spaceToken}/quiz`;
  const isSettingsPage = location.pathname.endsWith('/settings');

  return (
    <aside className={cn('bg-sidebar border-r flex flex-col h-full shrink-0 w-full', className)}>
      <div className="p-3 flex justify-between items-center">
        {isPWA ? (
          <Button
            variant="ghost"
            className="px-2 h-9 flex items-center gap-2 max-w-[180px] justify-start overflow-hidden cursor-default"
          >
            <Book className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold truncate text-sidebar-foreground">
              {currentSpace?.name || 'Space'}
            </span>
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="px-2 h-9 flex items-center gap-2 hover:bg-sidebar-accent/50 max-w-[180px] justify-start overflow-hidden"
              >
                <Book className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold truncate text-sidebar-foreground">
                  {currentSpace?.name || 'Space'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Switch Space
              </div>
              {spaces.map((sp) => (
                <DropdownMenuItem
                  key={sp.id}
                  onClick={() => {
                    navigate(`/spaces/${createSpaceToken(sp.id, sp.name)}`);
                    onClose?.();
                  }}
                  className={cn(
                    sp.id === spaceId && 'bg-sidebar-accent text-sidebar-accent-foreground',
                  )}
                >
                  <Book className="w-4 h-4 mr-2" />
                  <span className="truncate">{sp.name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  navigate('/spaces');
                  onClose?.();
                }}
              >
                <List className="w-4 h-4 mr-2" />
                All Spaces
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex items-center gap-1">
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground shrink-0"
            >
              <PanelLeft className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
      <Separator className="bg-sidebar-border" />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1 w-full max-w-full overflow-hidden">
          <button
            type="button"
            className={cn(
              'group flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors cursor-pointer text-sm font-medium w-full text-left',
              isAllWordsPage
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
            )}
            onClick={() => {
              navigate(`/spaces/${spaceToken}`);
              onClose?.();
            }}
          >
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <div className="w-4" />
              <span className="truncate">所有单词</span>
            </div>
          </button>

          <button
            type="button"
            className={cn(
              'group flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors cursor-pointer text-sm font-medium w-full text-left',
              isQuizPage
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
            )}
            onClick={() => {
              navigate(`/spaces/${spaceToken}/quiz`);
              onClose?.();
            }}
          >
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <Target className="w-4 h-4" />
              <span className="truncate">测验</span>
            </div>
          </button>
        </div>
      </ScrollArea>

      <div className="p-2 border-t bg-sidebar-accent/20">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'flex-1 h-9 justify-center text-sidebar-foreground',
              isSettingsPage
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent/50',
            )}
            onClick={() => {
              navigate(`/spaces/${spaceToken}/settings`);
              onClose?.();
            }}
          >
            <Settings className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex-1 h-9 justify-center text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                {theme === 'light' && <Sun className="w-4 h-4" />}
                {theme === 'dark' && <Moon className="w-4 h-4" />}
                {theme === 'system' && <Monitor className="w-4 h-4" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-40">
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <Sun className="w-4 h-4 mr-2" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <Moon className="w-4 h-4 mr-2" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Monitor className="w-4 h-4 mr-2" /> System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );
}

export const NotebookSidebar = Sidebar;
