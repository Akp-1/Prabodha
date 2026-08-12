# Prabodha — Free Vercel & Cloud Database Deployment Guide

This guide walks you through deploying **Prabodha** to **Vercel** (for Next.js web hosting) and **Supabase / Neon** (for free cloud PostgreSQL hosting) with **$0 monetary cost**.

---

## Architecture Overview

```
 ┌───────────────────────────┐      ┌─────────────────────────────┐
 │    Vercel (Hobby Tier)    │      │  Supabase / Neon (PostgreSQL)│
 │                           │      │                             │
 │  Next.js 14 Web App       │───>  │  Managed PostgreSQL DB      │
 │  https://prabodha.vercel.app     │  Enums, Tables & Seed Data  │
 └───────────────────────────┘      └─────────────────────────────┘
```

---

## Step 1: Create a Free Cloud PostgreSQL Database

Choose either **Supabase** or **Neon** (both offer 100% free PostgreSQL databases with no credit card required):

### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com) and sign in with GitHub.
2. Click **"New Project"**.
3. Set Project Name: `prabodha-db`, assign a password, and choose a region.
4. Go to **Project Settings -> Database -> Connection String**.
5. Copy the **URI / Connection String** (Transaction Pooler or Session Pooler).

### Option B: Neon
1. Go to [neon.tech](https://neon.tech) and sign in with GitHub.
2. Click **"New Project"** -> Name it `prabodha-db`.
3. Copy the Postgres connection string.

---

## Step 2: Push Schema & Seed the Cloud Database

On your local machine in the `Prabodha` directory:

1. Open your `.env` file and set `DATABASE_URL` to your cloud connection string:
   ```env
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres?schema=public"
   ```

2. Run Prisma migration against the cloud database:
   ```bash
   npx prisma migrate deploy
   ```

3. Seed the cloud database with demo data:
   ```bash
   npm run db:seed
   ```

*(Your cloud PostgreSQL database is now populated with all 30 students, 3 teachers, attendance, homework, exams, and parent accounts!)*

---

## Step 3: Deploy Next.js to Vercel

1. Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** -> **"Project"**.
3. Select your repository: **`Akp-1/Prabodha`**.
4. In the Vercel project configuration page, open **Environment Variables**:
   - Add Key: `DATABASE_URL` | Value: `[Your Cloud Postgres URL from Step 1]`
   - Add Key: `JWT_SECRET` | Value: `prabodha-production-secret-key-2026`
5. Click **"Deploy"**.

---

## Step 4: Access Your Live Application!

In ~60 seconds, Vercel will complete the build and give you a live production URL:
`https://prabodha.vercel.app` (or custom name).

### Test Live Accounts:
- **Admin:** `admin@prabodha.local`
- **Teacher:** `teacher@prabodha.local`
- **Student:** `rohan.mehta@prabodha.local`
- **Parent:** `parent@prabodha.local`
- **Password:** `password123`
