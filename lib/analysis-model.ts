// Verified against Vercel's model directory on 18 October 2026.
// Keep paid models out of the generation path, including automatic fallbacks.
export const ANALYSIS_MODEL = {
  id: 'google/gemini-2.5-flash',
  name: 'Gemini 2.5 Flash',
  access: 'free-credits',
} as const

export const PAYMENT_REQUIRED_MODEL = {
  id: 'google/gemini-3.8-flash',
  name: 'Gemini 3.8 Flash',
  access: 'payment-required',
} as const

export type AnalysisModelInfo = {
  model: typeof ANALYSIS_MODEL
  paymentRequiredModel: typeof PAYMENT_REQUIRED_MODEL
}
