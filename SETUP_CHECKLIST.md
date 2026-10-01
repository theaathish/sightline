# Sightline Setup Checklist

Complete these steps to get Sightline fully operational.

## ✅ Completed

- [x] Frontend code (Next.js)
- [x] Backend code (Hermes worker)
- [x] Documentation
- [x] Firebase project created
- [x] GitHub repository

## 🔧 To Do

### 1. Firebase Setup

#### 1.1 Get Admin SDK Key for Backend
- [ ] Go to [Firebase Console](https://console.firebase.google.com/project/sightline-9d056/settings/serviceaccounts/adminsdk)
- [ ] Click "Generate new private key"
- [ ] Download JSON file
- [ ] Copy to `backend-vm/.env` as `FIREBASE_CREDENTIALS_JSON`

#### 1.2 Enable Firestore
- [ ] Go to [Firestore Database](https://console.firebase.google.com/project/sightline-9d056/firestore)
- [ ] Click "Create database"
- [ ] Choose region: `asia-southeast1` (closest to your users)
- [ ] Start in **production mode** (we'll add rules later)

#### 1.3 Set Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Jobs - customers can read their own
    match /jobs/{jobId} {
      allow read: if request.auth != null && 
                    resource.data.org_id == request.auth.uid;
      allow write: if false; // Only backend writes
    }
    
    // Audits - customers can read their own
    match /audits/{auditId} {
      allow read: if request.auth != null && 
                    resource.data.org_id == request.auth.uid;
      allow write: if false;
    }
    
    // AI Runs - customers can read their own
    match /aiRuns/{runId} {
      allow read: if request.auth != null && 
                    resource.data.org_id == request.auth.uid;
      allow write: if false;
    }
    
    // Sites - customers can read/write their own
    match /sites/{siteId} {
      allow read, write: if request.auth != null && 
                           resource.data.org_id == request.auth.uid;
    }
    
    // Changes - customers can read their own
    match /changes/{changeId} {
      allow read: if request.auth != null && 
                    resource.data.org_id == request.auth.uid;
      allow write: if false;
    }
  }
}
```

#### 1.4 Enable Firebase Authentication
- [ ] Go to [Authentication](https://console.firebase.google.com/project/sightline-9d056/authentication)
- [ ] Enable **Email/Password** provider
- [ ] Enable **Google** sign-in (optional)

### 2. GitHub App Setup

#### 2.1 Create GitHub App
- [ ] Go to [GitHub Settings → Apps → New](https://github.com/settings/apps/new)
- [ ] Fill in:
  - **Name:** Sightline
  - **Homepage:** Your dashboard URL
  - **Webhook URL:** `https://your-vm:8000/webhook/github` (or use ngrok for testing)
  - **Webhook secret:** Generate a random string (save it!)
- [ ] Set permissions:
  - **Repository permissions:**
    - Contents: Read & Write
    - Pull requests: Read & Write
    - Metadata: Read-only
- [ ] Subscribe to events:
  - Pull request
  - Push (optional)
- [ ] Create app
- [ ] Download private key (PEM file)
- [ ] Save App ID

#### 2.2 Install GitHub App
- [ ] Go to your app's installation page
- [ ] Install on your account
- [ ] Select repository: `theaathish/sightline`
- [ ] Grant access

### 3. API Keys

#### 3.1 OpenAI (Required)
- [ ] Go to [OpenAI Platform](https://platform.openai.com/api-keys)
- [ ] Create new secret key
- [ ] Copy to `.env` as `OPENAI_API_KEY`
- [ ] Add payment method (or you'll hit rate limits)

#### 3.2 Google Gemini (Optional)
- [ ] Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- [ ] Get API key
- [ ] Copy to `.env` as `GEMINI_API_KEY`

#### 3.3 Anthropic Claude (Optional)
- [ ] Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
- [ ] Create key
- [ ] Copy to `.env` as `ANTHROPIC_API_KEY`

#### 3.4 Perplexity (Optional)
- [ ] Go to [Perplexity Settings](https://www.perplexity.ai/settings/api)
- [ ] Generate key
- [ ] Copy to `.env` as `PERPLEXITY_API_KEY`

### 4. Telegram Bot (Optional - for alerts)

- [ ] Open Telegram, search for `@BotFather`
- [ ] Send `/newbot` and follow prompts
- [ ] Save bot token to `.env` as `TELEGRAM_BOT_TOKEN`
- [ ] Search for `@userinfobot` to get your chat ID
- [ ] Save chat ID to `.env` as `TELEGRAM_CHAT_ID`

### 5. Backend Deployment

#### 5.1 Local Test
```bash
cd backend-vm
cp .env.template .env
# Edit .env with all credentials above
pip install -r requirements.txt
python main.py
```

Check output:
- [ ] Firebase initialized successfully
- [ ] Webhook server started on port 8000
- [ ] Polling Firestore

#### 5.2 Test Webhook
```bash
curl http://localhost:8000/webhook/health
# Should return: {"status":"healthy"}
```

#### 5.3 VM Deployment (Production)
See [backend-vm/DEPLOYMENT.md](backend-vm/DEPLOYMENT.md) for:
- [ ] VM setup (Ubuntu/Debian)
- [ ] Docker installation
- [ ] Copy `.env` to VM
- [ ] Run `docker-compose up -d`
- [ ] Verify logs: `docker logs -f sightline-hermes`

### 6. Frontend Deployment

#### 6.1 Update Frontend Env
In Vercel dashboard, set environment variables:
```
VITE_FIREBASE_API_KEY=AIzaSyCx3FGqQa4HHfqHpwTIQqiQ1pvIXXxyMuE
VITE_FIREBASE_AUTH_DOMAIN=sightline-9d056.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sightline-9d056
VITE_FIREBASE_STORAGE_BUCKET=sightline-9d056.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=87733199809
VITE_FIREBASE_APP_ID=1:87733199809:web:91c8a9db704e8d7656c540
VITE_WEBHOOK_URL=https://your-vm-ip:8000/webhook/job
VITE_WEBHOOK_SECRET=your-webhook-secret
```

#### 6.2 Deploy Frontend
- [ ] Push to GitHub (triggers Vercel build)
- [ ] Verify deployment succeeded
- [ ] Test login flow

### 7. Integration Testing

#### 7.1 Create Test Account
- [ ] Sign up on dashboard
- [ ] Verify email works
- [ ] Complete onboarding

#### 7.2 Test Job Flow
- [ ] Submit audit job from dashboard
- [ ] Check Firestore: job status changes to `processing`
- [ ] Check backend logs: job picked up
- [ ] Verify result appears in Firestore
- [ ] Check dashboard: result displayed

#### 7.3 Test PR Creation
- [ ] Create a test repository
- [ ] Install GitHub App on test repo
- [ ] Submit fix job from dashboard
- [ ] Verify PR created
- [ ] Check PR contains expected changes

### 8. Security Hardening

- [ ] Rotate all API keys every 90 days
- [ ] Enable 2FA on GitHub, Firebase, and LLM accounts
- [ ] Set up VM firewall (only ports 22, 80, 443, 8000)
- [ ] Use SSH keys only (disable password login)
- [ ] Set up automated Firestore backups
- [ ] Review Firestore security rules
- [ ] Set spending limits on LLM APIs

### 9. Monitoring

- [ ] Set up cost alerts in:
  - OpenAI dashboard
  - Google Cloud billing
  - Anthropic console
- [ ] Configure Telegram alerts working
- [ ] Test error notifications
- [ ] Set up uptime monitoring (UptimeRobot or similar)

### 10. Go Live Checklist

- [ ] All credentials secured (not in git)
- [ ] Frontend deployed and accessible
- [ ] Backend running and processing jobs
- [ ] GitHub App installed and working
- [ ] PR creation tested
- [ ] Monitoring alerts working
- [ ] Documentation complete
- [ ] First customer onboarded

---

## Quick Start Commands

### Backend
```bash
cd backend-vm
cp .env.template .env
# Edit .env with credentials
docker-compose up -d
docker logs -f sightline-hermes
```

### Frontend
```bash
cd frontend-vercel
npm run build
# Deploy to Vercel
```

### Test Webhook
```bash
curl -X POST http://localhost:8000/webhook/job \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "test-company",
    "type": "audit",
    "site_id": "site-1",
    "data": {"site_url": "https://example.com"}
  }'
```

---

## Cost Estimates

**Development (testing):**
- Firebase: Free tier
- Vercel: Free tier
- OpenAI: ~$5-10/month (testing)
- VM: $5-10/month (small instance)

**Production (10 customers):**
- Firebase: ~$25/month
- Vercel: Free (hobby) or $20/month (pro)
- LLM APIs: ~$500/month
- VM: ~$40/month (4 vCPU, 8GB)
- **Total: ~$565-585/month**

**Per customer:**
- ~$50-60/month in LLM costs
- Price at $99-149/month for margin

---

## Support Resources

- [Backend Documentation](backend-vm/README.md)
- [Deployment Guide](backend-vm/DEPLOYMENT.md)
- [API Reference](backend-vm/API.md)
- [Architecture](backend-vm/ARCHITECTURE.md)
- [Quick Start](backend-vm/QUICKSTART.md)
