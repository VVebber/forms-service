import { createServer } from 'node:http'
import { mkdir, readFile, rename, writeFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))
const dataDirectory = join(root, 'data')
const dataFile = join(dataDirectory, 'forms.json')
const distDirectory = join(root, 'dist')

await mkdir(dataDirectory, { recursive: true })

async function readStore() {
  try {
    return JSON.parse(await readFile(dataFile, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return { forms: [], submissions: {} }
  }
}

async function saveStore(store) {
  const temporaryFile = `${dataFile}.tmp`
  await writeFile(temporaryFile, JSON.stringify(store, null, 2))
  await rename(temporaryFile, dataFile)
}

async function readBody(request) {
  let body = ''
  for await (const chunk of request) body += chunk
  return body ? JSON.parse(body) : {}
}

function respond(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(payload))
}

function isValidAnswer(field, value) {
  if (field.type === 'checkbox') return field.required ? value === true : value === true || value === false || value === undefined
  if (value === undefined || value === null) return !field.required
  if (typeof value !== 'string') return false
  if (!value.trim()) return !field.required
  if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false
  if (field.type === 'select' && value && !field.options.includes(value)) return false
  return true
}

async function handleApi(request, response, url) {
  try {
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const store = await readStore()

    if (parts.length === 2 && parts[1] === 'forms' && request.method === 'GET') {
      return respond(response, 200, store.forms)
    }
    if (parts.length === 2 && parts[1] === 'forms' && request.method === 'POST') {
      const now = new Date().toISOString()
      const form = {
        id: crypto.randomUUID(), title: 'Новая форма', description: '', status: 'draft',
        fields: [], createdAt: now, updatedAt: now,
      }
      store.forms.unshift(form)
      store.submissions[form.id] = []
      await saveStore(store)
      return respond(response, 201, form)
    }

    if (parts.length < 3 || parts[1] !== 'forms') return respond(response, 404, { error: 'Страница не найдена' })
    const form = store.forms.find((item) => item.id === parts[2])
    if (!form) return respond(response, 404, { error: 'Форма не найдена' })

    if (parts.length === 3 && request.method === 'GET') return respond(response, 200, form)
    if (parts.length === 3 && request.method === 'PATCH') {
      const changes = await readBody(request)
      if (typeof changes.title === 'string') form.title = changes.title.slice(0, 120)
      if (typeof changes.description === 'string') form.description = changes.description.slice(0, 1000)
      if (Array.isArray(changes.fields)) {
        form.fields = changes.fields.slice(0, 30).map((field) => ({
          id: String(field.id || crypto.randomUUID()),
          label: String(field.label || '').slice(0, 160),
          type: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox'].includes(field.type) ? field.type : 'text',
          required: Boolean(field.required),
          options: Array.isArray(field.options) ? field.options.map(String).slice(0, 20) : [],
        }))
      }
      form.updatedAt = new Date().toISOString()
      await saveStore(store)
      return respond(response, 200, form)
    }
    if (parts.length === 3 && request.method === 'DELETE') {
      store.forms = store.forms.filter((item) => item.id !== form.id)
      delete store.submissions[form.id]
      await saveStore(store)
      return respond(response, 200, { ok: true })
    }
    if (parts.length === 4 && parts[3] === 'publish' && request.method === 'POST') {
      if (form.status === 'draft' && form.fields.length === 0) {
        return respond(response, 400, { error: 'Добавьте хотя бы один вопрос перед публикацией' })
      }
      form.status = form.status === 'published' ? 'draft' : 'published'
      form.updatedAt = new Date().toISOString()
      await saveStore(store)
      return respond(response, 200, form)
    }
    if (parts.length === 4 && parts[3] === 'submissions' && request.method === 'GET') {
      return respond(response, 200, store.submissions[form.id] || [])
    }
    if (parts.length === 4 && parts[3] === 'submissions' && request.method === 'POST') {
      if (form.status !== 'published') return respond(response, 403, { error: 'Форма пока не опубликована' })
      const { answers = {} } = await readBody(request)
      const invalidField = form.fields.find((field) => !isValidAnswer(field, answers[field.id]))
      if (invalidField) return respond(response, 400, { error: `Проверьте поле «${invalidField.label}»` })
      const submission = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), answers }
      store.submissions[form.id] = store.submissions[form.id] || []
      store.submissions[form.id].unshift(submission)
      await saveStore(store)
      return respond(response, 201, { ok: true })
    }
    return respond(response, 404, { error: 'Страница не найдена' })
  } catch (error) {
    const isBadRequest = error instanceof SyntaxError
    return respond(response, isBadRequest ? 400 : 500, {
      error: isBadRequest ? 'Некорректные данные запроса' : 'Не удалось сохранить данные',
    })
  }
}

const port = Number(process.env.PORT || 3000)
let vite
let production = false
try {
  await stat(join(distDirectory, 'index.html'))
  production = process.env.NODE_ENV === 'production'
} catch {
  production = false
}
if (!production) vite = await createViteServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' })

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (url.pathname.startsWith('/api/')) return handleApi(request, response, url)

  if (production) {
    const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\]|\.\.(?:[/\\]|$))+/, '')
    let file = join(distDirectory, safePath || 'index.html')
    try {
      const info = await stat(file)
      if (info.isDirectory()) file = join(file, 'index.html')
    } catch {
      file = join(distDirectory, 'index.html')
    }
    try {
      const content = await readFile(file)
      response.writeHead(200, { 'Content-Type': ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream' })
      return response.end(content)
    } catch {
      response.writeHead(404)
      return response.end('Not found')
    }
  }
  vite.middlewares(request, response, () => {
    response.writeHead(404)
    response.end('Not found')
  })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`Форма доступна: http://localhost:${port}/admin`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    server.close()
    await vite?.close()
    process.exit(0)
  })
}
