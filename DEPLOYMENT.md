# 🚀 Sankalp Cloud Deployment Guide

This guide walks you through deploying the **Sankalp** Government Innovation & Procurement Platform to production cloud infrastructure:
- **Frontend**: Deployed on **Vercel** (Next.js 14 App Router)
- **Backend & API**: Deployed on **Render** / **Railway** (FastAPI + Python 3.11)
- **Database**: **Render PostgreSQL** / **Supabase** / **Neon** (PostgreSQL 16 + `pgvector`)

---

## 📁 Repository Overview
- `frontend/` — Next.js 14 Web Application with Neo-Brutalist UI & i18n support.
- `backend/` — FastAPI Backend API, SQLAlchemy 2.0 ORM, Alembic Migrations, and Gemini AI services.
- `docker-compose.yml` — Local orchestration.
- `render.yaml` — Render Cloud Infrastructure Blueprint.
- `frontend/vercel.json` — Vercel Deployment Configuration.

---

## Part 1: Deploy Backend & Database to Render / Railway

### Option A: Using Render Blueprint (Recommended - One Click)

1. Push your repository to **GitHub**.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** ➔ **Blueprint**.
4. Connect your GitHub repository containing `render.yaml`.
5. Render will automatically provision:
   - Managed PostgreSQL Database (`sankalp-db`) with `pgvector` enabled.
   - FastAPI Docker Web Service (`sankalp-backend`).
6. Set the required Environment Variables in Render:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `SEED_ADMIN_PASSWORD`: Secure password for `admin@test.gov.in`.

### Option B: Deploying Database to Supabase / Neon
If using an external managed PostgreSQL database (e.g. Supabase or Neon):
1. Obtain your PostgreSQL Connection String (e.g. `postgresql://user:pass@ep-xyz.supabase.co:5432/postgres`).
2. Run database migrations to construct all tables:
   ```bash
   cd backend
   alembic upgrade head
   ```
3. Deploy the `backend/Dockerfile` to Render or Railway as a Web Service, supplying `DATABASE_URL` and `GEMINI_API_KEY`.

---

## Part 2: Deploy Frontend to Vercel

1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** ➔ **Project**.
3. Import your **GitHub Repository**.
4. Configure Project Settings:
   - **Root Directory**: Select `frontend`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://sankalp-backend.onrender.com` (Replace with your backend URL)
6. Click **Deploy**.

---

## 🔒 Post-Deployment Verification Checklist

1. **Verify Live Web App**: Access your Vercel deployment URL (e.g. `https://sankalp-frontend.vercel.app`).
2. **Test Multi-Language Switcher**: Toggle between English (`ENGLISH`), Hindi (`हिंदी`), and Marathi (`मराठी`).
3. **Log In to Super Admin**:
   - URL: `https://sankalp-frontend.vercel.app/login`
   - Email: `admin@test.gov.in`
   - Password: `<your SEED_ADMIN_PASSWORD>`
4. **Verify API Health & OpenAPI Specs**: Access `https://sankalp-backend.onrender.com/docs` to inspect live OpenAPI documentation.
