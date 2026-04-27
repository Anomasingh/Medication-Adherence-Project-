# Deployment Guide - Medication Adherence Predictor

This guide covers deploying your full-stack application. Choose the option that works best for you.

---

## **Option 1: Vercel (Frontend) + Railway (Backend) ⭐ RECOMMENDED**

### **Part A: Deploy Backend to Railway**

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub account
   - Click "New Project"

2. **Connect Your GitHub Repository**
   - Click "Deploy from GitHub"
   - Select your medication adherence repository
   - Select the `backend` directory as root

3. **Configure Environment Variables**
   - In Railway dashboard → Variables
   - Add any environment variables you need (if any)

4. **Set Up Start Command**
   - Railway will auto-detect it's a Python project
   - Make sure your `backend/requirements.txt` is up to date
   - Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`

5. **Copy Your Backend URL**
   - Once deployed, Railway will give you a public URL (e.g., `https://your-backend-123.railway.app`)
   - Keep this URL for step C

---

### **Part B: Deploy Frontend to Vercel**

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub account

2. **Import Your Project**
   - Click "Add New" → "Project"
   - Select your GitHub repository
   - **Root Directory**: Select `./frontend`
   - **Framework Preset**: Select `Vite`

3. **Configure Build Settings**
   - Build Command: `npm run build` (should be auto-detected)
   - Output Directory: `.dist` (should be auto-detected)

4. **Add Environment Variables**
   - In Vercel → Environment Variables
   - Add `VITE_API_URL` = `https://your-backend-123.railway.app` (from Part A)

5. **Deploy**
   - Click "Deploy"
   - Your frontend will be live in ~2 minutes

---

### **Part C: Update Backend CORS Settings**

Go to `backend/app.py` and update CORS to allow your Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Local development
        "https://your-frontend.vercel.app"  # Your deployed Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## **Option 2: Docker + Railway (Single Deployment)**

This deploys everything as one container.

1. **Create Railway Account** (if not done)
   - Go to [railway.app](https://railway.app)

2. **Create New Project**
   - Click "New Project" → "Deploy from Dockerfile"
   - Connect GitHub repository
   - Select root directory as `/`

3. **Railway Configuration**
   - Railway will detect the Dockerfile in `/backend/`
   - Port will be set to 8000
   - Deploy

4. **For Frontend**
   - Build frontend: `cd frontend && npm run build`
   - Move `frontend/dist` to `backend/static/` before deploying
   - Update `backend/app.py` to serve static files

---

## **Option 3: Heroku (Simpler Alternative to Railway)**

### **Deploy Backend**

1. Install Heroku CLI
2. Create `Procfile` in `backend/`:
   ```
   web: uvicorn app:app --host 0.0.0.0 --port $PORT
   ```

3. Deploy:
   ```bash
   heroku login
   heroku create your-app-name
   git push heroku main
   ```

4. Get your Heroku URL (will be shown after deploy)

### **Deploy Frontend**

Follow Vercel steps (Part B) using the Heroku backend URL

---

## **Quick Deployment Checklist**

- [ ] Update `VITE_API_URL` in frontend `.env`
- [ ] Ensure `backend/requirements.txt` is complete
- [ ] Update CORS settings in `backend/app.py`
- [ ] Push changes to GitHub
- [ ] Test API endpoints after deployment
- [ ] Verify models load correctly

---

## **Troubleshooting**

**Models not loading?**
- Ensure `models/` folder is in your repository
- Check that pickle files are not in `.gitignore`
- Verify file paths in `backend/app.py`

**CORS errors?**
- Update `allow_origins` in `backend/app.py`
- Redeploy backend after changes

**Frontend can't reach backend?**
- Check `VITE_API_URL` environment variable
- Ensure backend URL is correct and accessible
- Check browser console for errors

---

## **Next Steps**

1. **Choose your deployment option** (Vercel + Railway recommended)
2. **Follow the steps above**
3. **Test your deployed app**
4. **Monitor for errors** in deployment dashboards

Need help? Let me know which option you're choosing!
