#!/usr/bin/env node
// ============================================================
// AI 开发代理 — GitHub Actions 中运行
// ============================================================
//
// 流程：
//   1. 读取 Issue 描述 / workflow_dispatch 输入作为需求
//   2. 读取项目的 CLAUDE.md、eslint.config.mjs 作为 AI 规范
//   3. 调用 Claude API 生成代码修改
//   4. 格式化 + Lint 检查
//   5. 自动 commit（符合 [模块] #任务ID 描述 格式）
//   6. 推送到新分支 + 创建 PR
//
// 环境变量：
//   ANTHROPIC_API_KEY — Claude API 密钥（必填）
//   GITHUB_TOKEN       — GitHub Actions 自动注入
//   GITHUB_REPOSITORY  — 仓库名（自动注入）
//
// 本地测试：
//   node scripts/ai-dev.js "在 App.vue 中添加 footer 组件"
// ============================================================

import Anthropic from '@anthropic-ai/sdk'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'

// ==================== 配置 ====================

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || ''

// 项目中已有的规范文件（AI 会读取这些作为行为准则）
const RULE_FILES = ['CLAUDE.md', 'eslint.config.mjs', '.cursorrules', '.prettierrc']

// ==================== 工具函数 ====================

// 读取项目规范文件内容
function loadRules() {
  const rules = []
  for (const file of RULE_FILES) {
    if (existsSync(file)) {
      rules.push(`### ${file}\n\`\`\`\n${readFileSync(file, 'utf8')}\n\`\`\``)
    }
  }
  return rules.join('\n\n')
}

// 获取项目文件列表（过滤 node_modules、dist 等）
function getProjectFiles() {
  const output = execSync('git ls-files', { encoding: 'utf8' })
  return output
    .split('\n')
    .filter((f) => {
      const ext = extname(f)
      return ['.ts', '.vue', '.js', '.json', '.css', '.html', '.md'].includes(ext)
    })
    .slice(0, 30) // 限制文件数量，避免 token 超限
}

// 读取关键文件内容作为上下文
function readFileContext(files) {
  return files
    .map((f) => {
      try {
        return `### ${f}\n\`\`\`${extname(f).replace('.', '')}\n${readFileSync(f, 'utf8').slice(0, 2000)}\n\`\`\``
      } catch {
        return ''
      }
    })
    .join('\n\n')
}

// 执行命令并打印输出
function run(cmd, label) {
  console.log(`\n📌 ${label}...`)
  try {
    const out = execSync(cmd, { encoding: 'utf8' })
    console.log(out.trim() || '  (无输出)')
    return out
  } catch (e) {
    console.error(`  ❌ 失败: ${e.stderr || e.message}`)
    throw e
  }
}

// ==================== AI 调用 ====================

async function askAI(prompt) {
  if (!ANTHROPIC_API_KEY) {
    console.error('❌ 缺少 ANTHROPIC_API_KEY 环境变量')
    console.error('   请在 GitHub Actions Secrets 中配置')
    process.exit(1)
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  const rules = loadRules()
  const files = getProjectFiles()
  const fileContext = readFileContext(files.slice(0, 15)) // 取 15 个关键文件

  const systemPrompt = `你是一个代码开发代理，在 GitHub Actions 中自动运行。

## 项目编码规范（必须严格遵守）

${rules}

## 你的工作方式

1. 分析用户需求
2. 阅读现有代码，理解项目结构
3. 使用工具修改代码文件（Edit / Write）
4. 确保修改后的代码符合项目的 Prettier + ESLint 规范
5. 使用 ES6+ 语法

## 重要规则

- 单引号，无分号，2空格缩进
- 优先使用 const/let、箭头函数、模板字符串、解构赋值
- Vue 3 使用 Composition API + <script setup lang="ts">
- NestJS Controller 只做路由转发
- 不要引入新的依赖，除非用户明确要求
- 修改完成后返回变更摘要（中文）`

  console.log('\n🤖 正在调用 Claude API...')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `## 项目文件结构\n\n${files.join('\n')}\n\n## 关键文件内容\n\n${fileContext}\n\n## 用户需求\n\n${prompt}\n\n请分析需求并修改代码。完成后请返回一个 JSON 格式的摘要：\n\n\`\`\`json\n{\n  "summary": "修改摘要（中文）",\n  "module": "前端/后端/全栈/配置/文档",\n  "files_changed": ["文件路径1", "文件路径2"]\n}\n\`\`\``,
      },
    ],
    tools: [
      {
        name: 'read_file',
        description: '读取文件内容',
        input_schema: {
          type: 'object',
          properties: { path: { type: 'string', description: '文件路径' } },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: '写入文件（覆盖已有文件或创建新文件）',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '文件路径' },
            content: { type: 'string', description: '文件完整内容' },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'edit_file',
        description: '精确替换文件中的一段文本（old_string → new_string）',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: '文件路径' },
            old_string: { type: 'string', description: '要替换的原文（必须和文件中完全一致）' },
            new_string: { type: 'string', description: '替换为的新文本' },
          },
          required: ['path', 'old_string', 'new_string'],
        },
      },
      {
        name: 'run_command',
        description: '执行终端命令',
        input_schema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: '要执行的命令' },
          },
          required: ['command'],
        },
      },
      {
        name: 'finish',
        description: '任务完成，返回摘要',
        input_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string', description: '修改摘要（中文）' },
            module: {
              type: 'string',
              enum: ['前端', '后端', '全栈', '配置', '文档'],
              description: '修改所属模块',
            },
            files_changed: {
              type: 'array',
              items: { type: 'string' },
              description: '修改的文件列表',
            },
          },
          required: ['summary', 'module', 'files_changed'],
        },
      },
    ],
  })

  // 处理 tool calls
  const messages = [
    {
      role: 'user',
      content: `## 项目文件结构\n\n${files.join('\n')}\n\n## 关键文件内容\n\n${fileContext}\n\n## 用户需求\n\n${prompt}`,
    },
  ]

  let currentMsg = msg

  for (let turn = 0; turn < 10; turn++) {
    const assistantMsg = { role: 'assistant', content: currentMsg.content }

    if (
      currentMsg.stop_reason === 'end_turn' &&
      !currentMsg.content.some((b) => b.type === 'tool_use')
    ) {
      // AI 返回了纯文本（没有 tool calls），可能是不理解需求
      console.log('\n⚠️  AI 没有返回工具调用，回复内容：')
      console.log(currentMsg.content.map((b) => b.text || '').join(''))
      break
    }

    const toolUses = currentMsg.content.filter((b) => b.type === 'tool_use')

    if (toolUses.length === 0 && currentMsg.stop_reason === 'end_turn') {
      break
    }

    // 收集 tool results
    const toolResults = []

    for (const tool of toolUses) {
      console.log(`  🔧 ${tool.name}: ${tool.input.path || tool.input.command || ''}`)

      if (tool.name === 'read_file') {
        try {
          const content = readFileSync(tool.input.path, 'utf8')
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: content.slice(0, 8000),
          })
        } catch (e) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: `错误: ${e.message}`,
          })
        }
      } else if (tool.name === 'write_file') {
        try {
          const dir = join(tool.input.path, '..')
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
          writeFileSync(tool.input.path, tool.input.content, 'utf8')
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: `文件已写入: ${tool.input.path}`,
          })
        } catch (e) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: `错误: ${e.message}`,
          })
        }
      } else if (tool.name === 'edit_file') {
        try {
          const original = readFileSync(tool.input.path, 'utf8')
          if (!original.includes(tool.input.old_string)) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tool.id,
              content: `错误: old_string 在文件中找不到。请用 read_file 先读取文件确认内容。`,
            })
          } else {
            const modified = original.replace(tool.input.old_string, tool.input.new_string)
            writeFileSync(tool.input.path, modified, 'utf8')
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tool.id,
              content: `文件已修改: ${tool.input.path}`,
            })
          }
        } catch (e) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: `错误: ${e.message}`,
          })
        }
      } else if (tool.name === 'run_command') {
        try {
          const out = execSync(tool.input.command, { encoding: 'utf8', timeout: 30000 })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: out.slice(0, 4000) || '(无输出)',
          })
        } catch (e) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: `退出码 ${e.status}: ${e.stderr || e.message}`.slice(0, 2000),
          })
        }
      } else if (tool.name === 'finish') {
        return tool.input // 返回摘要 JSON
      }
    }

    // 构建下一轮消息
    const userMsg = { role: 'user', content: toolResults }

    currentMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: systemPrompt,
      messages: [...messages, assistantMsg, userMsg],
      tools:
        msg.content.filter((b) => b.type === 'tool_use').length > 0
          ? [
              {
                name: 'read_file',
                description: '读取文件内容',
                input_schema: {
                  type: 'object',
                  properties: { path: { type: 'string' } },
                  required: ['path'],
                },
              },
              {
                name: 'write_file',
                description: '写入文件',
                input_schema: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    content: { type: 'string' },
                  },
                  required: ['path', 'content'],
                },
              },
              {
                name: 'edit_file',
                description: '精确替换文件内容',
                input_schema: {
                  type: 'object',
                  properties: {
                    path: { type: 'string' },
                    old_string: { type: 'string' },
                    new_string: { type: 'string' },
                  },
                  required: ['path', 'old_string', 'new_string'],
                },
              },
              {
                name: 'run_command',
                description: '执行命令',
                input_schema: {
                  type: 'object',
                  properties: { command: { type: 'string' } },
                  required: ['command'],
                },
              },
              {
                name: 'finish',
                description: '任务完成',
                input_schema: {
                  type: 'object',
                  properties: {
                    summary: { type: 'string' },
                    module: { type: 'string', enum: ['前端', '后端', '全栈', '配置', '文档'] },
                    files_changed: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['summary', 'module', 'files_changed'],
                },
              },
            ]
          : undefined,
    })

    messages.push(assistantMsg, userMsg)
  }

  return { summary: 'AI 处理完成（未返回 finish 调用）', module: '全栈', files_changed: [] }
}

// ==================== Git 操作 ====================

function commitAndPush(result, taskId) {
  const branch = `ai/${Date.now()}`

  run(`git checkout -b ${branch}`, '创建新分支')

  // 运行格式化
  run('npx prettier --write . 2>/dev/null || true', 'Prettier 格式化')
  run('npx eslint --fix . --no-error-on-unmatched-pattern 2>/dev/null || true', 'ESLint 检查')

  // 提交
  run('git add -A', '暂存更改')
  const commitMsg = `[${result.module}] #${taskId} ${result.summary}`
  run(`git commit -m "${commitMsg}" || echo "没有变更提交"`, `提交: ${commitMsg}`)

  // 推送
  run(`git push origin ${branch} 2>/dev/null || echo "推送跳过"`, '推送到远程')

  return { branch, commitMsg }
}

function createPR(result, branch) {
  // 优先使用 GitHub CLI
  try {
    const prUrl = execSync(
      `gh pr create --title "[${result.module}] ${result.summary}" --body "## 变更摘要\n\n${result.summary}\n\n### 修改的文件\n\n${result.files_changed.map((f) => `- ${f}`).join('\n')}\n\n> 🤖 此 PR 由 AI 自动生成，请人工审核。\n> 任务 ID: #${getTaskId()}" --base master --head ${branch} 2>&1`,
      { encoding: 'utf8' },
    ).trim()
    console.log(`\n✅ PR 已创建: ${prUrl}`)
    return prUrl
  } catch (e) {
    console.error(`  ⚠️  创建 PR 失败: ${e.stderr || e.message}`)
    return null
  }
}

// ==================== 主流程 ====================

function getTaskId() {
  // 从 GitHub Actions 上下文获取 issue 编号
  const issueNumber = process.env.ISSUE_NUMBER || ''
  const runId = process.env.GITHUB_RUN_ID || ''
  return issueNumber || runId || Date.now().toString().slice(-5)
}

function getPrompt() {
  // 命令行传入的参数
  const args = process.argv.slice(2)
  if (args.length > 0) return args.join(' ')

  // GitHub Actions 环境：尝试从 event payload 读取
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (eventPath && existsSync(eventPath)) {
    try {
      const event = JSON.parse(readFileSync(eventPath, 'utf8'))
      // Issue 被打开
      if (event.issue?.title) return event.issue.title
      // Issue 评论
      if (event.comment?.body) return event.comment.body.replace(/@ai\s*/i, '')
    } catch {}
  }

  console.error('❌ 没有找到需求描述')
  console.error('   本地测试: node scripts/ai-dev.js "你的需求"')
  process.exit(1)
}

async function main() {
  console.log('='.repeat(60))
  console.log('🤖 AI 开发代理')
  console.log('='.repeat(60))

  const prompt = getPrompt()
  const taskId = getTaskId()

  console.log(`\n📝 需求: ${prompt}`)
  console.log(`🆔 任务 ID: #${taskId}`)

  // 调用 AI
  const result = await askAI(prompt)
  console.log(`\n📋 AI 摘要: [${result.module}] ${result.summary}`)

  if (result.files_changed.length === 0) {
    console.log('\n⚠️  没有文件被修改，跳过提交')
    return
  }

  console.log(`\n📁 修改的文件: ${result.files_changed.join(', ')}`)

  // 提交并推送
  const { branch, commitMsg } = commitAndPush(result, taskId)

  // 创建 PR
  if (GITHUB_TOKEN) {
    createPR(result, branch)
  } else {
    console.log('\n⚠️  本地模式下不创建 PR')
    console.log(`   分支: ${branch}`)
    console.log(`   Commit: ${commitMsg}`)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ 完成')
  console.log('='.repeat(60))
}

main().catch((e) => {
  console.error('\n❌ 失败:', e.message)
  process.exit(1)
})
