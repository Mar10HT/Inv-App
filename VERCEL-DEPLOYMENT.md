# Vercel Deployment Guide - Frontend (Angular)

## Prerequisites

- Backend API deployed on Railway (see `Inv-App-API/DEPLOYMENT-GUIDE.md`)
- Railway API URL (e.g., `https://inv-app-api-production.up.railway.app`)

---

## Step 1: Configure Backend URL

Update `src/environments/environment.prod.ts` with your Railway API URL:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://YOUR-RAILWAY-URL.railway.app/api'
};
```

**Replace** `YOUR-RAILWAY-URL.railway.app` with your actual Railway domain.

---

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from project root:**
   ```bash
   cd Inv-App
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - What's your project's name? **inv-app** (or your preferred name)
   - In which directory is your code located? **./  (just press Enter)**
   - Auto-detected Project Settings (Angular):
     - Build Command: `npm run build`
     - Output Directory: `dist/inv-app/browser`
     - Development Command: `npm run start`
   - Want to modify these settings? **N**

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository `Inv-App`
4. **Configure Project:**
   - **Framework Preset:** Angular
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist/inv-app` (verify this matches your build output)
   - **Install Command:** `npm install`

5. **No Environment Variables needed** (we hardcoded the API URL in environment.prod.ts)

6. Click **"Deploy"**

---

## Step 3: Configure CORS on Backend (Railway)

Your backend needs to allow requests from your Vercel domain.

Update `Inv-App-API/src/main.ts`:

```typescript
app.enableCors({
  origin: [
    'http://localhost:4200',
    'https://your-app.vercel.app',  // Add your Vercel URL
    'https://your-app-*.vercel.app' // Vercel preview deployments
  ],
  credentials: true,
});
```

Then redeploy your backend to Railway:

```bash
cd Inv-App-API
git add .
git commit -m "feat: add Vercel CORS origin"
git push origin main
```

---

## Step 4: Verify Deployment

1. **Open your Vercel URL:** `https://your-app.vercel.app`
2. **Test Login:**
   - Email: `admin@example.com`
   - Password: `password123`
3. **Check Network Tab:** Verify API calls are going to your Railway URL
4. **Test Key Features:**
   - Dashboard loads stats
   - Inventory items display
   - Can add/edit/delete items
   - Transactions work

---

## Configuration Files

### `vercel.json` (Already Created)

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist/inv-app",
  "framework": "angular",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

This configuration:
- ✅ Handles Angular routing (all routes → index.html)
- ✅ Optimizes asset caching
- ✅ Sets correct output directory
- ✅ Uses Angular framework preset

---

## Alternative: Using Environment Variables (Advanced)

If you want to use environment variables instead of hardcoding:

### 1. Create a build-time environment replacement script

**`scripts/set-env.js`:**
```javascript
const fs = require('fs');
const targetPath = './src/environments/environment.prod.ts';

const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${process.env.API_URL || 'https://your-api.railway.app/api'}'
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log('Environment file generated successfully.');
```

### 2. Update `package.json`:

```json
{
  "scripts": {
    "build": "ng build --configuration production",
    "build:prod": "node scripts/set-env.js && ng build --configuration production"
  }
}
```

### 3. Set Environment Variable in Vercel:

**Vercel Dashboard → Project Settings → Environment Variables:**
- **Key:** `API_URL`
- **Value:** `https://your-railway-url.railway.app/api`
- **Environment:** Production

### 4. Update Build Command in Vercel:

Change build command to: `npm run build:prod`

---

## Troubleshooting

### Issue: "Cannot GET /inventory" on page refresh

**Solution:** Already fixed in `vercel.json` with rewrites config.

### Issue: API calls failing (CORS errors)

**Check:**
1. Backend CORS includes Vercel domain
2. `environment.prod.ts` has correct Railway URL
3. Railway backend is running and accessible

**Fix:**
```bash
# Check Railway logs
railway logs

# Verify CORS settings in main.ts
```

### Issue: Build fails on Vercel

**Common causes:**
- TypeScript errors (fix locally first)
- Missing dependencies (check package.json)
- Wrong output directory

**Debug:**
```bash
# Test build locally
npm run build

# Check output directory exists
ls dist/inv-app/browser
```

### Issue: Environment not updating

**Clear Vercel cache:**
```bash
vercel --force
```

Or in dashboard: Settings → Clear Build Cache

---

## URLs After Deployment

- **Frontend (Vercel):** `https://your-app.vercel.app`
- **Backend (Railway):** `https://your-api.railway.app`
- **API Endpoint:** `https://your-api.railway.app/api`

---

## Continuous Deployment

Vercel auto-deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "feat: new feature"
git push origin main

# Vercel automatically:
# 1. Detects the push
# 2. Runs build
# 3. Deploys to production
```

**Preview Deployments:**
- Every pull request gets a preview URL
- Format: `https://inv-app-git-branch-name-user.vercel.app`

---

## Custom Domain (Optional)

### Add Custom Domain in Vercel:

1. **Dashboard → Project → Settings → Domains**
2. **Add Domain:** `inventory.yourdomain.com`
3. **Configure DNS** (at your domain registrar):
   - **Type:** CNAME
   - **Name:** `inventory`
   - **Value:** `cname.vercel-dns.com`

4. **Vercel auto-provisions SSL certificate** (Let's Encrypt)

5. **Update CORS on backend** to include custom domain

---

## Performance Optimizations

Already configured in `vercel.json`:

✅ **Asset Caching:** 1 year cache for static assets
✅ **Gzip Compression:** Automatic
✅ **HTTP/2:** Enabled by default
✅ **CDN:** Vercel Edge Network (global)
✅ **Lazy Loading:** Angular routes are lazy-loaded

---

## Security Best Practices

✅ **HTTPS Only:** Vercel forces HTTPS
✅ **CORS Configured:** Limited to your domains
✅ **JWT Tokens:** Stored in memory (not localStorage)
✅ **API Proxy:** All API calls go through backend
✅ **No Secrets in Frontend:** All sensitive data on backend

---

## Monitoring

**Vercel Dashboard provides:**
- Build logs
- Runtime logs
- Analytics (visits, performance)
- Error tracking

**Access:**
Dashboard → Your Project → Analytics/Logs

---

## Rollback

**If deployment breaks:**

```bash
# Using CLI
vercel rollback

# Or in Dashboard:
# Deployments → Previous Deployment → "Promote to Production"
```

---

## Cost

**Vercel Free Tier includes:**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ CDN
- ✅ Preview deployments

**Perfect for this project!**

---

## Quick Commands Reference

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Rollback deployment
vercel rollback

# Remove deployment
vercel rm deployment-url
```

---

## Next Steps After Deployment

1. ✅ Update Railway backend CORS with Vercel URL
2. ✅ Test all features in production
3. ✅ Set up custom domain (optional)
4. ✅ Configure environment-specific settings
5. ✅ Monitor analytics and logs

---

**Need Help?**
- [Vercel Documentation](https://vercel.com/docs)
- [Angular Deployment Guide](https://angular.io/guide/deployment)
- Check Railway logs if API issues occur
