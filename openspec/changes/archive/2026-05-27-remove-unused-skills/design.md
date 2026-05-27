## Context

项目 `.claude/skills/` 目录下有 5 个 skill，其中 4 个 `openspec-*` 与 `.claude/commands/opsx/` 下的 4 个 command 功能完全相同（后者为更新版本），另有 `sn-da-image-caption` 为图片分析 skill，在项目中无使用场景。Claude Code 会同时加载 skill 和 command，导致系统提示词中出现重复条目。

## Goals / Non-Goals

**Goals:**
- 删除 4 个已被 `opsx:*` command 取代的 `openspec-*` skill
- 删除 1 个项目中未使用的 `sn-da-image-caption` skill
- 确保删除后 `opsx:*` 命令功能不受影响

**Non-Goals:**
- 不修改 `.claude/commands/` 下的任何文件
- 不修改项目业务代码
- 不添加新的 skill 或 command

## Decisions

1. **删除整个 skill 目录而非单独文件**：每个 skill 是自包含的目录（SKILL.md + 可能的脚本），整体删除确保无残留。

2. **保留 `.claude/commands/opsx/` 不变**：commands 是当前正在使用的版本，且功能完整。

3. **不创建迁移或兼容层**：用户当前未在任何活跃变更中使用这些 skill，可直接删除。

## Risks / Trade-offs

- **有人依赖 `/openspec-propose` 等旧命令名**：旧命令名在系统提示词中已不存在（被 opsx:* 替代），无风险。
- **sn-da-image-caption 可能未来需要**：如需要可随时重新安装，移除不影响其他功能。
