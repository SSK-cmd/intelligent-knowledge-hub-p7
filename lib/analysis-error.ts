type ErrorDetails = {
  name?: string
  message?: string
  statusCode?: number
  cause?: unknown
  lastError?: unknown
  errors?: unknown[]
}

// Retry errors can hide the actionable Gateway error several levels down.
export function analysisError(error: unknown) {
  const pending: unknown[] = [error]
  const seen = new Set<unknown>()
  const details: ErrorDetails[] = []
  while (pending.length && seen.size < 32) {
    const current = pending.shift()
    if (!current || seen.has(current)) continue
    seen.add(current)
    if (typeof current === 'string') {
      details.push({ message: current })
    } else if (typeof current === 'object') {
      const item = current as ErrorDetails
      details.push(item)
      pending.push(item.lastError, item.cause)
      if (Array.isArray(item.errors)) pending.push(...item.errors.slice(0, 32))
    }
  }

  const hasStatus = (...statuses: number[]) => details.some((e) => statuses.includes(e.statusCode ?? 0))
  const hasName = (...names: string[]) => details.some((e) => names.includes(e.name ?? ''))
  const hasMessage = (pattern: RegExp) => details.some((e) => typeof e.message === 'string' && pattern.test(e.message))

  // Gateway currently wraps this billing restriction as a 403 internal-server error.
  if (hasName('RestrictedModelsError') || hasMessage(/free tier users do not have access to this model/i)) {
    return {
      status: 503,
      code: 'AI_MODEL_RESTRICTED',
      error: 'Analysis is unavailable because the selected AI model requires paid AI credits. Please contact the site owner.',
    }
  }
  if (hasStatus(402) || hasMessage(/credit card|insufficient (?:credits|funds)|payment required/i)) {
    return {
      status: 503,
      code: 'AI_BILLING_REQUIRED',
      error: 'Analysis is unavailable because the AI service needs billing attention. Please contact the site owner.',
    }
  }
  if (
    hasStatus(401) ||
    hasName('GatewayAuthenticationError', 'AI_LoadAPIKeyError') ||
    hasMessage(/unauthenticated|AI Gateway authentication failed|no authentication provided/i)
  ) {
    return {
      status: 503,
      code: 'AI_AUTHENTICATION_FAILED',
      error: 'Analysis is unavailable because the AI service is not authenticated. Please contact the site owner.',
    }
  }
  if (hasStatus(403)) {
    return { status: 503, code: 'AI_ACCESS_DENIED', error: 'The AI service denied access. Please contact the site owner.' }
  }
  if (hasStatus(404) || hasName('GatewayModelNotFoundError')) {
    return { status: 503, code: 'AI_MODEL_UNAVAILABLE', error: 'The configured AI model is unavailable. Please contact the site owner.' }
  }
  if (hasStatus(429)) {
    return { status: 429, code: 'AI_RATE_LIMITED', error: 'The AI service is busy. Please wait a moment and try again.' }
  }
  if (hasStatus(408, 504) || hasName('TimeoutError', 'AbortError', 'GatewayTimeoutError')) {
    return { status: 504, code: 'AI_TIMEOUT', error: 'Analysis took too long. Please try again with less material.' }
  }
  if (hasName('AI_NoObjectGeneratedError', 'AI_NoOutputGeneratedError')) {
    return { status: 502, code: 'AI_INVALID_OUTPUT', error: 'The AI service could not complete the study pack. Please try again.' }
  }
  return { status: 502, code: 'AI_REQUEST_FAILED', error: 'The AI service could not complete the analysis. Please try again later.' }
}
