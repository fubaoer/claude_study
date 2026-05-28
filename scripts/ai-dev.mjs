#!/usr/bin/env node
// ============================================================
// AI 开发代理 — GitHub Actions 中运行
// ============================================================
//
// 触发方式：
//   在 GitHub 创建 Issue（标题即需求）→ 自动触发 → AI 写代码 → 提 PR
//   或在 Issue 中评论 @ai → 自动触发
//
// 环境变量：
//   DEEPSEEK_API_KEY  — DeepSeek API 密钥（必填）
//   GITHUB_TOKEN       — GitHub Actions 自动注入
//
// 本地测试：
//   export DEEPSEEK_API_KEY="sk-xxx"
//   node scripts/ai-dev.mjs "在 App.vue 中添加 footer 组件"
// ============================================================

import OpenAI from 'openai'
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { extname } from 'node:path'

// ==================== 配置 ====================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
})

const RULE_FILES = ['CLAUDE.md', 'eslint.config.mjs', '.cursorrules', '.prettierrc']

// ==================== 工具函数 ====================

function loadRules() {
  const rules = []
  for (const file of RULE_FILES) {
    if (existsSync(file)) {
      rules.push(`### ${file}\n\`\`\`\n${readFileSync(file, 'utf8')}\n\`\`\``)
    }
  }
  return rules.join('\n\n')
}

function getProjectFiles() {
  const output = execSync('git ls-files', { encoding: 'utf8' })
  return output
    .split('\n')
    .filter((f) => ['.ts', '.vue', '.js', '.json', '.css', '.html', '.md'].includes(extname(f)))
    .slice(0, 30)
}

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

// ==================== AI 调用（DeepSeek） ====================

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取文件内容',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: '文件路径' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '写入文件（覆盖已有文件或创建新文件）',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          content: { type: 'string', description: '文件完整内容' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: '精确替换文件中的一段文本（old_string → new_string），先 read_file 确认再修改',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: '文件路径' },
          old_string: { type: 'string', description: '要替换的原文（必须和文件中完全一致）' },
          new_string: { type: 'string', description: '替换为的新文本' },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: '执行终端命令（如 npm install、npx prettier 等）',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: '要执行的命令' } },
        required: ['command'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish',
      description: '任务完成，返回修改摘要',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: '修改摘要（中文）' },
          module: { type: 'string', enum: ['前端', '后端', '全栈', '配置', '文档'], description: '所属模块' },
          files_changed: { type: 'array', items: { type: 'string' }, description: '修改的文件列表' },
        },
        required: ['summary', 'module', 'files_changed'],
      },
    },
  },
]

function executeTool(toolCall) {
  const { name, arguments: rawArgs } = toolCall.function
  const args = JSON.parse(rawArgs)
  console.log(`  🔧 ${name}: ${args.path || args.command || JSON.stringify(args).slice(0, 60)}`)

  switch (name) {
    case 'read_file':
      try { return readFileSync(args.path, 'utf8').slice(0, 8000) }
      catch (e) { return `错误: ${e.message}` }

    case 'write_file':
      try { writeFileSync(args.path, args.content, 'utf8'); return `文件已写入: ${args.path}` }
      catch (e) { return `错误: ${e.message}` }

    case 'edit_file':
      try {
        const original = readFileSync(args.path, 'utf8')
        if (!original.includes(args.old_string)) {
          return `错误: old_string 在文件中找不到。请先用 read_file 读取 ${args.path} 确认`
        }
        writeFileSync(args.path, original.replace(args.old_string, args.new_string), 'utf8')
        return `文件已修改: ${args.path}`
      } catch (e) { return `错误: ${e.message}` }

    case 'run_command':
      try {
        const out = execSync(args.command, { encoding: 'utf8', timeout: 60000 })
        return out.slice(0, 4000) || '(无输出)'
      } catch (e) { return `退出码 ${e.status}: ${(e.stderr || e.message).slice(0, 2000)}` }

    default: return `未知工具: ${name}`
  }
}

async function askAI(prompt) {
  if (!DEEPSEEK_API_KEY) {
    console.error('❌ 缺少 DEEPSEEK_API_KEY')
    console.error('   设置: export DEEPSEEK_API_KEY="sk-xxx"')
    process.exit(1)
  }

  const rules = loadRules()
  const files = getProjectFiles()
  const fileContext = readFileContext(files.slice(0, 15))

  const systemPrompt = `你是一个代码开发代理，在 GitHub Actions 中自动运行，根据 GitHub Issue 的需求来修改代码。

## 项目编码规范（必须严格遵守）

${rules}

## 工作方式

1. 分析 Issue 中的需求
2. 先用 read_file 阅读相关文件，理解现有代码
3. 用 edit_file 或 write_file 修改代码
4. 最后调用 finish 返回变更摘要

## 重要规则

- 单引号，无分号，2空格缩进，尾逗号
- 优先使用 const/let、箭头函数、模板字符串、解构赋值
- Vue 3 使用 Composition API + <script setup lang="ts">
- NestJS Controller 只做路由转发，逻辑放 Service
- 不引入新依赖，除非用户明确要求`

  console.log('\n🤖 正在调用 DeepSeek API...')

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `## 项目文件\n\n${files.map((f) => `- ${f}`).join('\n')}\n\n## 关键文件内容\n\n${fileContext}\n\n## Issue 需求\n\n${prompt}\n\n请分析需求，先读取相关文件，然后修改代码，完成后调用 finish 返回摘要。`,
    },
  ]

  for (let turn = 0; turn < 10; turn++) {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      tools: TOOLS,
      max_tokens: 8000,
      temperature: 0.1,
    })

    const msg = response.choices[0].message

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      console.log(`\n💬 AI 回复: ${msg.content || '(无内容)'}`)
      break
    }

    messages.push({ role: 'assistant', content: msg.content || null, tool_calls: msg.tool_calls })

    for (const tc of msg.tool_calls) {
      if (tc.function.name === 'finish') {
        const args = JSON.parse(tc.function.arguments)
        console.log(`\n📋 AI 摘要: [${args.module}] ${args.summary}`)
        return args
      }
      const result = executeTool(tc)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
  }

  return { summary: 'AI 处理完成', module: '全栈', files_changed: [] }
}

// ==================== Git 操作 ====================

function commitAndPush(result, taskId) {
  const branch = `ai/${Date.now()}`

  run(`git checkout -b ${branch}`, '创建新分支')
  run('npx prettier --write . 2>/dev/null || true', 'Prettier 格式化')
  run('npx eslint --fix . 2>/dev/null || true', 'ESLint 检查')
  run('git add -A', '暂存')
  const commitMsg = `[${result.module}] #${taskId} ${result.summary}`
  run(`git commit -m "${commitMsg}" || echo "无变更"`, `提交: ${commitMsg}`)
  run(`git push origin ${branch} 2>/dev/null || echo "推送跳过"`, '推送')

  return { branch, commitMsg }
}

function createPR(result, branch) {
  try {
    const body = `## 变更摘要\n\n${result.summary}\n\n### 修改的文件\n\n${result.files_changed.map((f) => `- ${f}`).join('\n')}\n\n> 🤖 此 PR 由 AI 自动生成，请人工审核。`
    const prUrl = execSync(
      `gh pr create --title "[${result.module}] ${result.summary}" --body "${body.replace(/"/g, '\\"')}" --base master --head ${branch} 2>&1`,
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
  return process.env.ISSUE_NUMBER || process.env.GITHUB_RUN_ID || Date.now().toString().slice(-5)
}

function getPrompt() {
  const args = process.argv.slice(2)
  if (args.length > 0) return args.join(' ')

  const eventPath = process.env.GITHUB_EVENT_PATH
  if (eventPath && existsSync(eventPath)) {
    try {
      const event = JSON.parse(readFileSync(eventPath, 'utf8'))
      if (event.issue?.title) return event.issue.title
      if (event.comment?.body) return event.comment.body.replace(/@ai\s*/i, '')
    } catch {}
  }

  console.error('❌ 没有找到需求描述')
  console.error('   本地测试: node scripts/ai-dev.mjs "你的需求"')
  process.exit(1)
}

async function main() {
  console.log('='.repeat(60))
  console.log('🤖 AI 开发代理 (DeepSeek)')
  console.log('='.repeat(60))

  const prompt = getPrompt()
  const taskId = getTaskId()
  console.log(`\n📝 需求: ${prompt}`)
  console.log(`🆔 任务 ID: #${taskId}`)

  const result = await askAI(prompt)
  console.log(`\n📋 AI 摘要: [${result.module}] ${result.summary}`)

  if (result.files_changed.length === 0) {
    console.log('\n⚠️  没有文件被修改，跳过')
    return
  }

  console.log(`\n📁 修改的文件: ${result.files_changed.join(', ')}`)

  const { branch, commitMsg } = commitAndPush(result, taskId)

  if (GITHUB_TOKEN) {
    createPR(result, branch)
  } else {
    console.log('\n⚠️  本地模式（无 GITHUB_TOKEN），不创建 PR')
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
