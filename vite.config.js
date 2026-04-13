import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function parseBody(req) {
  return new Promise((resolve) => {
    let buf = ''
    req.on('data', (chunk) => { buf += chunk })
    req.on('end', () => {
      const raw = String(buf || '').trim()
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
  })
}

function vercelRes(res) {
  res.status = (code) => {
    res.statusCode = code
    return res
  }
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(data))
  }
  res.send = (data) => {
    const s = typeof data === 'string' ? data : JSON.stringify(data)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(s)
  }
  return res
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const DEFAULT_CONTRACT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwbOz62rPEq-o2NLGkLArF1z5JsZ2H54YU7vqe3fll-eIy3llxaVe-IR-y8AvWvrnpYzw/exec';
  if (!process.env.APP_ACCOUNTS_JSON && env.APP_ACCOUNTS_JSON) {
    process.env.APP_ACCOUNTS_JSON = env.APP_ACCOUNTS_JSON
  }
  if (!process.env.SUPABASE_URL && env.SUPABASE_URL) process.env.SUPABASE_URL = env.SUPABASE_URL
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY) process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
  const syncTarget = String(env.VITE_SCRIPT_URL || '').trim()
  const contractTarget = String(env.VITE_CONTRACT_SCRIPT_URL || env.VITE_SCRIPT_URL || DEFAULT_CONTRACT_SCRIPT_URL).trim()
  const proxy = {}
  if (syncTarget) {
    proxy['/api/sync'] = {
      target: syncTarget,
      changeOrigin: true,
      rewrite: (_path) => {
        const separator = syncTarget.includes('?') ? '&' : '?'
        const secret = encodeURIComponent(env.VITE_SYNC_SECRET || 'moon_map_2026')
        return '' + separator + 'secret=' + secret
      },
      followRedirects: true,
    }
  }
  proxy['/api/contract'] = {
    target: contractTarget,
    changeOrigin: true,
    rewrite: (_path) => {
      const separator = contractTarget.includes('?') ? '&' : '?'
      const secret = encodeURIComponent(env.VITE_CONTRACT_SECRET || env.VITE_SYNC_SECRET || 'moon_map_2026')
      return '' + separator + 'secret=' + secret
    },
    followRedirects: true,
  }
  return {
    plugins: [
      react(),
      {
        name: 'local-login-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url || !req.url.startsWith('/api/login')) return next()
            try {
              const { default: handler } = await import('./api/login.js')
              req.body = await parseBody(req)
              vercelRes(res)
              await handler(req, res)
            } catch {
              vercelRes(res).status(500).json({ success: false, message: 'Local login API error' })
            }
          })
        },
      },
    ],
    server: {
      proxy
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      globals: true,
    },
  }
})
