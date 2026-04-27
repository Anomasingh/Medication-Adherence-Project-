# Deployment Guide - Medication Adherence Predictor

This guide covers deploying the Medication Adherence Predictor application to free hosting platforms.

## Architecture Overview
- **Frontend**: React + Vite (deployed to Vercel)
- **Backend**: FastAPI (deployed to Railway or Render)
- **Models**: Pre-trained scikit-learn/XGBoost models

---

## Deployment Option 1: Vercel (Frontend) + Railway (Backend) ⭐ Recommended

### Prerequisites
- GitHub account with your repo pushed
- Vercel account (free) - https://vercel.com
- Railway account (free) - https://railway.app

### Part A: Deploy Backend to Railway

1. **Create Railway Account**
   - Sign up at https://railway.app
   - Connect your GitHub account

2. **Deploy Backend**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect it's a Python project
   - Set environment variables:
     ```
     ENVIRONMENT=production
     DEBUG=false
     CORS_ORIGINS=["https://your-frontend.vercel.app"]
     ```
   - Deploy (Railway will use `requirements.txt` and `runtime.txt`)

3. **Get Backend URL**
   - After deployment, Railway provides a URL like `https://medicationpredictor-production.up.railway.app`
   - Save this URL

### Part B: Deploy Frontend to Vercel

1. **Create Vercel Account**
   - Sign up at https://vercel.com
   - Click "Import Git Repository"

2. **Import Your Repository**
   - Connect GitHub and select your repository
   - Vercel detects it's a Vite project automatically

3. **Configure Environment Variables**
   - Go to Settings > Environment Variables
   - Add:
     ```
     VITE_API_URL = https://your-backend-railway-url.com
     ```
   - Replace with actual Railway backend URL

4. **Deploy**
   - Click Deploy
   - Vercel builds and deploys automatically
   - Get your frontend URL: `https://your-app.vercel.app`

5. **Update Backend CORS**
   - Go back to Railway dashboard
   - Update environment variable:
     ```
     CORS_ORIGINS=["https://your-frontend.vercel.app"]
     ```

---

## Deployment Option 2: Render (Both Frontend & Backend)

### Backend on Render

1. **Create Render Account**: https://render.com
2. **Create New Web Service**
   - Connect GitHub repo
   - Select repo and branch
   - Configure:
     - Name: `medication-predictor-api`
     - Runtime: Python 3.11
     - Build command: `pip install -r backend/requirements.txt`
     - Start command: `cd backend && uvicorn app:app --host 0.0.0.0 --port 8000`
     - Instance Type: Free (has 15-minute auto-restart limit)

3. **Set Environment Variables**
   - Add in Render dashboard:
     ```
     ENVIRONMENT=production
     DEBUG=false
     ```

### Frontend on Render

1. **Create Static Site**
   - New > Static Site
   - Select your repository
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`
   - Set env var: `VITE_API_URL=https://your-render-backend.onrender.com`

---

## Optional: Docker Deployment (DigitalOcean, AWS, etc.)

Create a `Dockerfile` in your project root:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install Node for frontend build
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Build frontend
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install && npm run build
WORKDIR /app

# Copy backend
COPY backend ./backend

# Expose port
EXPOSE 8000

# Run backend
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Post-Deployment Checklist

- [ ] Frontend loads at deployment URL
- [ ] Backend API responds at `/` endpoint
- [ ] Can make predictions from frontend
- [ ] CORS errors are resolved
- [ ] Environment variables are set correctly
- [ ] Models load without errors

## Troubleshooting

### Models not loading
- Check Railway/Render logs for `ModuleNotFoundError`
- Ensure all dependencies in `requirements.txt` are pinned
- Verify model files are in `models/` directory

### CORS Errors
- Update backend `CORS_ORIGINS` with exact frontend URL (including https://)
- Restart backend service

### Build failures
- Check build logs in Vercel/Render dashboard
- Verify `vite.config.js` is present
- Ensure `npm install` works locally: `cd frontend && npm install`

### Performance Issues (Free Tier)
- Railway/Render free tier may have limitations
- Consider upgrading to paid tier ($5-10/month) for better performance
- Models may take 10-30 seconds to load on first request (cold start)

## Cost Breakdown (Free Tier)
- Vercel: Free
- Railway: Free ($5/month credit, usually enough)
- Render: Free (with limitations)
- **Total: Free to $5/month**

---

## Next Steps

1. Push all changes to GitHub (including new config files)
2. Follow the deployment steps above
3. Test both frontend and backend in production
4. Monitor logs for any issues
