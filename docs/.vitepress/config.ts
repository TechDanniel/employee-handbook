import { defineConfig } from 'vitepress'
import { resolve } from 'node:path'

const APP_URL = process.env.VITEPRESS_APP_URL || 'http://localhost:5173/'
const DOCS_BASE = process.env.VITEPRESS_BASE || '/docs/'

export default defineConfig({
  lang: 'zh-CN',
  title: '员工手册（演示版）',
  description: '用于演示的员工手册知识库（VitePress）。',

  base: DOCS_BASE,

  cleanUrls: true,
  lastUpdated: true,

  vite: {
    configFile: false,
	envDir: resolve(__dirname, '../..'),
  },

  srcDir: './src',

  themeConfig: {
    nav: [
        { text: '员工手册', link: '/' },
        { text: '应用首页', link: APP_URL }
    ],

    sidebar: [
      { text: '手册首页', link: '/' },
      {
        text: '员工手册',
        items: [
          { text: '01. 总览与入职', link: '/handbook/overview' },
          { text: '02. 行为准则', link: '/handbook/code-of-conduct' },
          { text: '03. 工作方式', link: '/handbook/working' },
          { text: '04. 休假与考勤', link: '/handbook/leave' },
          { text: '05. 信息安全', link: '/handbook/security' },
          { text: '06. 常见问题', link: '/handbook/faq' },
        ],
      },
      {
        text: '站点维护（可选）',
        items: [{ text: 'VitePress 主题配置', link: '/useVitePress/themeConfig' }],
      },
    ],

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
      label: '本页目录',
    },

    lastUpdatedText: '上次更新',
  },
})