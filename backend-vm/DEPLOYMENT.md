# Hermes Backend - Deployment Guide

This guide covers setting up, configuring, and deploying the Hermes worker on a VM.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [VM Setup](#vm-setup)
4. [Docker Deployment](#docker-deployment)
5. [Configuration](#configuration)
6. [Monitoring & Logs](#monitoring--logs)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Python 3.11+ (for local dev)
- Docker & Docker Compose (for production)
- Firebase Admin credentials (JSON key)
- GitHub App credentials (Private key + App ID)
- LLM API keys (OpenAI, Gemini, Anthropic, Perplexity)
- Telegram bot token (optional, for alerts)

## Local Development

### 1. Setup

```bash
cd backend-vm
cp .env.example .env
```

### 2. Configure .env

Edit `.env` with your credentials:

```bash
# Firebase (get from Google Cloud Console)
FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
ORG_ID=dev-company

# GitHub App
GITHUB_PRIVATE_KEY='-----BEGIN RSA PRIVATE KEY-----\n...'
GITHUB_APP_ID=123456
# Dashboard-to-VM webhook shared secret. MUST equal the Vercel WEBHOOK_SECRET.
WEBHOOK_SECRET=your-secret

# LLM APIs
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Telegram (optional)
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=987654321

# Tuning
VM_POLLING_INTERVAL_SECONDS=60
LOG_LEVEL=DEBUG
```

### 3. Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Run Locally

```bash
python main.py
```

You'll see:
```
2024-01-15 10:30:45 [INFO] hermes: Hermes Worker starting for org: dev-company
2024-01-15 10:30:45 [INFO] hermes: Firebase initialized successfully
2024-01-15 10:30:45 [INFO] hermes: Worker initialized successfully
2024-01-15 10:30:45 [INFO] hermes: Webhook server started on port 8000
2024-01-15 10:30:45 [INFO] hermes: Polling Firestore every 60s for jobs
```

**Webhook endpoints:**
- `POST /webhook/job` - Submit a job
- `GET /webhook/health` - Health check
- `GET /webhook/jobs/{org_id}` - Get job status

### 5. Test Webhook

```bash
curl -X POST http://localhost:8000/webhook/job \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $(echo -n '{"org_id":"dev-company","type":"audit","site_id":"site-1","data":{}}' | openssl dgst -sha256 -hmac 'your-secret' -hex | cut -d' ' -f2)" \
  -d '{
    "org_id": "dev-company",
    "type": "audit",
    "site_id": "site-1",
    "data": {
      "site_url": "https://example.com"
    }
  }'
```

## VM Setup

### 1. Prerequisites on VM

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  git \
  python3.11 \
  python3-pip \
  docker.io \
  docker-compose \
  git-lfs

# Add your user to docker group (avoid sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone Repository

```bash
cd /opt
sudo mkdir -p sightline
sudo chown $USER:$USER sightline
cd sightline

git clone https://github.com/theaathish/sightline.git .
cd backend-vm
```

### 3. Create .env on VM

```bash
# Copy the template
cp .env.example .env

# Use a secure editor
nano .env
```

⚠️ **Security:** Store credentials in a secure vault or environment management system (AWS Secrets Manager, HashiCorp Vault, etc.)

### 4. Create systemd Service (Optional)

For persistent container management without docker-compose:

```bash
sudo nano /etc/systemd/system/sightline-hermes.service
```

```ini
[Unit]
Description=Sightline Hermes Worker
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/sightline/backend-vm
EnvironmentFile=/opt/sightline/backend-vm/.env
ExecStart=/usr/bin/docker-compose up
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sightline-hermes
sudo systemctl start sightline-hermes
```

## Docker Deployment

### 1. Build Image

```bash
cd backend-vm
docker build -t sightline-hermes:latest .
```

### 2. Run with docker-compose

```bash
# Create .env file (see above)
cp .env.example .env

# Start
docker-compose up -d

# View logs
docker-compose logs -f hermes
```

### 3. Manual Docker Run

```bash
docker run -d \
  --name sightline-hermes \
  --restart unless-stopped \
  -e FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}' \
  -e ORG_ID=company-123 \
  -e GITHUB_PRIVATE_KEY='-----BEGIN RSA...' \
  -e GITHUB_APP_ID=123456 \
  -e OPENAI_API_KEY=sk-... \
  -e GEMINI_API_KEY=AIza... \
  -e PERPLEXITY_API_KEY=pplx-... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e TELEGRAM_BOT_TOKEN=123456:ABC... \
  -e TELEGRAM_CHAT_ID=987654321 \
  -e VM_POLLING_INTERVAL_SECONDS=60 \
  -e LOG_LEVEL=INFO \
  -p 8000:8000 \
  sightline-hermes:latest
```

### 4. Health Check

```bash
curl http://localhost:8000/webhook/health
# {"status": "healthy"}
```

## Configuration

> **IMPORTANT — shared secret coupling:** the Vercel server-side
> `WEBHOOK_SECRET` and the VM's `WEBHOOK_SECRET` MUST hold the SAME value.
> The dashboard signs each job payload with HMAC-SHA256 under that secret
> and the VM verifies it — if the two values differ, EVERY job submission
> fails with `401 "Invalid webhook signature"`.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIREBASE_CREDENTIALS_JSON` | ✅ | - | Firebase Admin SDK JSON |
| `ORG_ID` | ✅ | - | Organization identifier |
| `GITHUB_PRIVATE_KEY` | ✅ | - | GitHub App private key |
| `GITHUB_APP_ID` | ✅ | - | GitHub App ID |
| `WEBHOOK_SECRET` | ✅ | - | Dashboard-to-VM webhook shared secret — MUST hold the SAME value as the Vercel server-side `WEBHOOK_SECRET` (HMAC verification fails on any mismatch). `GITHUB_WEBHOOK_SECRET` is a deprecated alias for this value, kept for backwards compatibility with already-deployed VMs |
| `OPENAI_API_KEY` | ✅ | - | OpenAI API key |
| `GEMINI_API_KEY` | ❌ | - | Google Gemini API key |
| `PERPLEXITY_API_KEY` | ❌ | - | Perplexity API key |
| `ANTHROPIC_API_KEY` | ❌ | - | Claude API key |
| `TELEGRAM_BOT_TOKEN` | ❌ | - | Telegram bot token |
| `TELEGRAM_CHAT_ID` | ❌ | - | Telegram chat ID |
| `GEO_OPTIMIZER_PATH` | ❌ | - | Path to geo optimizer CLI |
| `VM_POLLING_INTERVAL_SECONDS` | ❌ | 60 | Poll interval in seconds |
| `MAX_RETRIES` | ❌ | 3 | Max job retries |
| `REQUEST_TIMEOUT_SECONDS` | ❌ | 30 | API request timeout |
| `MAX_CONCURRENT_JOBS` | ❌ | 5 | Concurrent jobs to process |
| `LOG_LEVEL` | ❌ | INFO | Logging level |

### Firestore Collections

The worker uses these Firestore collections:

```
/jobs/{id}
  - org_id: string
  - type: string (audit, fix, track_prompts, etc)
  - status: string (queued, processing, completed, failed)
  - created_at: timestamp
  - updated_at: timestamp
  - completed_at: timestamp (optional)
  - cost: number
  - error: string (optional)
  - data: object

/audits/{id}
  - org_id: string
  - timestamp: timestamp
  - site_url: string
  - score: number
  - issues: array

/aiRuns/{id}
  - org_id: string
  - timestamp: timestamp
  - prompt: string
  - model: string
  - answer: string
  - sources: array
  - position: number
  - cost: number

/changes/{id}
  - org_id: string
  - timestamp: timestamp
  - pr_number: number
  - pr_url: string
  - files_written: array of strings
  - fixes_applied: array of strings
  - repo: string
  - branch: string
  - reason: string
```

## Monitoring & Logs

### View Logs

**Local:**
```bash
tail -f logs/hermes.log
```

**Docker:**
```bash
docker logs -f sightline-hermes

# With timestamps
docker logs -f --timestamps sightline-hermes

# Last 100 lines
docker logs --tail 100 sightline-hermes
```

**Systemd:**
```bash
sudo journalctl -u sightline-hermes -f
sudo journalctl -u sightline-hermes -n 100
```

### Telegram Alerts

The worker sends alerts to Telegram for:
- ✅ Worker startup
- ❌ Job failures with error details
- 🚨 Consecutive error backoff
- 🛑 Worker shutdown

### Metrics to Monitor

1. **Job Processing Rate**
   - Jobs queued per hour
   - Jobs completed per hour
   - Failure rate

2. **Costs**
   - Cost per job by type
   - Total monthly spend
   - Spend per customer

3. **Latency**
   - Time from queue to completion
   - API call times
   - Database latency

4. **Errors**
   - Consecutive failures
   - API failures (rate limiting, timeouts)
   - GitHub rate limit status

### Prometheus Metrics (Future)

```
hermes_jobs_queued_total
hermes_jobs_completed_total
hermes_jobs_failed_total
hermes_job_duration_seconds
hermes_api_cost_total
hermes_error_count
```

## Troubleshooting

### Worker won't start

**Error:** `FIREBASE_CREDENTIALS_JSON invalid`
```bash
# Verify JSON is valid
echo $FIREBASE_CREDENTIALS_JSON | python -m json.tool
```

**Error:** `GitHub App not found`
```bash
# Check app is installed on the org
curl -H "Authorization: Bearer $JWT_TOKEN" \
  https://api.github.com/app/installations
```

### Jobs stuck in "queued"

```bash
# Check if worker is running
docker ps | grep sightline-hermes

# Check logs for errors
docker logs sightline-hermes | tail -50

# Verify Firebase credentials
firebase firestore list-collections  # in Firebase CLI
```

### High costs

```bash
# Check LLM API usage
# - OpenAI: https://platform.openai.com/account/usage/overview
# - Google: Google Cloud Console > Billing

# Review job frequency and model choices
# Reduce tracking frequency or use cheaper models for certain tasks
```

### Memory/CPU issues

```bash
# Check resource usage
docker stats sightline-hermes

# If high, increase docker-compose limits:
# services.hermes.deploy.resources.limits.memory = 8G
# services.hermes.deploy.resources.limits.cpus = '4'
```

### Webhook not receiving requests

```bash
# Check port is accessible
curl http://localhost:8000/webhook/health

# Check firewall
sudo ufw allow 8000

# Verify webhook signature if signing
# Use the WEBHOOK_SECRET from .env (must match the Vercel WEBHOOK_SECRET)
```

## Scaling

### Single VM (current)
- ~5-10 concurrent jobs
- 1-2 companies
- ~500 prompts/week per company

### Multiple VMs (future)
```bash
# Create separate .env per company
cp .env.example .env.company-a
cp .env.example .env.company-b

# Run separate containers per company
docker-compose -f docker-compose.yml --env-file .env.company-a up -d
docker-compose -f docker-compose.yml --env-file .env.company-b up -d
```

### Load Balancer (future)
- HAProxy or nginx in front
- Round-robin between Hermes instances
- Shared Firestore backend

## Security Checklist

- [ ] Firebase credentials stored in secure vault
- [ ] GitHub private key never committed
- [ ] Webhook signature validation enabled
- [ ] SSH hardening on VM (key-based auth only)
- [ ] Firewall rules restrict to necessary ports
- [ ] API keys rotated quarterly
- [ ] Audit logs enabled in Firestore
- [ ] Backups of Hermes memory folders daily
- [ ] Rate limits set on GitHub API integration
- [ ] LLM API keys limited to required permissions
