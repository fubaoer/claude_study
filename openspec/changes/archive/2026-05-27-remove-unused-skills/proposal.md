## Why

项目中存在 4 个已废弃的 `openspec-*` skill（与 `opsx:*` command 完全重复）以及 1 个与项目无关的图片分析 skill (`sn-da-image-caption`)，造成技能列表冗余，影响开发效率。

## What Changes

- 删除 `.claude/skills/openspec-propose/`（已被 `.claude/commands/opsx/propose.md` 替代）
- 删除 `.claude/skills/openspec-apply-change/`（已被 `.claude/commands/opsx/apply.md` 替代）
- 删除 `.claude/skills/openspec-explore/`（已被 `.claude/commands/opsx/explore.md` 替代）
- 删除 `.claude/skills/openspec-archive-change/`（已被 `.claude/commands/opsx/archive.md` 替代）
- 删除 `.claude/skills/sn-da-image-caption/`（包含 scripts/caption.py，项目中未使用）

## Capabilities

### New Capabilities
- `skill-cleanup`: 清理项目 skills 配置，移除冗余和未使用的 skill 定义

### Modified Capabilities
<!-- 无现有 capability 需要修改 -->

## Impact

- 影响文件：`.claude/skills/` 目录下的 5 个子目录及其文件
- 不影响现有 `opsx:*` command 功能（它们位于 `.claude/commands/` 下）
- 不影响项目业务代码（`fronted/`, `backed/`）
