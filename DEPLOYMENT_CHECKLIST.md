# Quick Deployment Checklist

## Before You Deploy

### 1. Prepare Your GitHub Repository
```bash
# From your local project root
git add .
git commit -m "Add deployment configuration files"
git push origin main
```

**Files to commit:**
- ✅ `vercel.json` - Vercel configuration
- ✅ `frontend/.vercelignore` - Files to ignore in Vercel builds
- ✅ `backend/requirements.txt` - Python dependencies
- ✅ `backend/runtime.txt` - Python version specification
- ✅ `backend/.env.example` - Environment variables template
- ✅ `.gitignore` - Git ignore rules
- ✅ `DEPLOYMENT_GUIDE.md` - Full deployment instructions
- ✅ Updated `frontend/src/App.jsx` - Uses `VITE_API_URL` environment variable

### 2. Choose Your Deployment Platform

**Recommended: Vercel (Frontend) + Railway (Backend)**
- Easiest setup
- Free tier sufficient for this project
- Good performance on free tier

**Alternative: Render (Both)**
- Also free
- Slightly different setup process

## Deployment Steps (Vercel + Railway)

### Step 1: Deploy Backend to Railway
1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Python project
5. Set environment variables:
   - `ENVIRONMENT=production`
   - `DEBUG=false`
   - `CORS_ORIGINS=["https://your-frontend-url.vercel.app"]`
6. Deploy and wait for completion
7. **Save the Railway URL** (looks like: `https://xxx.up.railway.app`)

### Step 2: Deploy Frontend to Vercel
1. Go to https://vercel.com
2. Click "Import Project" → Select your GitHub repo
3. Vercel auto-detects Vite project
4. Set environment variables:
   - `VITE_API_URL = https://your-railway-backend-url`
5. Click "Deploy"
6. **Save the Vercel URL** (looks like: `https://xxx.vercel.app`)

### Step 3: Update Backend CORS
1. Go back to Railway dashboard
2. Go to Variables
3. Update `CORS_ORIGINS`:
   ```
   ["https://your-vercel-frontend-url.vercel.app"]
   ```
4. Save and redeploy

## What Each File Does

| File | Purpose |
|------|---------|
| `vercel.json` | Tells Vercel how to build your Vite app |
| `frontend/.vercelignore` | Excludes files from Vercel builds |
| `backend/requirements.txt` | Lists all Python dependencies |
| `backend/runtime.txt` | Specifies Python 3.11 version |
| `backend/.env.example` | Template for environment variables |
| `DEPLOYMENT_GUIDE.md` | Detailed step-by-step deployment guide |

## Environment Variables

### Frontend (Vercel)
- `VITE_API_URL`: Backend API URL (e.g., https://medication-api.up.railway.app)

### Backend (Railway)
- `ENVIRONMENT`: Set to `production`
- `DEBUG`: Set to `false`
- `CORS_ORIGINS`: JSON array of allowed frontend URLs

## Testing After Deployment

1. ✅ Visit frontend URL in browser
2. ✅ Make a prediction to test backend connection
3. ✅ Check browser console for errors
4. ✅ Verify models load (first request may take 20-30 seconds)

## Estimated Costs
- **Vercel**: Free
- **Railway**: Free ($5/month credit usually sufficient)
- **Total**: Free to $5/month

## Need Help?

See `DEPLOYMENT_GUIDE.md` for:
- Detailed troubleshooting
- Docker deployment option
- Cost breakdown
- Performance optimization tips

---

**Ready to deploy? Push your changes to GitHub and follow the steps above!**
