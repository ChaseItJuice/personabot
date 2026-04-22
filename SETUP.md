# PersonaBot v2.0 — Setup & Deployment Guide
Stack: React + Vite · Gemini 1.5 Flash · Neon Postgres · Vercel · GitHub

---

## STEP 1 — Install new dependencies

```bash
cd C:\Users\Bhavesh\personabot
npm install @neondatabase/serverless @vercel/node
npm install -D @types/node
```

---

## STEP 2 — Get your Gemini API key (FREE)

1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with AIza...)
4. Free tier = 1,500 requests/day

---

## STEP 3 — Set up Neon Postgres (FREE)

1. Go to https://neon.tech and sign up free
2. Click "New Project" → name it "personabot"
3. Go to Dashboard → Connection Details
4. Copy the "Connection string" (starts with postgresql://...)

---

## STEP 4 — Set up local environment

Create a file called `.env.local` in your project root:

```
VITE_GEMINI_API_KEY=AIza...your_key_here...
DATABASE_URL=postgresql://...your_neon_string...
```

---

## STEP 5 — Test locally

```bash
npm run dev
```

Open http://localhost:5173 — chat history will now persist via Neon!

---

## STEP 6 — Push to GitHub

```bash
git init
git add .
git commit -m "PersonaBot v2.0 — Gemini + Neon + Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/personabot.git
git push -u origin main
```

---

## STEP 7 — Deploy to Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "New Project" → Import your personabot repo
3. Go to Settings → Environment Variables → Add:
   - VITE_GEMINI_API_KEY = your Gemini key
   - DATABASE_URL = your Neon connection string
4. Click "Deploy"
5. Your app is live at https://personabot.vercel.app 🚀

Every push to GitHub → auto-deploys to Vercel!

---

## File Structure

```
personabot/
├── src/
│   ├── App.tsx          ← Main React app (Gemini + Neon)
│   └── main.tsx
├── api/
│   └── messages.ts      ← Vercel serverless API (Neon DB)
├── .env.example         ← Copy to .env.local
├── .env.local           ← Your actual keys (never commit!)
├── vercel.json          ← Vercel config
└── package.json
```

---

## How Memory Works

- Each user gets a unique ID stored in localStorage
- Every message is saved to Neon Postgres via /api/messages
- When you reopen a personality, your last 40 messages are loaded
- Clear chat deletes messages from Neon for that personality

---

## Free Tier Limits

| Service | Free Limit |
|---------|-----------|
| Gemini 1.5 Flash | 1,500 req/day, 15 req/min |
| Neon Postgres | 0.5 GB storage, 10 GB transfer |
| Vercel | 100 GB bandwidth, unlimited deploys |
| GitHub | Unlimited public repos |

All completely free for personal use! 🎉
