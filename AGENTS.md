# Project Documentation

## Overview
Vocabulary Book - A web application for recording and learning English words. Built with React 19, React Router 7, Dexie (IndexedDB), Tailwind CSS v4, and Cloudflare Workers.

## Important Tips
- 设计到 UI 改动时，先进行布局等 UI 设计，保证 ui/ux 体验, 再实现 UI. 要求: 一致、亲密、自然、舒服
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
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (Radix + Tailwind)
│   └── *.tsx           # Feature components
├── hooks/              # Custom React hooks
├── lib/                # Core utilities and business logic
│   ├── db.ts          # Dexie database setup
│   ├── types.ts       # TypeScript type definitions
│   ├── constants.ts   # Application constants
│   ├── utils.ts       # Utility functions
│   ├── services/      # Business logic services
│   ├── stores/        # Zustand stores
│   └── utils/         # Helper utilities
├── routes/             # React Router route components
├── services/           # External service clients
├── root.tsx           # App root component
├── routes.ts          # Route configuration
└── entry.server.tsx   # Server entry point
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
