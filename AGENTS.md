# AGENTS.md

## 项目概览

跨境支付智能顾问平台 (CrossPay Advisor)，包含两大核心模块：
1. **智能换汇顾问** — 基于 AI 对话的换汇建议服务（前端已就绪，AI 后端待接入）
2. **汇率追踪预警** — 实时汇率监控与目标汇率预警通知

## 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── src/
│   ├── app/
│   │   ├── globals.css       # 全局样式（深色金融主题）
│   │   ├── layout.tsx        # 根布局
│   │   └── page.tsx          # 首页（双栏布局）
│   ├── components/
│   │   ├── ui/               # Shadcn UI 组件库
│   │   ├── header.tsx        # 顶部导航栏
│   │   ├── chat-panel.tsx    # 智能换汇顾问对话面板
│   │   └── alert-panel.tsx   # 汇率追踪预警面板
│   ├── hooks/
│   │   └── use-mobile.ts
│   └── lib/
│       └── utils.ts
├── DESIGN.md                 # 设计规范
└── AGENTS.md                 # 本文件
```

## 构建与测试命令

- **开发**: `pnpm run dev`（端口 5000，HMR 热更新）
- **构建**: `pnpm run build`
- **类型检查**: `pnpm ts-check`
- **Lint**: `pnpm lint`
- **生产启动**: `pnpm run start`

## 编码规范

- TypeScript strict 模式，禁止隐式 any
- 函数参数和返回值必须标注类型
- 使用 pnpm 管理依赖，禁止 npm/yarn
- 路径别名 `@/` 映射到 `src/`
- CSS 变量体系基于 oklch 色彩空间，深色主题为默认
- 组件使用 shadcn/ui 规范，位于 `src/components/ui/`

## 注意事项

- 页面为深色金融主题，`:root` 直接定义深色变量，不依赖 `.dark` class 切换
- 对话面板 AI 响应当前为模拟数据，后端接入时需替换为流式 SSE 接口
- 汇率数据当前为 mock，接入实时数据源时需替换
- `new Date()` 等动态数据需通过 `'use client'` + useEffect/useState 避免 hydration 不匹配
