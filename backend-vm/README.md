# Sightline Backend - Hermes Worker

A lightweight worker agent that handles background tasks for Sightline. Runs one container per company on a VM.

## Features

- **Job Queue**: Polls Firestore for tasks (audits, fixes — tracking and content generation are ⚠️ Not yet implemented, see "Firestore Job Types" below)
- **GitHub Integration**: Opens PRs, manages changes via GitHub App
- **LLM Tracking**: ⚠️ Not yet implemented — `track_prompts.py` / `verify_merge.py` are stubs returning hardcoded values, no LLM call yet
- **SEO/AEO Audits**: Integrates with GEO Optimizer for site scoring
- **Monitoring**: Telegram alerts for failures and cost tracking
- **Async Processing**: Handles concurrent operations efficiently

## Quick Start

```bash
# 1. Clone and setup
cd backend-vm
cp .env.example .env

# 2. Edit .env with your credentials
# - Firebase Admin SDK key
# - GitHub App credentials
# - LLM API keys
# - Telegram bot token (optional)

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the worker
python main.py
```

## Environment Variables

```
# Firebase (required)
FIREBASE_CREDENTIALS_JSON={"type":"service_account",...}
ORG_ID=company-123

# GitHub App (required)
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...
GITHUB_APP_ID=12345

# Dashboard-to-VM webhook shared secret (required).
# IMPORTANT: this MUST hold the SAME value as the Vercel server-side
# WEBHOOK_SECRET — the dashboard signs each job payload with it and the VM
# verifies the signature, so a mismatch fails EVERY job with 401.
WEBHOOK_SECRET=your-random-secret-string

# LLM APIs (required)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
PERPLEXITY_API_KEY=pplx-...
ANTHROPIC_API_KEY=sk-ant-...

# Monitoring (optional)
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=987654321

# Configuration
VM_POLLING_INTERVAL_SECONDS=60
MAX_RETRIES=3
LOG_LEVEL=INFO
```

## Firestore Job Types

1. **audit** - Run SEO/AEO audit via GEO Optimizer ✅ implemented (`src/skills/audit.py`)
2. **fix** - Generate and PR fixes (sitemap, robots.txt, schema, etc) ✅ implemented (`src/skills/fix_pr.py`)
3. **track_prompts** - ⚠️ Not yet implemented (stub in `src/skills/track_prompts.py` returns hardcoded values, no LLM call)
4. **verify_merge** - ⚠️ Not yet implemented (stub in `src/skills/verify_merge.py` returns hardcoded values)
5. **generate_content** - ⚠️ Not yet implemented (no content-generation job type in the worker)
6. **sync_search_console** - ⚠️ Not yet implemented (no Search Console / `gscMetrics` integration; the dashboard Overview shows these as unavailable)

> Collections `posts`, `experiments`, `baselines`, `evidence` from the plan are also not implemented.

## Architecture

```
┌─ Hermes Worker ─┐
│                 │
├─ Job Processor  │  Polls Firestore → processes jobs
├─ Skills         │  Modular task handlers
├─ Firebase       │  Data + job state
├─ GitHub         │  PR creation/merge
└─ LLM Clients    │  API calls to models
```

## Docker Deployment

```bash
docker build -t sightline-hermes .
docker run \
  -e FIREBASE_CREDENTIALS_JSON='...' \
  -e ORG_ID=company-123 \
  -e GITHUB_PRIVATE_KEY='...' \
  ... (other env vars)
  sightline-hermes
```

## Monitoring

- **Logs**: Streamed to stdout, captured by Docker/systemd
- **Errors**: Telegram alerts with stack trace
- **Costs**: Logged to Firestore per API call
- **Health**: Heartbeat pulse in Firestore every 30s

## Development

```bash
# Run tests
pytest tests/

# Run with hot-reload
python -m pytest --watch main.py

# View logs
tail -f logs/hermes.log
```

## Future Enhancements

- [ ] Implement skill learning loop (auto-improve based on results)
- [ ] Add subagent delegation for complex tasks
- [ ] Cost optimization with cheaper model fallbacks
- [ ] Distributed worker pool (multiple VMs)
