// ============================================================
// Commitlint 自定义配置 — Commit Message 格式校验
// ============================================================
//
// 格式要求：[模块] #任务ID 中文描述
// 示例：  [前端] #12345 修复首页样式问题
//         [后端] #67890 添加用户登录接口
//
// 允许的模块前缀：前端、后端、全栈、配置、文档、依赖、测试、重构
// 任务ID 格式：纯数字，如 #12345
// ============================================================

export default {
  rules: {
    'custom-format': [2, 'always'], // 2 = error，必须匹配
  },
  plugins: [
    {
      rules: {
        'custom-format': ({ header }) => {
          const modules = ['前端', '后端', '全栈', '配置', '文档', '依赖', '测试', '重构']

          // [模块] #数字ID 描述
          const pattern = new RegExp(
            `^\\[(${modules.join('|')})\\]\\s+#\\d+\\s+[\\u4e00-\\u9fa5\\w].+`
          )

          if (!pattern.test(header)) {
            return [
              false,
              `Commit 格式错误！请使用：\n` +
                `  [模块] #任务ID 描述\n\n` +
                `可用的模块前缀：${modules.join(' / ')}\n` +
                `示例：git commit -m "[前端] #12345 修复首页样式问题"`,
            ]
          }

          if (header.length > 120) {
            return [false, `Commit 描述不能超过 120 个字符，当前 ${header.length} 个字符`]
          }

          if (header.length < 10) {
            return [false, 'Commit 描述太短，请至少写 10 个字符']
          }

          return [true, '']
        },
      },
    },
  ],
}
