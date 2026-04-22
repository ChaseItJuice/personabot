// api/messages.ts
// Vercel serverless function — handles chat history via Neon Postgres
// Deploy this inside your /api folder at the project root

import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const sql = neon(process.env.DATABASE_URL!);

// Auto-create table on first run
async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT        NOT NULL,
      personality TEXT       NOT NULL,
      role       TEXT        NOT NULL,
      content    TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureTable();

  // ── GET — load history ──
  if (req.method === 'GET') {
    const { userId, personality } = req.query;
    if (!userId || !personality) return res.status(400).json({ error: 'Missing params' });

    const rows = await sql`
      SELECT role, content FROM messages
      WHERE user_id = ${userId as string}
        AND personality = ${personality as string}
      ORDER BY created_at ASC
      LIMIT 40
    `;
    return res.status(200).json(rows);
  }

  // ── POST — save message ──
  if (req.method === 'POST') {
    const { userId, personality, role, content } = req.body;
    if (!userId || !personality || !role || !content)
      return res.status(400).json({ error: 'Missing fields' });

    await sql`
      INSERT INTO messages (user_id, personality, role, content)
      VALUES (${userId}, ${personality}, ${role}, ${content})
    `;
    return res.status(200).json({ ok: true });
  }

  // ── DELETE — clear chat ──
  if (req.method === 'DELETE') {
    const { userId, personality } = req.query;
    if (!userId || !personality) return res.status(400).json({ error: 'Missing params' });

    await sql`
      DELETE FROM messages
      WHERE user_id = ${userId as string}
        AND personality = ${personality as string}
    `;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
