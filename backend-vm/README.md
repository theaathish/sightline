# Sightline Backend - Hermes Worker

A lightweight worker agent that handles background tasks for Sightline. Runs one container per company on a VM.

## Features

- **Job Queue**: Polls Firestore for tasks (audits, fixes, tracking, content generation)
- **GitHub Integration**: Opens PRs, manages changes via GitHub App
- **LLM Tracking**: Runs prompts across OpenAI, Gemini, Perplexity, Claude
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

1. **audit** - Run SEO/AEO audit via GEO Optimizer
2. **fix** - Generate and PR fixes (sitemap, robots.txt, schema, etc)
3. **track_prompts** - Run brand prompts across LLMs, store results
4. **verify_after_merge** - Re-run prompts after PR merge to measure impact
5. **generate_content** - Write and PR blog posts
6. **sync_search_console** - Fetch impressions and clicks from Google

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
