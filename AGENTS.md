# Project Documentation

## Overview
Vocabulary Book - A web application for recording and learning English words. Built with React 19, React Router 7, Dexie (IndexedDB), Tailwind CSS v4, and Cloudflare Workers.

## Important Tips
- 涉及到 UI 改动时，先进行布局等 UI 设计，保证 ui/ux 体验, 再实现 UI. 要求: 一致、亲密、自然、舒服
- IndexedDB 事务内的并发 `Promise.all` 调用存在 read-then-write 竞态风险。当多个操作读写同一记录的字段（如 `relatedWordIds`），必须放在**同一个事务内顺序执行**，不能用 `Promise.all` 并发各自独立事务，否则后写的事务会覆盖先写的变更导致数据丢失。
- 业务逻辑尽量提取为纯函数（如 `app/lib/services/related-words.ts`），与数据库操作分离，便于单元测试。

## Code Style Guidelines

### Formatting (Enforced by Biome)
- **Quotes**: Single quotes for strings (`'text'`)
- **Semicolons**: Always include semicolons
- **Indentation**: 2 spaces
- **Line Width**: 100 characters max
- **Trailing Commas**: As needed
- **Import Organization**: Biome automatically organizes imports

### State Management
- **Local State**: Use React's `useState` for component-local state
- **Server State**: Use Dexie with `useLiveQuery` hook for database queries
- **Global State**: Use Zustand for cross-component state
- **URL State**: Use React Router's `useSearchParams` for filter/pagination state


## Project Structure

```
app/
├── components/                # Reusable UI components
│   ├── ui/                   # Base UI components (Radix + Tailwind)
│   ├── add-word-dialog.tsx   # Add/edit word dialog
│   ├── level-selector.tsx    # Word difficulty level selector
│   ├── page-header.tsx       # Page header component
│   ├── related-words-selector.tsx # Related words picker
│   ├── sidebar.tsx           # App sidebar navigation
│   ├── speak-button.tsx      # TTS speak button
│   ├── storage-config.tsx    # Storage (WebDAV/S3) configuration
│   ├── sync-actions.tsx      # Sync action buttons
│   ├── sync-button.tsx       # Sync trigger button
│   ├── sync-status.tsx       # Sync status display
│   ├── theme-provider.tsx    # Theme context provider
│   └── tts-config.tsx        # TTS configuration
├── hooks/                    # Custom React hooks
│   ├── use-list-view-config.ts
│   ├── use-local-storage.ts
│   ├── use-pwa.ts
│   ├── use-service-worker-update.ts
│   └── use-space-auto-sync.ts
├── lib/                      # Core utilities and business logic
│   ├── db.ts                 # Dexie database setup
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Application constants
│   ├── utils.ts              # Utility functions
│   ├── services/             # Business logic services
│   │   ├── data-service.ts   # Generic CRUD data operations
│   │   ├── data-tools-service.ts # Data debugging tools
│   │   ├── export-service.ts # Word export logic
│   │   ├── fs-service.ts     # Filesystem abstraction
│   │   ├── import-service.ts # Word import logic
│   │   ├── related-words.ts  # Related words business logic (pure functions)
│   │   ├── word-service.ts   # Word-specific operations
│   │   ├── sync/             # Sync engine
│   │   └── tts/              # Text-to-speech service
│   │       ├── providers/    # TTS providers (dictionary-api, web-speech)
│   │       ├── cache.ts      # Audio cache
│   │       └── index.ts      # TTS service entry
│   ├── stores/               # Zustand stores
│   │   ├── sidebar-store.ts
│   │   └── sync-store.ts
│   └── utils/                # Helper utilities
│       ├── search.ts         # Search utility functions
│       └── token.ts          # Token utilities
├── routes/                   # React Router route components
│   ├── api.fs.ts             # Filesystem API endpoint
│   ├── landing.tsx           # Landing page
│   ├── manifest.tsx          # PWA manifest
│   ├── settings.tsx          # App settings page
│   ├── spaces.tsx            # Spaces list page
│   ├── playground/           # Dev/debug tools
│   └── space-item/           # Space-scoped routes
│       ├── layout.tsx        # Space layout
│       ├── list.tsx          # Word list view
│       ├── quiz.tsx          # Quiz mode
│       └── settings.tsx      # Space settings
├── services/                 # External service clients
│   └── fs-client.ts          # Filesystem API client
├── root.tsx                  # App root component
├── routes.ts                 # Route configuration
├── app.css                   # Global styles
└── entry.server.tsx          # Server entry point
```

## Tech Stack

### Core Technologies
- **Runtime**: Node.js (development), Cloudflare Workers (production)
- **Package Manager**: pnpm v10.28.0
- **Framework**: React 19 + React Router 7 (SSR enabled)
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Tailwind CSS v4
- **Database**: Dexie (IndexedDB wrapper)

### Key Libraries
- **UI Components**: Radix UI primitives
- **State**: Zustand
- **Notifications**: Sonner
- **Icons**: Lucide React
- **ID Generation**: nanoid
- **Sync**: WebDAV, S3

### Development Tools
- **Bundler**: Vite 7
- **Linter**: Biome 2.3
- **Testing**: Vitest 4
- **Type Checking**: TypeScript

## Architecture Notes

### Data Isolation
- Different spaces have isolated data
- All data queries are scoped to a specific `spaceId`
- Sync events track changes per space

### LocalStorage Management
- All localStorage keys must be managed in `app/lib/constants.ts`
- Use `STORAGE_KEYS` constant object
- General keys (like `theme`) don't need prefix
- Application-specific keys must use `@vocab-book/` prefix

## React Router 7 Resources
- Routing: https://reactrouter.com/start/framework/routing
- Data Loading: https://reactrouter.com/start/framework/data-loading
- Actions: https://reactrouter.com/start/framework/actions

## Business Logic
- **Space Isolation**: Different spaces contain completely isolated data
- **Word Management**: Words belong to spaces and have levels (difficulty)
- **Sync Support**: Changes are tracked via sync events for WebDAV/S3 sync
