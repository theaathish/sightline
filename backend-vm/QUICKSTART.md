# Hermes Backend - Quick Start

Get Hermes running in 5 minutes locally or on a VM.

## 1. Collect Credentials

You'll need:
- **Firebase Admin Key** - From [Google Cloud Console](https://console.cloud.google.com)
  - Service account JSON
- **GitHub App** - [Create one here](https://github.com/settings/apps)
  - Private key (PEM format)
  - App ID
- **LLM API Keys** - From provider dashboards
  - OpenAI API key
  - Google Gemini key (optional)
  - Claude API key (optional)
  - Perplexity key (optional)
- **Telegram Bot** (optional) - For error alerts
  - Bot token (create via @BotFather)
  - Your chat ID

## 2. Setup Environment

### Option A: Local Development

```bash
# Clone repo (if not already done)
cd backend-vm

# Copy template
cp .env.example .env

# Edit with your credentials
nano .env
```

Edit `.env`:
```bash
FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
ORG_ID=test-company
GITHUB_PRIVATE_KEY='-----BEGIN RSA PRIVATE KEY-----\n...'
GITHUB_APP_ID=123456
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=987654321
```

### Option B: Docker

```bash
cd backend-vm
cp .env.example .env
nano .env  # Edit credentials

# Build image
docker build -t sightline-hermes:latest .

# Start container
docker-compose up -d
```

## 3. Install & Run

### Local (Python)

```bash
# Install dependencies
pip install -r requirements.txt

# Run worker
python main.py
```

Output:
```
2024-01-15 10:30:45 [INFO] hermes: Hermes Worker starting for org: test-company
2024-01-15 10:30:45 [INFO] hermes: Firebase initialized successfully
2024-01-15 10:30:45 [INFO] hermes: Telegram monitoring enabled
2024-01-15 10:30:45 [INFO] hermes: Worker initialized successfully
2024-01-15 10:30:45 [INFO] hermes: Webhook server started on port 8000
2024-01-15 10:30:45 [INFO] hermes: Polling Firestore every 60s for jobs
```

### Docker

```bash
docker-compose up -d
docker-compose logs -f
```

## 4. Test the Webhook

Open another terminal:

```bash
# Health check
curl http://localhost:8000/webhook/health
# {"status":"healthy"}

# Submit a test job
curl -X POST http://localhost:8000/webhook/job \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "test-company",
    "type": "audit",
    "site_id": "site-1",
    "data": {
      "site_url": "https://example.com"
    }
  }'
```

Response:
```json
{
  "status": "queued",
  "job_id": "jobs/abc123",
  "message": "Job audit submitted for test-company"
}
```

## 5. Monitor in Firestore

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Open Firestore > Collections
4. Watch `jobs` collection:
   - Status changes: `queued` → `processing` → `completed`
   - Results appear in `result` field
   - Cost is logged in `cost` field

## 6. View Logs

### Local
```bash
tail -f logs/hermes.log
```

### Docker
```bash
docker logs -f sightline-hermes
```

### Telegram (if configured)
- Worker sends startup notification
- Job failures trigger alerts
- Errors with stack traces

## Next Steps

### Full Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for:
- VM setup
- Systemd service
- Production configuration
- Scaling strategies

### Architecture Details
See [ARCHITECTURE.md](ARCHITECTURE.md) for:
- Component details
- Data flows
- Error handling
- Scaling plans

### API Reference
See [API.md](API.md) for:
- Webhook endpoints
- Job types
- Firestore schema
- Signature verification

### Development
See [README.md](README.md) for:
- Project structure
- Contributing guidelines
- Testing
- Adding new skills

## Troubleshooting

### Worker won't start

**Check Firebase credentials:**
```bash
echo $FIREBASE_CREDENTIALS_JSON | python -m json.tool
# Should output valid JSON
```

**Check Python version:**
```bash
python --version
# Should be 3.11+
```

### Webhook not accessible

```bash
# Check port is open
lsof -i :8000

# Check firewall
sudo ufw allow 8000

# Test locally
curl http://localhost:8000/webhook/health
```

### Jobs stuck in "queued"

```bash
# Check worker is running
ps aux | grep main.py

# Check logs for errors
python main.py 2>&1 | head -50

# Verify Firestore connection
firebase firestore collections  # If firebase CLI installed
```

### High CPU/Memory

```bash
# Reduce concurrent jobs
MAX_CONCURRENT_JOBS=2

# Reduce polling frequency
VM_POLLING_INTERVAL_SECONDS=120

# Restart container
docker-compose restart hermes
```

## Cost Estimation

**Per tracking cycle (1 week, 1 company):**
- Audit: $0.50
- 1 PR: $1.00
- 1 tracking (4 prompts × 4 models): $10.00
- **Total: ~$11.50/week = ~$50/month**

**For 10 companies:**
- ~$500/month in LLM costs

## Security Checklist

Before deploying to production:

- [ ] Credentials in secure vault (not .env)
- [ ] Firestore backup enabled
- [ ] Firewall restricts to necessary ports
- [ ] SSH keys only (no password login)
- [ ] Monitoring alerts configured
- [ ] Rate limiting on GitHub API
- [ ] API keys rotated quarterly
- [ ] Audit logs enabled

## Getting Help

- Check [DEPLOYMENT.md](DEPLOYMENT.md) for common issues
- Review logs: `docker logs sightline-hermes`
- Check Firestore job status
- Review error messages in job.error field

---

**Ready to deploy?** Jump to [DEPLOYMENT.md](DEPLOYMENT.md) →
