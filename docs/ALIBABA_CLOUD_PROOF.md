# Alibaba Cloud Proof Notes

This document explains how FunnelOps Autopilot demonstrates Alibaba Cloud and Qwen Cloud usage for the hackathon submission.

## Code File for Judges

Primary proof file:

- [`src/lib/qwen.ts`](../src/lib/qwen.ts)

This file contains the Qwen Cloud API client. It calls the Qwen Cloud OpenAI-compatible chat completions endpoint through the backend, using the configured model and server-side API key.

Supporting backend file:

- [`server/index.ts`](../server/index.ts)

This file exposes the backend routes used by the frontend, including:

- `/api/health`
- `/api/agent/run`
- `/api/advisor/run`
- `/api/usage`
- `/api/workflow-runs`

## Required Environment Variables

```bash
QWEN_API_KEY=...
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen3.7-plus
```

Secrets must be configured in the deployed backend environment. They must not be committed to the repository.

## Deployment Proof Recording

The final proof recording should show:

1. The Alibaba Cloud console or deployment surface.
2. The deployed backend service.
3. The backend health endpoint responding.
4. A live FunnelOps workflow calling the deployed backend.
5. Qwen Cloud usage visible in the dashboard usage ledger.

## Health Endpoint

```http
GET /api/health
```

Expected response:

```json
{
  "ok": true,
  "providerReady": true,
  "model": "qwen3.7-plus"
}
```

## Current Status

Local Qwen Cloud calls are verified. Alibaba Cloud deployment is the next submission-critical milestone.

