#!/usr/bin/env bash
# ============================================================
# Claude Code PostToolUse Hook：代码修改后自动格式化和检查
# ============================================================
#
# 触发时机：Claude Code 每次执行 Edit 或 Write 操作后自动调用
# 配置位置：.claude/settings.json → hooks.PostToolUse
#
# 工作流程：
#   1. 从 stdin 读取 Claude Code 传入的 JSON（包含被修改文件路径）
#   2. 用 Node.js 解析 JSON，提取 file_path 字段
#   3. 根据文件扩展名决定是否处理
#   4. 先运行 Prettier 格式化，再运行 ESLint 修复
#   5. 无论成功与否都返回 0（不阻塞 Claude Code 主流程）
# ============================================================

# Claude Code 通过 stdin 传入 JSON，格式示例：
#   {"tool_input":{"file_path":"backed/src/app.controller.ts"}}
#
# 这里用 node -p 一行搞定 JSON 解析，避免依赖 jq 等额外工具
# require('fs').readFileSync(0, 'utf8') 读取 stdin（fd=0）
# || '' 保证解析失败时返回空字符串，不中断脚本
FILE_PATH=$(node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).tool_input?.file_path || ''" 2>/dev/null)

# 如果没有拿到文件路径（比如非文件操作），直接退出
[ -z "$FILE_PATH" ] && exit 0

# 只处理代码类文件，其他类型（图片、二进制等）跳过
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.vue|*.json|*.css|*.html)
    # npx 会自动使用项目本地安装的 prettier 和 eslint
    # --write / --fix 表示直接修改文件
    # 2>/dev/null 吞掉警告信息  || true 保证即使报错也不影响主流程
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    npx eslint --fix "$FILE_PATH" 2>/dev/null || true
    ;;
esac

exit 0
