// ============================================================
// ESLint 配置文件（Flat Config 格式，ESLint v10+ 推荐写法）
// ============================================================
//
// 文件命名：eslint.config.mjs（.mjs = ES Module 模式）
// 旧版 .eslintrc.js 已被 Flat Config 取代
//
// 配置结构：导出一个数组，每个元素是一条规则配置
// ESLint 按数组顺序依次应用，后面的配置可以覆盖前面的
//
// 核心概念：
//   files       - 规则应用于哪些文件（glob 模式）
//   ignores     - 全局忽略哪些文件
//   plugins     - 加载的插件（提供自定义规则）
//   rules       - 具体规则开关和级别（"off"/"warn"/"error"）
//   languageOptions.parser - 用什么解析器理解代码语法
// ============================================================

import tseslint from 'typescript-eslint'     // TypeScript 规则集 + 解析器
import vuePlugin from 'eslint-plugin-vue'     // Vue 模板语法规则
import vueParser from 'vue-eslint-parser'     // 解析 .vue 单文件组件
import prettier from 'eslint-config-prettier' // 关闭和 Prettier 冲突的规则

export default [
  // ==================== 全局忽略 ====================
  {
    ignores: ['node_modules/', 'dist/', '*.config.*'],
  },

  // ==================== TypeScript 文件 ====================
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser, // 用 TypeScript ESLint 解析器代替默认解析器
      parserOptions: {
        ecmaVersion: 'latest', // 使用最新 ES 语法
        sourceType: 'module',  // 以 ES Module 方式解析（支持 import/export）
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin, // 加载 TS 专属规则
    },
    rules: {
      ...tseslint.configs.recommended.rules, // 继承官方推荐的 TS 规则

      // ==================== ES6+ 语法规范 ====================
      // 基本原则：能用新语法就不要用旧语法

      // 变量声明
      'no-var': 'error',              // 禁止 var，用 const/let
      'prefer-const': 'error',        // 能不变的变量用 const，不要用 let
      'no-unused-vars': 'off',        // 关闭原生规则（交给下面的 TS 版本）
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',

      // 箭头函数
      'prefer-arrow-callback': 'error', // 回调函数尽可能用箭头函数 () => {}
      'arrow-body-style': ['error', 'as-needed'], // 箭头函数体能省略 {} 就省略

      // 字符串
      'prefer-template': 'error',      // 用模板字符串 `hello ${name}` 替代 'hello ' + name

      // 解构赋值
      'prefer-destructuring': [        // 优先用解构：const { name } = obj 而非 obj.name
        'error',
        { array: true, object: true },
      ],

      // 展开运算符
      'prefer-spread': 'error',        // 用 ...args 替代 fn.apply(this, args)
      'prefer-rest-params': 'error',   // 用 ...args 替代 arguments 对象
      'prefer-object-spread': 'error', // 用 {...obj} 替代 Object.assign({}, obj)

      // 对象简写
      'object-shorthand': 'error',     // { name: name } → { name }

      // 类
      'no-useless-constructor': 'error', // 禁止只写 super() 的无意义 constructor

      // TypeScript 独有（不需要类型信息的规则）
      '@typescript-eslint/no-array-constructor': 'error', // 用 [] 替代 new Array()

      // 以下 TS 规则需要 parserOptions.project，暂不启用：
      // prefer-optional-chain（?.）、prefer-nullish-coalescing（??）、
      // prefer-as-const、consistent-type-assertions
    },
  },

  // ==================== 后端 NestJS 特殊规则 ====================
  // 后端经常用 console.log 调试，所以单独放开
  {
    files: ['backed/**/*.ts'],
    rules: {
      'no-console': 'off', // 允许后端使用 console.log
    },
  },

  // ==================== Vue 单文件组件 ====================
  // vuePlugin.configs['flat/recommended'] 是 Vue 官方推荐规则集
  // 用 ... 展开是因为它返回一个数组（包含多个配置对象）
  ...vuePlugin.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser, // 解析 .vue 的 <template> + <script> + <style>
      parserOptions: {
        parser: tseslint.parser, // <script> 部分用 TS 解析器
        sourceType: 'module',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off', // 允许单单词组件名（如 Home.vue）
    },
  },

  // ==================== Prettier 兼容 ====================
  // 必须放在最后！关闭所有和 Prettier 冲突的 ESLint 规则
  // 格式化交给 Prettier，代码质量交给 ESLint
  prettier,
]
