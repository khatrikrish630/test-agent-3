# ⚡ Facebook AI Agent — GHL Expert Edition

AI-powered Facebook marketing agent with Russell Brunson frameworks, auto-scheduling, group monitoring, and lead scraping.

---

## Deploy to a Live Server (Railway — Free Tier Available)

### Step 1: Push this project to GitHub

Go to [github.com/new](https://github.com/new) and create a new repository. Then:

```bash
cd fb-ai-agent
git init
git add .
git commit -m "Initial commit - FB AI Agent"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fb-ai-agent.git
git push -u origin main
```

### Step 2: Deploy on Railway

1. Go to [railway.app](https://railway.app) and sign in with your GitHub account
2. Click **"New Project"**
3. Select **"Deploy from GitHub Repo"**
4. Pick your `fb-ai-agent` repository
5. Railway will auto-detect everything and start building

### Step 3: Add your API keys in Railway

In your Railway project dashboard:

1. Click on your service
2. Go to **"Variables"** tab
3. Add these 3 variables:

```
ANTHROPIC_API_KEY = sk-ant-xxxxxxxxxxxxxxxx
FB_ACCESS_TOKEN  = EAAxxxxxxxxxxxxxxxxxxxxxxxx
FB_PAGE_ID       = 123456789012345
```

4. Railway will auto-redeploy with your keys

### Step 4: Get your live URL

1. Go to **"Settings"** tab in Railway
2. Under **"Networking"** click **"Generate Domain"**
3. You will get a URL like: `fb-ai-agent-production.up.railway.app`
4. Open it and your agent is live!

---

## Alternative: Deploy on Render (also free tier)

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **"New" then "Web Service"**
3. Connect your `fb-ai-agent` repo
4. Settings will auto-fill from `render.yaml`
5. Add the same 3 environment variables
6. Click **"Create Web Service"**

---

## How to Get Your API Keys

### Facebook Access Token and Page ID

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) and Create App
2. Open [Graph API Explorer](https://developers.facebook.com/tools/explorer)
3. Select your app then Click "Get Token" then "Get User Access Token"
4. Check: `pages_manage_posts`, `pages_read_engagement`, `pages_read_user_content`
5. Copy the token

**For Page ID:** Go to your Facebook Page then About then Page Transparency then Page ID

**For a 60-day long-lived token:**
```
https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_TOKEN
```

### Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Settings then API Keys then Create Key
3. Copy the key starting with `sk-ant-`

---

## Features

| Feature | Description |
|---------|-------------|
| **Content Engine** | 5 Russell Brunson frameworks |
| **Auto Schedule** | 2 posts/day at 9AM and 9PM |
| **One-Click Publish** | Direct to Facebook via Graph API |
| **Group Monitor** | Finds posts hiring GHL/funnel/automation experts |
| **AI Reply Generator** | Crafts personalized replies to group leads |
| **Lead Scraper** | Dream customer avatar matching |
| **Friend Queue** | Rate-limited friend request system |

---

## Project Structure

```
fb-ai-agent/
├── server/
│   └── index.js          # Express backend (API proxy + scheduler)
├── src/
│   ├── App.jsx            # Main dashboard
│   ├── main.jsx           # React entry
│   ├── components/
│   │   └── UI.jsx         # Reusable components
│   └── lib/
│       ├── api.js         # Frontend API client
│       └── constants.js   # Frameworks, topics, keywords
├── index.html
├── package.json
├── vite.config.js
├── railway.toml           # Railway deploy config
├── render.yaml            # Render deploy config
├── Procfile               # Process config
├── .env.example           # Template for env vars
└── .gitignore
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Build fails on Railway | Check Deploy Logs tab, usually a missing env var |
| Facebook OAuthException | Token expired, generate a new one and update the variable |
| App loads but API calls fail | Check Variables tab, all 3 keys must be set |
| Auto-post not firing | Toggle the scheduler ON from the Schedule tab |
