# Hermes Backend - API Reference

## Webhook API

The webhook server runs on port 8000 and receives job submissions from the Vercel dashboard.

### Submit Job

Submit a job to the queue. The webhook validates the signature and creates a Firestore document.

**Endpoint:** `POST /webhook/job`

**Headers:**
```
Content-Type: application/json
X-Webhook-Signature: <HMAC-SHA256 signature>
```

**Request Body:**
```json
{
  "org_id": "company-123",
  "type": "audit",
  "site_id": "site-1",
  "data": {
    "site_url": "https://example.com"
  }
}
```

**Response (Success):**
```json
{
  "status": "queued",
  "job_id": "jobs/abc123def456",
  "message": "Job audit submitted for company-123"
}
```

**Response (Error):**
```json
{
  "detail": "Invalid webhook signature"
}
```

**Status Codes:**
- `200` - Job queued successfully
- `400` - Invalid request or signature
- `401` - Webhook signature verification failed
- `500` - Server error

---

### Signature Verification

Jobs must be signed with HMAC-SHA256 using the shared secret.

> **IMPORTANT — shared secret coupling:** the Vercel server-side
> `WEBHOOK_SECRET` and the VM's `WEBHOOK_SECRET` MUST hold the SAME value.
> The dashboard signs the raw JSON job body with HMAC-SHA256 under that
> secret and the VM verifies it in `_verify_signature` — if the two values
> differ, EVERY job submission fails with `401 "Invalid webhook signature"`.

**Generate Signature (Node.js):**
```javascript
const crypto = require('crypto');
const body = JSON.stringify({
  org_id: "company-123",
  type: "audit",
  site_id: "site-1",
  data: { site_url: "https://example.com" }
});

const signature = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(body)
  .digest('hex');

console.log(signature); // Use in X-Webhook-Signature header
```

**Generate Signature (Python):**
```python
import hmac
import hashlib
import json

body = json.dumps({
    "org_id": "company-123",
    "type": "audit",
    "site_id": "site-1",
    "data": {"site_url": "https://example.com"}
})

signature = hmac.new(
    os.getenv("WEBHOOK_SECRET").encode(),
    body.encode(),
    hashlib.sha256
).hexdigest()

print(signature)
```

---

### Get Job Status

Retrieve job status and results.

**Endpoint:** `GET /webhook/jobs/{org_id}`

**Query Parameters:**
- `org_id` (string, required) - Organization ID

**Response:**
```json
{
  "org_id": "company-123",
  "total_jobs": 5,
  "jobs": [
    {
      "id": "jobs/abc123def456",
      "type": "audit",
      "status": "completed",
      "created_at": "2024-01-15T10:30:45Z",
      "updated_at": "2024-01-15T10:35:22Z",
      "completed_at": "2024-01-15T10:35:22Z",
      "cost": 0.50,
      "result": {
        "success": true,
        "data": {
          "site_url": "https://example.com",
          "score": 75,
          "issues": [
            {"type": "missing_robots_txt", "severity": "high"}
          ]
        }
      }
    },
    {
      "id": "jobs/xyz789uvw012",
      "type": "fix",
      "status": "failed",
      "created_at": "2024-01-15T11:00:00Z",
      "updated_at": "2024-01-15T11:02:30Z",
      "cost": 0.0,
      "error": "Repository not found"
    }
  ]
}
```

---

### Health Check

Simple health check endpoint.

**Endpoint:** `GET /webhook/health`

**Response:**
```json
{
  "status": "healthy"
}
```

**Status Codes:**
- `200` - Server is healthy
- `500` - Server error

---

## Job Types

### Audit

Run an SEO/AEO audit on a site.

**Job Type:** `audit`

**Request:**
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

**Result:**
```json
{
  "success": true,
  "data": {
    "site_url": "https://example.com",
    "score": 75,
    "issues": [
      {
        "type": "missing_robots_txt",
        "severity": "high",
        "description": "robots.txt file not found"
      },
      {
        "type": "no_json_ld",
        "severity": "medium",
        "description": "No JSON-LD schema found"
      }
    ]
  },
  "cost": 0.50
}
```

**Cost:** $0.50 per run

---

### Fix

Generate and open a PR with automated fixes.

**Job Type:** `fix`

**Request:**
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

**Available Fixes:**
- `sitemap` - Generate sitemap.xml
- `robots.txt` - Generate robots.txt
- `schema` - Add JSON-LD schema
- `alt_text` - Add alt text to images
- `meta_tags` - Add/fix meta tags
- `internal_links` - Add relevant internal links
- `404_page` - Create custom 404 page
- `llms_txt` - Add llms.txt for AI crawling

**Result:**
```json
{
  "success": true,
  "data": {
    "repo": "owner/repo",
    "pr_number": 123,
    "pr_url": "https://github.com/owner/repo/pull/123",
    "branch": "sightline/auto-fixes",
    "fixes_applied": ["sitemap", "robots.txt", "schema"]
  },
  "cost": 1.00
}
```

**Cost:** $1.00 per PR

---

### Track Prompts

Run brand prompts across multiple LLM models.

**Job Type:** `track_prompts`

**Request:**
```json
{
  "type": "track_prompts",
  "org_id": "company-123",
  "site_id": "site-1",
  "data": {
    "prompts": [
      {
        "id": "prompt-1",
        "text": "What do you know about {brand}?"
      },
      {
        "id": "prompt-2",
        "text": "Recommend a {category} like {brand}"
      }
    ],
    "brand": "Acme Inc",
    "category": "CRM software",
    "models": ["gpt-4", "gemini-pro", "claude-3", "perplexity"]
  }
}
```

**Result:**
```json
{
  "success": true,
  "data": {
    "prompts_tracked": 2,
    "models": ["gpt-4", "gemini-pro", "claude-3", "perplexity"],
    "runs": [
      {
        "prompt_id": "prompt-1",
        "model": "gpt-4",
        "samples": [
          {
            "answer": "Acme Inc is a leading...",
            "sources": ["example.com", "crunchbase.com"],
            "mentioned": true,
            "position": 1,
            "sentiment": "positive"
          }
        ]
      }
    ],
    "total_cost": 2.50
  },
  "cost": 2.50
}
```

**Cost:** ~$2.50 per tracking cycle (3 samples × 4 models × 2 prompts)

---

### Verify Merge

Re-run prompts after a PR merge to measure impact.

**Job Type:** `verify_merge`

**Request:**
```json
{
  "type": "verify_merge",
  "org_id": "company-123",
  "site_id": "site-1",
  "data": {
    "pr_number": 123,
    "baseline_run_id": "aiRuns/xyz789"
  }
}
```

**Result:**
```json
{
  "success": true,
  "data": {
    "pr_number": 123,
    "baseline_run_id": "aiRuns/xyz789",
    "current_run_id": "aiRuns/abc123",
    "changes": [
      {
        "prompt_id": "prompt-1",
        "model": "gpt-4",
        "mentioned_before": false,
        "mentioned_after": true,
        "position_before": null,
        "position_after": 3,
        "confidence": "high"
      }
    ],
    "summary": "1 new mention (GPT-4), no mentions lost"
  },
  "cost": 2.50
}
```

**Cost:** ~$2.50 per verification

---

## Firestore Collections

### Jobs Collection

Path: `/jobs/{id}`

**Schema:**
```typescript
{
  org_id: string;           // Company ID
  type: string;             // Job type: audit, fix, track_prompts, verify_merge
  site_id: string;          // Site identifier
  status: string;           // queued, processing, completed, failed
  created_at: Timestamp;    // When job was queued
  updated_at: Timestamp;    // Last update
  completed_at?: Timestamp; // When job completed
  cost: number;             // Cost in USD
  error?: string;           // Error message if failed
  data: object;             // Job-specific data (site_url, fixes, etc)
  result?: object;          // Results when completed
}
```

**Query Examples:**
```python
# Get queued jobs for org
db.collection("jobs") \
  .where("org_id", "==", "company-123") \
  .where("status", "==", "queued") \
  .limit(5) \
  .stream()

# Get completed jobs
db.collection("jobs") \
  .where("org_id", "==", "company-123") \
  .where("status", "==", "completed") \
  .order_by("completed_at", "DESCENDING") \
  .limit(10) \
  .stream()

# Get failed jobs this week
db.collection("jobs") \
  .where("org_id", "==", "company-123") \
  .where("status", "==", "failed") \
  .where("created_at", ">=", week_ago) \
  .stream()
```

---

### AI Runs Collection

Path: `/aiRuns/{id}`

Stores results of prompt tracking across LLMs.

**Schema:**
```typescript
{
  org_id: string;
  prompt_id: string;
  model: string;            // gpt-4, gemini-pro, claude-3, perplexity
  answer: string;
  sources: string[];
  mentioned: boolean;
  position?: number;        // 1-10 or null if not mentioned
  sentiment?: string;       // positive, neutral, negative
  cost: number;
  timestamp: Timestamp;
  run_key: string;          // Links samples in same run
}
```

---

### Audits Collection

Path: `/audits/{id}`

Stores SEO/AEO audit results.

**Schema:**
```typescript
{
  org_id: string;
  site_id: string;
  site_url: string;
  score: number;            // 0-100
  issues: {
    type: string;
    severity: string;       // high, medium, low
    description: string;
  }[];
  timestamp: Timestamp;
}
```

---

## Error Handling

### Job Failures

When a job fails, it's marked with `status: "failed"` and an error message:

```json
{
  "id": "jobs/123",
  "status": "failed",
  "error": "GitHub repository not found at https://github.com/owner/repo",
  "cost": 0.0
}
```

**Common Errors:**
- `"Repository not found"` - GitHub URL invalid or GitHub App not installed
- `"Invalid API key"` - LLM API key expired or invalid
- `"Rate limit exceeded"` - Too many requests to LLM API
- `"Timeout"` - Request took too long
- `"Firebase credentials invalid"` - Firestore access denied

### Retry Logic

Jobs are NOT automatically retried. The dashboard should:
1. Detect failed jobs
2. Alert the user
3. Allow manual retry (re-submit job)

---

## Webhooks (Future)

Future versions may support GitHub webhooks for:
- PR merge notifications → auto-verify
- Commits to tracked branches → re-audit
- Deploy events → verify live changes
