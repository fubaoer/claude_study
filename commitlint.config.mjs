// ============================================================
// Commitlint 自定义配置 — Commit Message 格式校验
// ============================================================
//
// 格式要求：[模块] 中文描述
// 示例：  [前端] 修复首页样式问题
//         [后端] 添加用户登录接口
//         [配置] 更新 ESLint 规则
//         [文档] 补充 README 说明
//         [全栈] 完成用户认证流程
//
// 允许的模块前缀（可自行增删）：
//   前端、后端、全栈、配置、文档、依赖、测试、重构
// ============================================================

export default {
  rules: {
    // 自定义规则：匹配 [模块] 描述 格式
    'custom-format': [2, 'always'], // 2 = error 级别，必须匹配
  },
  plugins: [
    {
      rules: {
        'custom-format': ({ header }) => {
          // 允许的模块名
          const modules = ['前端', '后端', '全栈', '配置', '文档', '依赖', '测试', '重构']

          // 校验格式：必须 [模块] 开头，后面跟中文描述
          const pattern = new RegExp(
            `^\\[(${modules.join('|')})\\]\\s+[\\u4e00-\\u9fa5\\w].+`
          )

          if (!pattern.test(header)) {
            return [
              false,
              `Commit 格式错误！请使用：\n` +
                `  [模块] 描述\n\n` +
                `可用的模块前缀：${modules.join(' / ')}\n` +
                `示例：git commit -m "[前端] 修复首页样式问题"`,
            ]
          }

          // 长度限制：模块名 + 描述最少 5 个字符，最多 100 个字符
          if (header.length > 100) {
            return [false, `Commit 描述不能超过 100 个字符，当前 ${header.length} 个字符`]
          }

          if (header.length < 5) {
            return [false, 'Commit 描述太短，请至少写 5 个字符']
          }

          return [true, '']
        },
      },
    },
  ],
}
