// server/vite.ts

import express from 'express'
import fs from 'fs'
import path from 'path'
import { createServer as createViteServer, createLogger } from 'vite'
import { nanoid } from 'nanoid'
import viteConfig from '../vite.config'  // vite.config.ts のデフォルトエクスポート

// Vite 用のロガー
const viteLogger = createLogger()

// サーバーログ用ユーティリティ
function log(message: string, source = 'express'): void {
  const formattedTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
  console.log(`${formattedTime} [${source}] ${message}`)
}

/**
 * 開発モード時に Vite ミドルウェアをセットアップ
 */
export async function setupVite(app: express.Express, server: any): Promise<void> {
  const serverOptions = {
    middlewareMode: true as const,
    hmr: { server },
    allowedHosts: true as const,
  }

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,        // 外部 vite.config.ts を既に取り込んでいるため無効化
    customLogger: {
      ...viteLogger,
      error: (msg, opts) => {
        viteLogger.error(msg, opts)
        process.exit(1)
      },
    },
    server: serverOptions,
    appType: 'custom' as const,
  })

  // Vite の開発サーバーをミドルウェアとしてマウント
  app.use(vite.middlewares)

  // 全ルートで index.html を Vite による変換付きで返す
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl
    try {
      const templatePath = path.resolve(import.meta.dirname, '..', 'client', 'index.html')
      let template = await fs.promises.readFile(templatePath, 'utf-8')

      // キャッシュバスターとしてクエリに nanoid を付与
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      )

      const html = await vite.transformIndexHtml(url, template)
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e: any) {
      vite.ssrFixStacktrace(e)
      next(e)
    }
  })
}

/**
 * 本番モード時にビルド済みの静的ファイルを配信
 */
export function serveStatic(app: express.Express): void {
  const distPath = path.resolve(import.meta.dirname, '..', 'dist', 'public')
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Did you run "vite build"?`
    )
  }

  // 静的ファイル (CSS/JS/アセット) を配信
  app.use(express.static(distPath))

  // SPA のフォールバックとして常に index.html
  app.use('*', (_req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'))
  })
}

export { viteLogger, log }