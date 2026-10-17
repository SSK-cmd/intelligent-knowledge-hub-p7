import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analysisError } from '../lib/analysis-error.ts'

test('identifies authentication errors inside SDK retry wrappers', () => {
  const auth = Object.assign(new Error('Invalid API key'), { statusCode: 401 })
  const retry = Object.assign(new Error('Failed after retries'), { lastError: auth, errors: [auth] })
  assert.equal(analysisError(retry).code, 'AI_AUTHENTICATION_FAILED')
  assert.equal(analysisError(retry).status, 503)
})

test('handles missing credentials and nested plain-object errors', () => {
  assert.equal(analysisError({ name: 'GatewayAuthenticationError' }).code, 'AI_AUTHENTICATION_FAILED')
  const missingKey = new Error('Unauthenticated. Configure AI_GATEWAY_API_KEY or use a provider module.')
  missingKey.name = 'GatewayError'
  assert.equal(analysisError(missingKey).code, 'AI_AUTHENTICATION_FAILED')
  assert.equal(analysisError({ cause: { errors: [{ statusCode: 402 }] } }).code, 'AI_BILLING_REQUIRED')
  assert.equal(analysisError(new Error('A credit card is required')).code, 'AI_BILLING_REQUIRED')
})

test('keeps access, model, rate limit, and timeout failures distinct', () => {
  for (const [statusCode, code, status] of [
    [403, 'AI_ACCESS_DENIED', 503],
    [404, 'AI_MODEL_UNAVAILABLE', 503],
    [429, 'AI_RATE_LIMITED', 429],
    [504, 'AI_TIMEOUT', 504],
  ]) {
    const result = analysisError({ cause: { statusCode } })
    assert.equal(result.code, code)
    assert.equal(result.status, status)
  }
  assert.equal(analysisError({ name: 'TimeoutError' }).code, 'AI_TIMEOUT')
  assert.equal(analysisError({ name: 'AI_NoObjectGeneratedError' }).code, 'AI_INVALID_OUTPUT')
})

test('does not send provider details or secrets to the browser', () => {
  const secret = 'private-provider-key-and-document-content'
  for (const statusCode of [400, 401, 402, 403, 404, 429, 500, 504]) {
    assert.ok(!JSON.stringify(analysisError({ message: secret, statusCode })).includes(secret))
  }
})

test('unknown and circular errors produce a safe response', () => {
  const circular = new Error('Unexpected provider failure')
  circular.cause = circular
  for (const error of [undefined, null, 42, 'unexpected', circular]) {
    assert.equal(analysisError(error).code, 'AI_REQUEST_FAILED')
  }
})
