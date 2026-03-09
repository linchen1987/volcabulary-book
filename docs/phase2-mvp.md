# Phase 2: 最小完整功能

## 目标

实现单词本的核心功能（不包括 AI 和测验）。

---

## 1. 数据模型

### Word 类型定义

```typescript
interface Word {
  id: string;
  spaceId: string;
  content: string;           // required - 单词/短语/句子
  description?: string;      // optional - 解释、历史、故事
  translations?: string[];   // optional - 翻译数组（多义词）
  usages?: Usage[];          // optional - 例句
  level: number;             // default 1 - 难度级别
  phonetic?: string;         // optional - 音标
  audioUrl?: string;         // optional - 语音URL
  createdAt: number;
  updatedAt: number;
}

interface Usage {
  sentence: string;          // 例句
  translation?: string;      // 例句翻译
}
```

---

## 2. 核心页面

### 2.1 Space 列表页 (`routes/spaces.tsx`)
- [ ] 显示所有 Space 列表
- [ ] 创建新 Space
- [ ] 删除 Space
- [ ] 进入 Space

### 2.2 单词列表页 (`routes/space-item/list.tsx`)
- [ ] 显示当前 Space 的所有单词
- [ ] 添加新单词按钮
- [ ] 单词卡片：显示 content + translations
- [ ] 点击进入单词详情
- [ ] 排序：创建时间、level
- [ ] 筛选：level

### 2.3 单词详情页 (`routes/space-item/detail.tsx`)
- [ ] 显示单词完整信息
- [ ] 编辑所有字段
- [ ] 删除单词
- [ ] 返回列表

### 2.4 Space 设置页 (`routes/space-settings.tsx`)
- [ ] Space 名称编辑
- [ ] 删除 Space

---

## 3. 服务层

### WordService (`app/lib/services/word-service.ts`)

```typescript
class WordService {
  // CRUD
  static async createWord(spaceId: string, data: CreateWordInput): Promise<Word>
  static async getWord(id: string): Promise<Word | undefined>
  static async getWordsBySpace(spaceId: string): Promise<Word[]>
  static async updateWord(id: string, data: UpdateWordInput): Promise<void>
  static async deleteWord(id: string): Promise<void>
  
  // 统计
  static async getWordCount(spaceId: string): Promise<number>
  static async getStats(spaceId: string): Promise<WordStats>
  
  // 筛选/排序
  static async getWordsByLevel(spaceId: string, level: number): Promise<Word[]>
}
```

---

## 4. UI 组件

- [ ] `WordCard` - 单词卡片组件
- [ ] `WordForm` - 单词编辑表单
- [ ] `WordList` - 单词列表组件
- [ ] `AddWordDialog` - 添加单词对话框
- [ ] `LevelFilter` - level 筛选组件
- [ ] `SortSelector` - 排序选择器

---

## 5. 统计功能

在单词列表页显示：
- [ ] 总单词数
- [ ] 各 level 单词数分布
- [ ] （可选）简单图表

---

## 6. 数据迁移

更新数据库版本，添加 words 表：

```typescript
this.version(2).stores({
  // ...existing
  words: 'id, spaceId, content, level, createdAt, updatedAt',
});
```

---

## 7. 验收标准

- [ ] 可创建/编辑/删除 Space
- [ ] 可添加/编辑/删除单词
- [ ] 单词列表正确显示
- [ ] 排序和筛选功能正常
- [ ] 统计数据正确
- [ ] 数据持久化到 IndexedDB
