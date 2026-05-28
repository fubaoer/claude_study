# CLAUDE.md — 团队 AI 编码规范

## 项目结构

Vue 3 + NestJS monorepo，npm workspaces 管理：

```
study_ai/
├── fronted/          # 前端：Vue 3 + Vite + Vue Router
├── backed/           # 后端：NestJS
├── .prettierrc        # 格式化规则
├── eslint.config.mjs  # 代码质量规则
└── .claude/settings.json  # AI 编码 Hook（自动格式化）
```

## 代码风格（Prettier 强制执行）

- **引号**：单引号 `'hello'`
- **分号**：不加分号
- **缩进**：2 个空格
- **尾逗号**：多行结构最后一个元素也加逗号
- **最大行长**：100 字符

## 语法规范（ESLint 强制执行）

### ES6+ 优先

| 禁止 | 用这个替代 |
|---|---|
| `var` | `const` / `let` |
| `function` 表达式 | 箭头函数 `() => {}` |
| `'hello ' + name` | 模板字符串 `` `hello ${name}` `` |
| `obj.name` 反复取值 | `const { name } = obj` |
| `fn.apply(this, args)` | `fn(...args)` |
| `arguments` 对象 | `...args` |
| `Object.assign({}, obj)` | `{ ...obj }` |
| `{ name: name }` | `{ name }` |
| `new Array()` | `[]` |

### TypeScript

- 未使用变量 → `error`
- `any` 类型 → `warn`

## 架构约定

### 前端 Vue 3
- 使用 Composition API + `<script setup lang="ts">`
- 组件用 PascalCase 命名，文件用 kebab-case 或 PascalCase
- 路由页面放 `src/pages/`，通用组件放 `src/components/`

### 后端 NestJS
- Controller 只做路由转发，业务逻辑放 Service
- 模块化：每个功能模块独立 folder（controller + service + module）
- 后端允许 `console.log`

## 工作流程

AI 每次 Edit/Write 代码文件后，Hook 会自动运行 Prettier + ESLint 修正格式和质量问题。

## 技术栈版本

- Vue 3.4+ / Vue Router 4.3+ / Vite 5.4+
- NestJS 10.3+
- TypeScript 5.5+ / strict 模式
