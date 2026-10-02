# Hermes Backend - Architecture

## Overview

Hermes is a background worker that processes jobs from Firestore. It runs as one container per company on a VM and handles:

- SEO/AEO audits
- Automated fixes via GitHub PRs
- AI visibility tracking across LLMs (⚠️ Not yet implemented — stub)
- Content generation and publishing (⚠️ Not yet implemented)

## High-Level Architecture

```
┌─────────────────┐
│   Dashboard     │
│  (TanStack Start + Vite on │
│   Vercel)       │
└────────┬────────┘
         │
    ┌────▼─────┐
    │  Vercel  │
    │ Webhook  │
    └────┬─────┘
         │
         ▼
    ┌─────────────────┐
    │   Firestore     │
    │  (job queue)    │
    └────────┬────────┘
             │
    ┌────────▼────────────────┐
    │   Hermes Worker         │
    │   ┌──────────────────┐  │
    │   │  Job Processor   │  │
    │   │  ┌────────────┐  │  │
    │   │  │ Skills     │  │  │
    │   │  │ - Audit    │  │  │
    │   │  │ - Fix PR   │  │  │
    │   │  │ - Track    │  │  │
    │   │  └────────────┘  │  │
    │   └──────────────────┘  │
    │                         │
    │   ┌──────────────────┐  │
    │   │  Webhook Server  │  │
    │   │  (FastAPI)       │  │
    │   └──────────────────┘  │
    └────────┬────────────────┘
             │
    ┌────────┼────────┬────────┐
    ▼        ▼        ▼        ▼
 GitHub   LLM APIs  GEO Opt  Telegram
 (PR)    (Tracking) (Audit)  (Alerts)
```

## Component Details

### 1. Job Processor

Polls Firestore for queued jobs and routes them to appropriate skills.

**Flow:**
```
1. Poll Firestore every 60s (configurable)
2. Get jobs with status="queued" for org
3. Limit to MAX_CONCURRENT_JOBS (default 5)
4. For each job:
   a. Mark as "processing"
   b. Route to skill based on job.type
   c. Execute skill
   d. Mark as "completed" or "failed"
   e. Save results + cost to Firestore
```

**File:** `src/job_processor.py`

### 2. Skills

Modular task handlers. Each skill is responsible for one type of work.

#### Audit Skill (`src/skills/audit.py`)
- **Input:** site_url
- **Output:** score, issues list
- **Integration:** GEO Optimizer CLI
- **Cost:** ~$0.50 per run

#### Fix PR Skill (`src/skills/fix_pr.py`)
- **Input:** repo_url, fixes list
- **Output:** PR number, link
- **Integration:** GitHub API + token broker
- **Changes:** sitemap, robots.txt, schema, alt text, etc
- **Cost:** ~$1.00 per PR

#### Track Prompts Skill (`src/skills/track_prompts.py`)
> ⚠️ Not yet implemented — still a stub returning hardcoded values, no LLM call.
- **Input:** prompts, brand, models
- **Output:** mentions, position, sources
- **Integration:** OpenAI, Gemini, Anthropic, Perplexity APIs
- **Sampling:** 3 runs per prompt per model
- **Cost:** ~$2.50 per tracking cycle

#### Verify Merge Skill (`src/skills/verify_merge.py`)
> ⚠️ Not yet implemented — still a stub returning hardcoded values.
- **Input:** pr_number, baseline_run_id
- **Output:** mention/position change, confidence
- **Compares:** before/after metrics
- **Cost:** ~$2.50 per verification

### 3. Firebase Client

Handles all Firestore operations with org-scoped access control.

**Collections:**
- `jobs` - Task queue
- `audits` - Audit results
- `aiRuns` - AI tracking results
- `changes` - PR history

**File:** `src/firebase_client.py`

### 4. GitHub Token Broker

Generates short-lived, repo-scoped tokens using GitHub App authentication.

**Flow:**
```
1. Generate JWT with app credentials
2. List GitHub App installations
3. Find installation for owner
4. Request installation token scoped to specific repo
5. Token valid for ~1 hour
6. Token returned to skill for use
```

**Security:**
- Private key stored only in .env (not in code)
- JWT expires in 10 minutes
- Installation tokens scoped to specific repos
- Tokens never stored, generated on-demand

**File:** `src/github_token_broker.py`

### 5. Webhook Server

FastAPI server that receives job submissions from Vercel dashboard.

**Endpoints:**
- `POST /webhook/job` - Submit a job
  - Validates webhook signature
  - Creates job in Firestore
  - Returns job_id
- `GET /webhook/health` - Health check
- `GET /webhook/jobs/{org_id}` - Get job status

**Security:**
- HMAC-SHA256 signature verification
- Shared secret in .env

**File:** `src/webhook.py`

### 6. Monitoring

Sends alerts to Telegram for job events.

**Alerts:**
- ✅ Worker startup
- ❌ Job failures
- 🚨 Repeated errors
- 🛑 Worker shutdown

**File:** `src/monitoring.py`

## Data Flow

### Job Lifecycle

```
Dashboard                Firestore              Hermes                   External
   │                       │                      │                         │
   │ 1. Submit job         │                      │                         │
   ├──────────────►POST /webhook/job              │                         │
   │                       │                      │                         │
   │                  2. Queue job                │                         │
   │                 (status=queued)              │                         │
   │                       │                      │                         │
   │                       │                 3. Poll                        │
   │                       │◄────────────────query jobs                     │
   │                       │                      │                         │
   │                 4. Return queued jobs        │                         │
   │                       ├──────────────────►   │                         │
   │                       │                      │                         │
   │                       │               5. Update status                 │
   │                       │◄──────────────(processing)                     │
   │                       │                      │                         │
   │                       │                      │    6. Execute skill     │
   │                       │                      ├────────────────────────►│
   │                       │                      │◄────────────────────────┤
   │                       │                      │      7. Results         │
   │                       │                      │                         │
   │                       │               8. Save result                   │
   │                       │◄──────────────(completed, cost)               │
   │                       │                      │                         │
   │ 9. Poll dashboard     │                      │                         │
   │    (result ready)      │                      │                         │
   │◄──────────────────get job status─────────────│                         │
   │                       │                      │                         │
   │ 10. Show result       │                      │                         │
   └                       └                      └                         └
```

### Audit Job Example

```json
{
  "type": "audit",
  "org_id": "company-123",
  "site_id": "site-1",
  "data": {
    "site_url": "https://example.com"
  }
}
```

**Processing:**
1. Job processor routes to `AuditSkill`
2. Calls GEO Optimizer: `geo audit https://example.com --json`
3. Parses output: score, issues list
4. Saves to `audits` collection
5. Returns: `{"success": true, "data": {...}, "cost": 0.5}`

### PR Job Example

```json
{
  "type": "fix",
  "org_id": "company-123",
  "site_id": "site-1",
  "data": {
    "repo_url": "https://github.com/owner/repo",
    "fixes": ["sitemap", "robots.txt", "schema"]
  }
}
```

**Processing:**
1. Job processor routes to `FixPRSkill`
2. Get GitHub token via token broker
3. Clone repo
4. Apply fixes (generate/update files)
5. Commit + push to branch
6. Create PR with description
7. Save change log to Firestore
8. Return: `{"success": true, "data": {"pr_number": 123, ...}, "cost": 1.0}`

## Error Handling

### Job Failures

```
Job fails
    ↓
Mark as "failed" in Firestore
    ↓
Log error message
    ↓
Send Telegram alert with error details
    ↓
Exponential backoff before retrying
    ↓
After MAX_RETRIES failures, mark as "permanent_failure"
```

### API Rate Limiting

Each LLM API has rate limits:
- **OpenAI**: 3,500 RPM (Tier 2)
- **Gemini**: 600 RPM (free tier)
- **Anthropic**: 100k tokens/day
- **Perplexity**: 20 RPM (free)

**Handling:**
- Respect rate limit headers
- Implement exponential backoff
- Use cheaper models for validation runs
- Cache identical queries

### Concurrent Job Limits

- `MAX_CONCURRENT_JOBS` = 5 (configurable)
- Prevents overloading LLM APIs
- Spreads cost across multiple polling cycles
- Avoids VM resource exhaustion

## Cost Tracking

Every operation logs its cost:

```python
result = {
    "success": True,
    "data": {...},
    "cost": 2.50  # USD
}
```

**Cost Breakdown:**
- Audit: $0.50
- PR (fix): $1.00
- Tracking (3 samples × 4 models): $2.50
- Verify merge: $2.50

**Monthly per customer:**
```
1 audit/week           = $2
1 PR/week              = $4
1 tracking cycle/week  = $10
Total                  = ~$16/month at scale
```

## Security Considerations

1. **Credentials Management**
   - Firebase: Admin SDK key (service account)
   - GitHub: Private key (GitHub App)
   - LLM APIs: API keys
   - All stored in .env, never committed

2. **Token Scope**
   - GitHub: Repo-scoped, limited to PR + contents
   - Generated on-demand, short-lived (1 hour)
   - Never stored in database

3. **Firestore Security Rules**
   - Customers can only read/write their own org_id
   - Admin SDK bypasses rules (for Hermes)
   - Hermes code filters by org_id on every operation

4. **PR Safety**
   - PR-first (no auto-merge in MVP)
   - Allowed paths only (blog/, public/, not env or config)
   - Preview via Vercel deploy previews
   - Revert button available

## Scaling

### Current (Single VM)
- 1 container per company
- ~5-10 concurrent jobs
- Polling every 60s
- ~$500/month in LLM costs for 10 customers

### Future (Worker Pool)
```
Load Balancer
    ├── Hermes Worker 1 (company-a, b, c)
    ├── Hermes Worker 2 (company-d, e, f)
    └── Hermes Worker 3 (company-g, h, i)
```

- Horizontal scaling via Docker Swarm or Kubernetes
- Shared Firestore backend
- Central monitoring + metrics

### Cost Optimization
- Batch tracking requests
- Cache audit results for same site
- Use cheaper models for non-critical tasks
- Implement confidence-based sampling (low confidence = more samples)

## Integration Points

### Incoming
- **Vercel Webhook** (`/webhook/job`) - Dashboard triggers jobs
- **Firebase Listeners** - Real-time job updates (future)

### Outgoing
- **Firestore** - Job queue + results storage
- **GitHub API** - PR creation, repo access
- **LLM APIs** - Prompt execution
- **GEO Optimizer** - Site audit
- **Telegram** - Error alerts
- **Google Search Console** - Future: impressions sync

## Monitoring & Observability

### Logs
- Structured JSON logging
- Levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Forwarded to stdout (captured by Docker)

### Metrics (Future)
- Prometheus format
- Job processing rate
- API costs per customer
- Error rate
- Latency percentiles

### Alerting
- Telegram for critical events
- Email digest weekly (cost report)
- Dashboard charts (trends)

## Testing

```bash
# Unit tests
pytest tests/

# Integration tests (requires Firestore emulator)
firebase emulators:start
pytest tests/integration

# Load testing
locust -f tests/load.py
```
