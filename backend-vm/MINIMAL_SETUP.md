# Minimal Sightline Setup (Without LLM APIs)

Run Sightline with **just SEO audits and automated fixes** - no AI tracking, no expensive LLM costs.

## What You Get (Without LLMs)

✅ **SEO/AEO Audits** via GEO Optimizer
- Site scoring (0-100)
- Issue detection (missing robots.txt, schema, etc)
- Recommendations

✅ **Automated Fixes** via GitHub PRs
- Generate sitemap.xml
- Create robots.txt
- Add JSON-LD schema
- Fix meta tags
- Add alt text
- Create llms.txt

✅ **PR Automation**
- Automatic pull requests
- Change tracking
- Revert capability

❌ **AI Visibility Tracking** (Disabled)
- ~~Track mentions in ChatGPT, Gemini, etc~~
- ~~Brand positioning analysis~~
- ~~Competitive comparison~~

## Cost Comparison

| Feature | With LLMs | Without LLMs |
|---------|-----------|--------------|
| **Audits** | $0.50 | $0.50 (same) |
| **PR Fixes** | $1.00 | $1.00 (same) |
| **AI Tracking** | $10/week | **$0** (disabled) |
| **Per Customer/Month** | ~$50 | **~$6** |
| **For 10 Customers** | ~$500/mo | **~$60/mo** |

💰 **Save 88% on operational costs!**

## Required Credentials (Minimal)

### 1. Firebase Admin SDK ✅
- Service account JSON
- From Firebase Console → Service Accounts
- **Free tier available**

### 2. GitHub App ✅
- Private key + App ID
- Create at github.com/settings/apps
- **Free**

### 3. ~~LLM API Keys~~ ❌
- ~~OpenAI, Gemini, Claude, Perplexity~~
- **NOT NEEDED** ✨

### 4. Telegram Bot (Optional) ✅
- For error alerts
- **Free**

## Setup Steps

### 1. Create .env (Minimal)

```bash
cd backend-vm
cp .env.example .env.minimal
```

Edit `.env.minimal`:
```bash
# Firebase (REQUIRED)
FIREBASE_CREDENTIALS_JSON='{"type":"service_account",...}'
ORG_ID=test-company

# GitHub App (REQUIRED)
GITHUB_PRIVATE_KEY='-----BEGIN RSA PRIVATE KEY-----\n...'
GITHUB_APP_ID=123456
# Dashboard-to-VM webhook shared secret.
# IMPORTANT: this MUST hold the SAME value as the Vercel server-side
# WEBHOOK_SECRET — signing and verification must agree, or every job fails
# with 401 "Invalid webhook signature".
WEBHOOK_SECRET=your-secret

# LLM APIs (LEAVE EMPTY - AI tracking disabled)
OPENAI_API_KEY=
GEMINI_API_KEY=
PERPLEXITY_API_KEY=
ANTHROPIC_API_KEY=

# Telegram (OPTIONAL)
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=987654321

# GEO Optimizer (Optional - auto-downloaded if missing)
GEO_OPTIMIZER_PATH=/usr/local/bin/geo

# Configuration
VM_POLLING_INTERVAL_SECONDS=60
LOG_LEVEL=INFO
```

### 2. Install GEO Optimizer

```bash
# Option 1: Install globally
pip install geo-optimizer-skill

# Option 2: Let Hermes download it
# (automatic if GEO_OPTIMIZER_PATH not set)

# Verify
geo --version
```

### 3. Run Backend

```bash
# Install dependencies (no LLM packages needed)
pip install firebase-admin PyGithub requests python-telegram-bot fastapi uvicorn pydantic

# Start worker
python main.py
```

Output should show:
```
[INFO] Hermes Worker starting for org: test-company
[INFO] Firebase initialized successfully
[INFO] AI tracking disabled (no LLM API keys configured)
[INFO] Worker initialized successfully
[INFO] Webhook server started on port 8000
```

### 4. Test Audit Job

```bash
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

### 5. Test Fix Job

```bash
curl -X POST http://localhost:8000/webhook/job \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "test-company",
    "type": "fix",
    "site_id": "site-1",
    "data": {
      "repo_url": "https://github.com/owner/repo",
      "fixes": ["sitemap", "robots.txt", "schema"]
    }
  }'
```

## What Happens with AI Tracking Jobs?

If someone tries to submit `track_prompts` or `verify_merge` jobs:

```json
{
  "status": "failed",
  "error": "AI tracking disabled: No LLM API keys configured"
}
```

**Solution:** Hide AI tracking features in your dashboard UI.

## Frontend Changes Needed

Update your dashboard to hide AI tracking:

```typescript
// In your dashboard code
const AI_TRACKING_ENABLED = false; // Set to false

// Hide these sections:
if (AI_TRACKING_ENABLED) {
  // Show AI Visibility page
  // Show Track Prompts button
  // Show Verification after PR
}
```

## Product Positioning (Without LLMs)

**What to sell:**
- "Automated SEO fixes via GitHub PRs"
- "Continuous site auditing and improvement"
- "Developer-friendly SEO automation"

**What NOT to sell:**
- ~~"AI visibility tracking"~~
- ~~"Track your brand in ChatGPT"~~
- ~~"Competitive AI analysis"~~

## Pricing (Without AI Tracking)

### Cost Structure
- VM: $10/month (small instance)
- Firebase: Free tier → $25/month (at scale)
- GitHub: Free
- No LLM costs: $0

**Total:** $10-35/month for infrastructure

### Pricing Tiers

**Starter** - $29/month
- 1 site
- Weekly audits
- 4 PRs/month
- Email support

**Growth** - $79/month
- 3 sites
- Daily audits
- 12 PRs/month
- Priority support

**Agency** - $199/month
- 10 sites
- Real-time audits
- Unlimited PRs
- White-label reports

**Margins:** 70-95% 🎉

## When to Add LLM Support Later

Add AI tracking when:
1. Customers specifically ask for it
2. You have budget for $500/month in LLM costs
3. You can charge $20-50/month extra per customer for AI tracking

**Pricing with AI:** Add $49/month for "AI Visibility" add-on

## Roadmap

### Phase 1 (MVP - 3 months)
- ✅ SEO audits (GEO Optimizer)
- ✅ Automated fixes
- ✅ PR automation
- ✅ Dashboard with results
- ❌ No AI tracking

### Phase 2 (Growth - 6 months)
- ⚠️ Content generation — Not yet implemented (no `generate_content` job type)
- ⚠️ Search Console sync — Not yet implemented (no `gscMetrics`; dashboard Overview shows these as unavailable)
- ✅ Weekly reports
- ❌ Still no AI tracking

### Phase 3 (Scale - 12 months)
- ✅ **Add AI tracking** (now you have revenue)
- ✅ Competitive analysis
- ✅ Brand monitoring

## FAQ

**Q: Can I add LLM support later?**
A: Yes! Just add API keys to `.env` and redeploy. No code changes needed.

**Q: What about content generation?**
A: For blog posts, you can use:
- Hire writers ($50-100 per post)
- Use customer's own content team
- Add LLM later when budget allows

**Q: Is GEO Optimizer enough?**
A: Yes! It covers:
- Technical SEO scoring
- AEO (AI Engine Optimization) checks
- Schema validation
- Crawler access verification
- Meta tag analysis

**Q: How do I compete with tools that have AI tracking?**
A: Focus on:
- Developer experience (GitHub workflow)
- Automation (hands-off fixes)
- Pricing (10x cheaper)
- Speed (instant PRs)

## Support

- Questions? Check [DEPLOYMENT.md](DEPLOYMENT.md)
- Issues? See [ARCHITECTURE.md](ARCHITECTURE.md)
- API docs? Read [API.md](API.md)

---

**Ready to deploy?** This setup costs ~$10-35/month and you can charge $29-199/month per customer! 💰
