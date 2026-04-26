// api/messages.ts — Full backend: chat history, search, file uploads
import { neon } from '@neondatabase/serverless';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ── AUTO-CREATE ALL TABLES ────────────────────────────────
async function ensureTables(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id          SERIAL PRIMARY KEY,
      user_id     TEXT        NOT NULL,
      personality TEXT        NOT NULL,
      role        TEXT        NOT NULL,
      content     TEXT        NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS uploaded_files (
      id          SERIAL PRIMARY KEY,
      user_id     TEXT        NOT NULL,
      filename    TEXT        NOT NULL,
      mimetype    TEXT        NOT NULL,
      size        INTEGER     NOT NULL,
      content     TEXT        NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_messages_user_personality
      ON messages(user_id, personality)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_messages_content
      ON messages USING gin(to_tsvector('english', content))
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'DATABASE_URL not configured' });
  }

  const sql = neon(process.env.DATABASE_URL);
  await ensureTables(sql);

  const { action } = req.query;

  // ── HEALTH CHECK ─────────────────────────────────────────
  if (req.method === 'GET' && action === 'health') {
    const result = await sql`SELECT NOW() as time`;
    return res.status(200).json({ ok: true, time: result[0].time });
  }

  // ── SEARCH MESSAGES ───────────────────────────────────────
  if (req.method === 'GET' && action === 'search') {
    const { userId, query } = req.query;
    if (!userId || !query) return res.status(400).json({ error: 'Missing params' });
    const rows = await sql`
      SELECT id, personality, role, content, created_at
      FROM messages
      WHERE user_id = ${userId as string}
        AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query as string})
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return res.status(200).json(rows);
  }

  // ── GET CHAT HISTORY ──────────────────────────────────────
  if (req.method === 'GET' && action === 'history') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const rows = await sql`
      SELECT personality,
             COUNT(*)                          AS message_count,
             MAX(created_at)                   AS last_active,
             (SELECT content FROM messages m2
              WHERE m2.user_id = m.user_id
                AND m2.personality = m.personality
              ORDER BY created_at DESC LIMIT 1) AS last_message
      FROM messages m
      WHERE user_id = ${userId as string}
      GROUP BY personality, user_id
      ORDER BY last_active DESC
    `;
    return res.status(200).json(rows);
  }

  // ── LOAD MESSAGES (default GET) ───────────────────────────
  if (req.method === 'GET') {
    const { userId, personality } = req.query;
    if (!userId || !personality) return res.status(400).json({ error: 'Missing params' });
    const rows = await sql`
      SELECT role, content FROM messages
      WHERE user_id = ${userId as string}
        AND personality = ${personality as string}
      ORDER BY created_at ASC
      LIMIT 60
    `;
    return res.status(200).json(rows);
  }

  // ── SAVE MESSAGE ──────────────────────────────────────────
  if (req.method === 'POST' && action === 'message') {
    const { userId, personality, role, content } = req.body;
    if (!userId || !personality || !role || !content)
      return res.status(400).json({ error: 'Missing fields' });
    await sql`
      INSERT INTO messages (user_id, personality, role, content)
      VALUES (${userId}, ${personality}, ${role}, ${content})
    `;
    return res.status(200).json({ ok: true });
  }

  // ── SAVE FILE ─────────────────────────────────────────────
  if (req.method === 'POST' && action === 'file') {
    const { userId, filename, mimetype, size, content } = req.body;
    if (!userId || !filename || !content)
      return res.status(400).json({ error: 'Missing fields' });
    const result = await sql`
      INSERT INTO uploaded_files (user_id, filename, mimetype, size, content)
      VALUES (${userId}, ${filename}, ${mimetype}, ${size}, ${content})
      RETURNING id
    `;
    return res.status(200).json({ ok: true, fileId: result[0].id });
  }

  // ── GET FILES ─────────────────────────────────────────────
  if (req.method === 'GET' && action === 'files') {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    const rows = await sql`
      SELECT id, filename, mimetype, size, created_at
      FROM uploaded_files
      WHERE user_id = ${userId as string}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    return res.status(200).json(rows);
  }

  // ── DELETE CHAT ───────────────────────────────────────────
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

  // ── DEFAULT POST (backwards compat) ──────────────────────
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

  return res.status(405).json({ error: 'Method not allowed' });
}