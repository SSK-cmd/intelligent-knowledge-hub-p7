import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import ts from 'typescript'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { analysisError } from '../lib/analysis-error.ts'
import { analysisSchema } from '../lib/analysis-schema.ts'
import * as models from '../lib/analysis-model.ts'

const require = createRequire(import.meta.url)
function compile(relativePath, mocks = {}) {
  const filename = new URL(relativePath, import.meta.url)
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    fileName: filename.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', source)(
    (name) => name in mocks ? mocks[name] : require(name), module, module.exports,
  )
  return module.exports
}

function route(generateText) {
  return compile('../app/api/analyze/route.ts', {
    ai: { generateText, Output: { object: (value) => value } },
    '@/lib/analysis-schema': { analysisSchema },
    '@/lib/analysis-error': { analysisError },
    '@/lib/analysis-model': models,
    '@/lib/fetch-url': { fetchUrl: async () => { throw new Error('Test URL unavailable') } },
  })
}

function request({ text = 'Knowledge hubs organize documents.', pdf = false, url = false } = {}) {
  const body = new FormData()
  body.set('text', text)
  if (pdf) body.append('files', new File(['%PDF-1.4 test'], 'test.pdf', { type: 'application/pdf' }))
  if (url) body.append('urls', 'https://example.com')
  return new Request('http://localhost/api/analyze', { method: 'POST', body })
}

const output = analysisSchema.parse({
  title: 'Knowledge hubs', summary: 'Organize documents for retrieval.',
  insights: [], knowledge: [], keywords: [], acronyms: [], flow: { nodes: [], edges: [] },
  watchwords: [], statistics: [], quiz: [],
})

test('generates with the free-credit model and labels the uncalled paid model in results', async () => {
  const calls = []
  const { POST } = route(async (args) => { calls.push(args); return { output } })
  const previous = process.env.AI_MODEL
  process.env.AI_MODEL = 'google/gemini-3.8-flash'
  try {
    const response = await POST(request({ pdf: true, url: true }))
    const result = await response.json()
    assert.equal(response.status, 200)
    assert.equal(calls.length, 1)
    assert.equal(calls[0].model, 'google/gemini-2.5-flash')
    assert.ok(calls[0].messages[0].content.some((part) => part.mediaType === 'application/pdf'))
    assert.equal(result.title, output.title)
    assert.deepEqual(result.model, models.ANALYSIS_MODEL)
    assert.equal(result.paymentRequiredModel.access, 'payment-required')
    assert.deepEqual(result.warnings, ['Test URL unavailable'])
  } finally {
    if (previous === undefined) delete process.env.AI_MODEL
    else process.env.AI_MODEL = previous
  }
})

test('credit exhaustion or model restriction never triggers a paid-model fallback', async () => {
  for (const failure of [
    { statusCode: 402, message: 'Insufficient credits' },
    { statusCode: 403, message: 'Free tier users do not have access to this model.' },
  ]) {
    const calls = []
    const { POST } = route(async (args) => { calls.push(args.model); throw failure })
    const response = await POST(request())
    assert.equal(response.status, 503)
    assert.deepEqual(calls, ['google/gemini-2.5-flash'])
    assert.ok((await response.json()).requestId)
  }
})

test('empty input does not consume credits', async () => {
  let called = false
  const { POST } = route(async () => { called = true; return { output } })
  assert.equal((await POST(request({ text: '' }))).status, 400)
  assert.equal(called, false)
})

test('model status renders free-credit usage and the payment-required label', () => {
  const { ModelStatus } = compile('../components/distill/model-status.tsx')
  const html = renderToStaticMarkup(createElement(ModelStatus, {
    model: models.ANALYSIS_MODEL, paymentRequiredModel: models.PAYMENT_REQUIRED_MODEL,
  }))
  assert.match(html, /Gemini 2.5 Flash/)
  assert.match(html, /Free-credit analysis/)
  assert.match(html, /Gemini 3.8 Flash/)
  assert.match(html, /Payment required/)
  assert.match(html, /not run/)
})
