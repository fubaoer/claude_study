// ============================================================
// 任务 ID 校验脚本（Demo 版本）
// ============================================================
//
// 在 pre-push 时被调用，校验本次推送的 commit 中引用的 #数字ID 是否有效
//
// 流程：
//   1. 读取本次要推送的 commit messages
//   2. 从中提取 #数字 格式的任务 ID
//   3. Demo 模式：匹配本地预设的有效 ID 列表
//      接入真实 API：修改 verifyTaskOnline 函数即可
//
// 接入真实 API 时：
//   修改 TASK_API_URL 和 verifyTaskOnline 中的 fetch 请求
//   设置环境变量 TASK_API_TOKEN 用于认证
// ============================================================

import { execSync } from 'node:child_process'

// ==================== 配置区 ====================

// 替换为你公司的任务系统 API 地址
const TASK_API_URL = process.env.TASK_API_URL || 'https://your-company.com/api/task'

// Demo：模拟"已存在的任务 ID 列表"（接入真实 API 后删除这行）
const DEMO_VALID_IDS = new Set(['12345', '67890', '10001', '10002', '10003'])

// ==================== 工具函数 ====================

// 从 commit message 中提取所有 #数字 任务 ID
function extractTaskIds(messages) {
  const ids = new Set()
  for (const msg of messages) {
    const matches = msg.match(/#(\d+)/g)
    if (matches) {
      matches.forEach((m) => ids.add(m.replace('#', '')))
    }
  }
  return [...ids]
}

// ==================== API 调用 ====================

// Demo 版本：本地模拟校验
// 接入真实系统时，把函数体替换为 fetch 调用即可
async function verifyTaskOnline(taskId) {
  // ---- Demo 模拟开始（接入真实 API 后删除下面 4 行）----
  console.log(`  [Demo] 模拟校验任务 #${taskId} ...`)
  await new Promise((resolve) => setTimeout(resolve, 300)) // 模拟网络延迟
  return DEMO_VALID_IDS.has(taskId)
  // ---- Demo 模拟结束 ----
}

// 真实 API 版本（需要时取消注释）：
// async function verifyTaskOnline(taskId) {
//   try {
//     const res = await fetch(`${TASK_API_URL}?id=${taskId}`, {
//       headers: { Authorization: `Bearer ${process.env.TASK_API_TOKEN}` },
//     })
//     if (!res.ok) return false
//     const data = await res.json()
//     return data.status === 'open' // 根据实际 API 返回结构调整
//   } catch (e) {
//     console.error(`  [警告] 无法连接任务系统: ${e.message}`)
//     return null // 网络错误不阻塞 push
//   }
// }

// ==================== 主流程 ====================

async function main() {
  console.log('\n📋 校验本次推送的 commit 任务 ID...\n')

  // 1. 获取本次 push 要推送的 commit 列表
  let commits
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()

    // 获取远程分支的最新 commit（如果远程分支不存在说明是首次推送）
    let remoteHead = ''
    try {
      remoteHead = execSync(`git rev-parse origin/${branch}`, { encoding: 'utf8' }).trim()
    } catch {
      console.log('  远程分支不存在，将校验所有本地 commit\n')
    }

    const range = remoteHead ? `${remoteHead}..HEAD` : 'HEAD'
    const log = execSync(`git log ${range} --format="%s"`, { encoding: 'utf8' })
    commits = log.trim().split('\n').filter(Boolean)

    if (commits.length === 0) {
      console.log('  没有新的 commit 需要校验\n')
      process.exit(0)
    }

    console.log(`  发现 ${commits.length} 个新 commit:\n`)
    commits.forEach((c) => console.log(`    ▶ ${c}`))
    console.log('')
  } catch (e) {
    console.error(`  获取 commit 失败: ${e.message}`)
    process.exit(1)
  }

  // 2. 提取任务 ID
  const taskIds = extractTaskIds(commits)

  if (taskIds.length === 0) {
    console.log('  ❌ 未在 commit 中找到任务 ID（格式：#数字）')
    console.log('  请在 commit message 中添加任务 ID，例如：')
    console.log('    git commit -m "[前端] #12345 修复首页样式"\n')
    console.log(
      '  Demo 模式下有效的任务 ID：' + [...DEMO_VALID_IDS].map((id) => `#${id}`).join(', '),
    )
    console.log('')
    process.exit(1)
  }

  console.log(`  提取到 ${taskIds.length} 个任务 ID: ${taskIds.map((id) => `#${id}`).join(', ')}\n`)

  // 3. 逐个校验
  let hasError = false
  for (const taskId of taskIds) {
    const valid = await verifyTaskOnline(taskId)

    if (valid === true) {
      console.log(`  ✅ 任务 #${taskId} — 校验通过`)
    } else if (valid === false) {
      console.log(`  ❌ 任务 #${taskId} — 不存在或已关闭`)
      hasError = true
    } else {
      console.log(`  ⚠️  任务 #${taskId} — 网络超时，跳过校验`)
    }
  }

  console.log('')

  if (hasError) {
    console.log('❌ Push 被拒绝：存在无效的任务 ID，请修正后重试。\n')
    console.log(
      '  Demo 模式下有效的任务 ID：' + [...DEMO_VALID_IDS].map((id) => `#${id}`).join(', '),
    )
    console.log('')
    process.exit(1)
  }

  console.log('✅ 任务 ID 校验全部通过\n')
}

main()
