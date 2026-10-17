# Distill

Next.js document analysis app, published from v0 to Vercel. Analysis uses the
AI SDK's default Vercel AI Gateway provider and `google/gemini-3.8-flash`.
Set the server-side `AI_MODEL` environment variable to override the model ID.
Any replacement must support structured output, images, and PDF inputs to
preserve the app's upload features. Model access must be tested for the owning team.

## Local checks

Use Node.js 22.6+ (for the built-in TypeScript test runner) and the pnpm version
in `package.json`.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
```

For local analysis, set `AI_GATEWAY_API_KEY` in `.env.local`, then run `pnpm dev`.
Never put this key in a `NEXT_PUBLIC_` variable or commit it.

## Diagnosing published analysis failures

A working v0 preview does not establish that the published Vercel deployment
has working AI Gateway access. Check the runtime logs for `/api/analyze` in the
Vercel project serving the public domain. The response's `requestId` matches
the `Analysis failed` log entry. Raw provider errors stay server-side.

| Response code | Check in Vercel |
| --- | --- |
| `AI_AUTHENTICATION_FAILED` | Confirm valid Gateway credentials for the production deployment. The SDK accepts `AI_GATEWAY_API_KEY` or Vercel OIDC authentication. A stale API key can override OIDC. |
| `AI_BILLING_REQUIRED` | Review AI Gateway billing and available credits in the owning team. |
| `AI_MODEL_RESTRICTED` | The model is blocked on free credits. Purchase AI Gateway credits in the owning team, or configure `AI_MODEL` with a compatible model the team can access and redeploy. |
| `AI_ACCESS_DENIED` | Review team permissions and Gateway routing/access policies. |
| `AI_MODEL_UNAVAILABLE` | Confirm the configured model is available to the project. |
| `AI_RATE_LIMITED` | Wait and retry; review provider/team limits if persistent. |
| `AI_TIMEOUT` | Retry with less material and inspect provider latency. |
| `AI_INVALID_OUTPUT` / `AI_REQUEST_FAILED` | Inspect the matching runtime error before changing the model or schema. |

After changing production environment variables, redeploy through v0/Vercel.
Verify with a short pasted document and confirm a 200 response containing the
complete study pack. Error-handling tests do not verify live AI access.

Authentication reference: https://vercel.com/docs/ai-gateway/authentication-and-byok

## Confirmed production incident (17 October 2026)

Production logs show `google/gemini-3.8-flash` rejected with
`Free tier users do not have access to this model`, wrapped as
`GatewayInternalServerError` with status 403. This happens before any model
provider attempt. Earlier logs show a separate credit-card verification error.
Adding a card alone does not establish access to a model restricted on free credits.

To keep the current model, add paid **AI Gateway credits** to the team that
owns the deployment, then retry the existing site. This account-level change
does not require a code deployment. The error-handling patch alone does not
remove the Gateway restriction. A hosting-plan upgrade is not the remedy named
by this error.
Vercel's pricing documentation states that purchasing credits transitions the
team to the paid tier and ends its monthly free-credit allowance.

Pricing reference: https://vercel.com/docs/ai-gateway/pricing
