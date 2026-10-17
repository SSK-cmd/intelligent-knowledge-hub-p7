import { z } from 'zod'

export const analysisSchema = z.object({
  title: z.string().describe('A concise title describing the material'),
  summary: z
    .string()
    .describe('A clear 2-4 paragraph summary of the material. Separate paragraphs with \\n\\n.'),
  insights: z
    .array(z.object({ headline: z.string(), detail: z.string() }))
    .describe('4-6 non-obvious insights or takeaways drawn from the material'),
  knowledge: z
    .array(z.object({ concept: z.string(), explanation: z.string() }))
    .describe('5-8 key knowledge points / core concepts a learner should retain'),
  keywords: z
    .array(z.object({ term: z.string(), importance: z.number().int().min(1).max(10) }))
    .describe('12-20 important keywords with importance 1-10'),
  acronyms: z
    .array(z.object({ acronym: z.string(), expansion: z.string(), meaning: z.string() }))
    .describe(
      'Acronyms found in the material. If none exist, create 2-4 helpful mnemonic acronyms that help remember key ideas and say so in meaning.',
    ),
  flow: z
    .object({
      nodes: z
        .array(
          z.object({
            id: z.string().describe('short unique slug'),
            label: z.string().describe('1-4 word subject name'),
            level: z
              .number()
              .int()
              .min(0)
              .max(4)
              .describe('0 = central topic, higher = more specific'),
          }),
        )
        .describe('8-14 subjects/concepts'),
      edges: z
        .array(
          z.object({
            source: z.string(),
            target: z.string(),
            relation: z.string().describe('1-3 word verb phrase e.g. "leads to", "part of"'),
          }),
        )
        .describe('How subjects connect in context. Every node must be connected.'),
    })
    .describe('A concept flow chart showing how subjects connect in context'),
  watchwords: z
    .array(
      z.object({
        emoji: z.string().describe('A single fitting emoji'),
        word: z.string().describe('A memorable watchword (1-3 words)'),
        meaning: z.string().describe('One-sentence meaning in context of the material'),
      }),
    )
    .describe('8-12 watchwords paired with emojis'),
  statistics: z
    .array(
      z.object({
        title: z.string(),
        chartType: z.enum(['bar', 'pie', 'line']),
        unit: z.string().describe('Unit of the values, e.g. "%", "people", "USD", or "mentions"'),
        data: z.array(z.object({ label: z.string(), value: z.number() })).min(2).max(10),
      }),
    )
    .describe(
      '1-4 charts. Use real numbers found in the material. If the material has no numbers, chart the relative emphasis (mentions) of key topics instead.',
    ),
  quiz: z
    .array(
      z.object({
        question: z.string(),
        type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
        options: z
          .array(z.string())
          .describe('4 options for multiple_choice, ["True","False"] for true_false, empty for short_answer'),
        answer: z.string().describe('The correct answer. For choices, must exactly match one option.'),
        acceptedAnswers: z
          .array(z.string())
          .describe('For short_answer: 1-4 short accepted variants (lowercase). Empty otherwise.'),
        explanation: z.string().describe('Why this is the answer, referencing the material'),
      }),
    )
    .describe('8 quiz questions mixing types, mostly multiple_choice, 1-2 short_answer'),
})

export type Analysis = z.infer<typeof analysisSchema>
