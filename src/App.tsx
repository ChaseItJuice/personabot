// ── GLOBALS ───────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

import React, { useState, useRef, useEffect } from 'react';
import { Home, Search, Clock, Send, ArrowLeft, Mic, MicOff, MoreHorizontal, Lightbulb, Book, Smile, Trash2, Copy, ThumbsUp, ThumbsDown, Zap, LogOut, User, Lock, Mail, CheckCircle, XCircle, Database, Paperclip, X, FileText, History } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// ── TYPES ─────────────────────────────────────────────────
type PersonalityType = 'friendly' | 'professional' | 'humorous' | 'wise' | 'creative';
type SidebarPanel = null | 'search' | 'history' | 'files';

interface Personality { id: PersonalityType; emoji: string; name: string; description: string; tag: string; color: string; gradient: string; systemPrompt: string; }
interface Message { id: string; text: string; sender: 'user' | 'bot'; timestamp: Date; personality: PersonalityType; liked?: boolean; disliked?: boolean; }
interface UserType { id: string; name: string; email: string; avatar: string; }
interface HistoryItem { personality: PersonalityType; message_count: number; last_active: string; last_message: string; }
interface SearchResult { id: number; personality: string; role: string; content: string; created_at: string; }
interface UploadedFile { id: number; filename: string; mimetype: string; size: number; created_at: string; }

// ── CONFIG ─────────────────────────────────────────────────
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const GROQ_MODEL   = "llama-3.3-70b-versatile";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";

// ── PERSONALITIES ──────────────────────────────────────────
const personalities: Personality[] = [
  {
    id: 'friendly', emoji: '✨', name: 'Friendly Assistant',
    description: 'Warm, uplifting and always in your corner.',
    tag: 'Fast Start', color: '#f59e0b', gradient: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    systemPrompt: `You are Sunny, a warm, cheerful and genuinely caring assistant.
Your character: You're like that one friend who always knows what to say, remembers details, and makes people feel genuinely heard. You're upbeat but not fake.
HOW TO RESPOND:
- Answer the question FIRST, then add personality. Never bury the answer.
- Keep it conversational — 3 to 5 sentences. No essays.
- Use 1 or 2 emojis naturally, not forced. Never start with an emoji.
- End with ONE warm follow-up question or encouragement. Not multiple.
- Never use bullet points unless the user asks for a list.
- Never say "Great question!" or "Absolutely!" — just respond naturally.
Example tone: "The capital of France is Paris! It's such a beautiful city — have you ever thought about visiting? 😊"`,
  },
  {
    id: 'professional', emoji: '💼', name: 'Professional Advisor',
    description: 'Clear, concise and data-driven.',
    tag: 'Work Mode', color: '#3b82f6', gradient: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
    systemPrompt: `You are Alex, a sharp and experienced professional advisor with 20 years across business, finance, and strategy.
Your character: Direct, confident, zero fluff. You respect the user's time. Think McKinsey partner, not a textbook.
HOW TO RESPOND:
- Lead with the answer or recommendation in the very first sentence. No preamble.
- 3 to 5 sentences for simple questions. For complex ones, give a crisp summary then offer to go deeper.
- Use bullet points ONLY when listing 3 or more distinct items.
- End with ONE clear next action the user can take.
- Never say "Great question!", "Certainly!" or "Of course!" — just answer.
Example tone: "The best approach here is to prioritize cash flow over revenue growth in Q1. Focus on reducing burn rate by 15% before scaling. Want me to break down the specific levers?"`,
  },
  {
    id: 'humorous', emoji: '😄', name: 'Humorous Comedian',
    description: 'Funny AND helpful. Never a dull response.',
    tag: 'Fun Mode', color: '#ec4899', gradient: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
    systemPrompt: `You are Benny, a quick-witted comedian who is also surprisingly knowledgeable and helpful.
Your character: Think of a funny friend who happens to know a lot — like if a stand-up comedian also had a PhD.
HOW TO RESPOND:
- Open with a joke, pun, or witty observation related to their question. Keep it short.
- Then give the ACTUAL helpful answer clearly.
- Total response: 3 to 5 sentences max. Tight comedy = better comedy.
- One punchline per response. Don't explain the joke.
- Never sacrifice the answer for the laugh — be genuinely useful.
Example tone: "Ah yes, the eternal human question! *adjusts comedy glasses* Paris is the capital of France — both equally life-changing facts. 😄"`,
  },
  {
    id: 'wise', emoji: '🧙', name: 'Wise Mentor',
    description: 'Timeless wisdom meets modern questions.',
    tag: 'Deep Think', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
    systemPrompt: `You are Sage, a deeply wise mentor who draws from philosophy, psychology, ancient wisdom and lived experience.
Your character: Calm, thoughtful, and profound. You don't lecture; you illuminate.
HOW TO RESPOND:
- Open with a short, powerful metaphor or reframe that shifts perspective.
- Give a concise, meaningful insight in 3 to 5 sentences. No rambling.
- Close with ONE reflective question that makes the person think deeper.
- Speak in flowing sentences — no bullet points, no lists, ever.
Example tone: "A river doesn't fight the rocks — it flows around them and becomes stronger for it. What if this challenge is not blocking you, but defining you?"`,
  },
  {
    id: 'creative', emoji: '📖', name: 'Creative Storyteller',
    description: "Every response is a story. You're the hero.",
    tag: 'Story Mode', color: '#10b981', gradient: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
    systemPrompt: `You are Lyra, a gifted storyteller and creative guide with a poet's eye and an adventurer's heart.
Your character: You see the world as a living story. Every question is a scene. Every answer is a plot twist.
HOW TO RESPOND:
- Turn every answer into a vivid, short narrative scene. The user is always the hero.
- 4 to 6 sentences max. Use ONE strong sensory detail per response.
- Weave facts and answers INTO the story — never break character.
- No bullet points. Ever. Pure flowing prose.
Example tone: "You step into the cobblestone streets of Paris, the smell of fresh croissants drifting from a corner boulangerie — this city has been whispering your name for centuries. What adventure calls to you next?"`,
  },
];

const greetings: Record<PersonalityType, string> = {
  friendly:     "Hi there! I'm so happy to chat with you today! How can I help? 😊",
  professional: "Good day. I'm here to provide clear, expert guidance. What can I assist you with?",
  humorous:     "Hey hey hey! 😄 Ready to laugh? Or at least groan at my puns? What's up?",
  wise:         "Ah, a seeker of wisdom arrives. Ask, and I shall illuminate the path ahead. 🌟",
  creative:     "Once upon a time, someone opened this chat... and an adventure began. What story shall we tell? ✍️",
};

const quickActions = [
  { icon: Search,    label: 'Fun Fact',     prompt: 'Tell me a fascinating and surprising fun fact I probably don\'t know' },
  { icon: Lightbulb, label: 'Daily Advice', prompt: 'Give me one powerful, actionable piece of advice I can apply today' },
  { icon: Book,      label: 'Story Time',   prompt: 'Tell me a captivating short story with a surprising twist at the end' },
  { icon: Smile,     label: 'Make me laugh',prompt: 'Tell me something genuinely funny — a joke, observation, or witty story' },
];

const personalityNames: Record<PersonalityType, string> = {
  friendly: '✨ Friendly', professional: '💼 Professional',
  humorous: '😄 Humorous', wise: '🧙 Wise', creative: '📖 Creative',
};

// ── GROQ API ───────────────────────────────────────────────
async function callGroq(systemPrompt: string, history: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, max_tokens: 400, temperature: 0.85, top_p: 0.9, messages: [{ role: 'system', content: systemPrompt }, ...history] }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e?.error?.message || `Groq error ${res.status}`); }
  return (await res.json()).choices[0].message.content;
}

// ── API HELPERS ────────────────────────────────────────────
async function saveMessage(userId: string, personality: string, role: string, content: string) {
  try { await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, personality, role, content }) }); } catch { }
}
async function loadHistory(userId: string, personality: string): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  try { const r = await fetch(`/api/messages?userId=${userId}&personality=${personality}`); return r.ok ? await r.json() : []; } catch { return []; }
}
async function checkDbHealth(): Promise<boolean> {
  try { const r = await fetch('/api/messages?action=health'); return r.ok; } catch { return false; }
}
async function searchMessages(userId: string, query: string): Promise<SearchResult[]> {
  try { const r = await fetch(`/api/messages?action=search&userId=${userId}&query=${encodeURIComponent(query)}`); return r.ok ? await r.json() : []; } catch { return []; }
}
async function loadChatHistory(userId: string): Promise<HistoryItem[]> {
  try { const r = await fetch(`/api/messages?action=history&userId=${userId}`); return r.ok ? await r.json() : []; } catch { return []; }
}
async function loadFiles(userId: string): Promise<UploadedFile[]> {
  try { const r = await fetch(`/api/messages?action=files&userId=${userId}`); return r.ok ? await r.json() : []; } catch { return []; }
}
async function uploadFile(userId: string, file: File): Promise<boolean> {
  try {
    const content = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
    const r = await fetch('/api/messages?action=file', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, filename: file.name, mimetype: file.type, size: file.size, content }),
    });
    return r.ok;
  } catch { return false; }
}

// ── USER AUTH ──────────────────────────────────────────────
function getStoredUser(): UserType | null {
  try { return JSON.parse(localStorage.getItem('personabot_user') || 'null'); } catch { return null; }
}
function saveUser(u: UserType) { localStorage.setItem('personabot_user', JSON.stringify(u)); }
function clearUser() { localStorage.removeItem('personabot_user'); }

// ── LOGIN SCREEN ───────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (u: UserType) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !password || (isSignUp && !name)) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const user: UserType = {
      id: `user_${email.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
      name: isSignUp ? name : email.split('@')[0],
      email, avatar: (isSignUp ? name : email)[0].toUpperCase(),
    };
    saveUser(user);
    toast.success(`Welcome${isSignUp ? ', ' + name : ' back'}! 🎉`);
    onLogin(user);
    setLoading(false);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'linear-gradient(135deg, #f0ede8 0%, #e8e4de 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <Toaster position="top-center" />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800&family=DM+Sans:wght@300;400;500;600&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
      <div style={{ width: '100%', maxWidth: 440, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(124,58,237,0.3)' }}>🤖</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>PersonaBot</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 6 }}>Your AI with 5 unique personalities</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 24, padding: '32px', boxShadow: '0 8px 48px rgba(0,0,0,0.1)', border: '1px solid #e8e5e0' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>{isSignUp ? 'Create account' : 'Welcome back'}</h2>
          {isSignUp && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Full Name</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8f7f5', border: '1.5px solid #e8e5e0', borderRadius: 12, padding: '10px 14px' }}>
                <User size={16} color="#aaa" />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} />
              </div>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Email</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8f7f5', border: '1.5px solid #e8e5e0', borderRadius: 12, padding: '10px 14px' }}>
              <Mail size={16} color="#aaa" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Password</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8f7f5', border: '1.5px solid #e8e5e0', borderRadius: 12, padding: '10px 14px' }}>
              <Lock size={16} color="#aaa" />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          </div>
          <button onClick={handleSubmit} disabled={loading} style={{ width: '100%', background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.7 : 1, boxShadow: '0 4px 16px rgba(124,58,237,0.3)' }}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#888' }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#bbb' }}>Powered by Groq ⚡ LLaMA 3.3 · Neon Memory · Vercel</p>
      </div>
    </div>
  );
}

// ── SIDEBAR PANEL ──────────────────────────────────────────
function SidebarPanelView({ panel, userId, onSelectPersonality, onClose }: {
  panel: SidebarPanel; userId: string;
  onSelectPersonality: (p: PersonalityType) => void; onClose: () => void;
}) {
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [files, setFiles]               = useState<UploadedFile[]>([]);
  const [loading, setLoading]           = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (panel === 'history') { setLoading(true); loadChatHistory(userId).then(d => { setHistoryItems(d); setLoading(false); }); }
    if (panel === 'files')   { setLoading(true); loadFiles(userId).then(d => { setFiles(d); setLoading(false); }); }
  }, [panel, userId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const results = await searchMessages(userId, searchQuery);
    setSearchResults(results);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    setLoading(true);
    const ok = await uploadFile(userId, file);
    if (ok) {
      toast.success(`${file.name} uploaded!`);
      const updated = await loadFiles(userId);
      setFiles(updated);
    } else {
      toast.error('Upload failed');
    }
    setLoading(false);
  };

  if (!panel) return null;

  const panelStyle: React.CSSProperties = {
    position: 'fixed', left: 64, top: 0, bottom: 0, width: 300,
    background: '#fff', borderRight: '1px solid #e8e5e0', zIndex: 20,
    display: 'flex', flexDirection: 'column', boxShadow: '4px 0 20px rgba(0,0,0,0.08)',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e8e5e0' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>
          {panel === 'search' ? '🔍 Search' : panel === 'history' ? '📂 Chat History' : '📎 Files'}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', display: 'flex' }}><X size={18} /></button>
      </div>

      {/* Search panel */}
      {panel === 'search' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0ede8' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search your messages..." style={{ flex: 1, border: '1.5px solid #e8e5e0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} />
              <button onClick={handleSearch} style={{ background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>Go</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {loading && <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Searching...</div>}
            {!loading && searchResults.length === 0 && searchQuery && <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No results found</div>}
            {searchResults.map(r => (
              <div key={r.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f8f7f5', cursor: 'pointer' }}
                onClick={() => { onSelectPersonality(r.personality as PersonalityType); onClose(); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, background: '#f0ede8', borderRadius: 20, padding: '2px 8px', fontWeight: 600, color: '#666' }}>
                    {personalityNames[r.personality as PersonalityType] || r.personality}
                  </span>
                  <span style={{ fontSize: 10, color: '#bbb' }}>{r.role}</span>
                </div>
                <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History panel */}
      {panel === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading history...</div>}
          {!loading && historyItems.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No chat history yet</div>}
          {historyItems.map((h, i) => (
            <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #f0ede8', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8f7f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => { onSelectPersonality(h.personality); onClose(); }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{personalityNames[h.personality]}</span>
                <span style={{ fontSize: 10, color: '#bbb' }}>{new Date(h.last_active).toLocaleDateString()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
                {h.last_message || 'No messages'}
              </div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>{h.message_count} messages</div>
            </div>
          ))}
        </div>
      )}

      {/* Files panel */}
      {panel === 'files' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0ede8' }}>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} accept=".txt,.pdf,.png,.jpg,.jpeg,.doc,.docx" />
            <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Paperclip size={14} /> Upload File
            </button>
            <p style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 6 }}>Max 5MB · txt, pdf, png, jpg, doc</p>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading files...</div>}
            {!loading && files.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No files uploaded yet</div>}
            {files.map(f => (
              <div key={f.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f0ede8', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: '#f0ede8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {f.mimetype.startsWith('image') ? <span style={{ fontSize: 18 }}>🖼️</span> : <FileText size={16} color="#888" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                  <div style={{ fontSize: 11, color: '#bbb' }}>{(f.size / 1024).toFixed(1)} KB · {new Date(f.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser]         = useState<UserType | null>(getStoredUser);
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType | null>(null);
  const [messages, setMessages]               = useState<Message[]>([]);
  const [chatHistory, setChatHistory]         = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [inputText, setInputText]             = useState('');
  const [isTyping, setIsTyping]               = useState(false);
  const [showChat, setShowChat]               = useState(false);
  const [charCount, setCharCount]             = useState(0);
  const [loadingHistory, setLoadingHistory]   = useState(false);
  const [dbStatus, setDbStatus]               = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [memoryCount, setMemoryCount]         = useState(0);
  const [sidebarPanel, setSidebarPanel]       = useState<SidebarPanel>(null);
  const [isRecording, setIsRecording]         = useState(false);
  const fileInputRef                          = useRef<HTMLInputElement>(null);
  const messagesEndRef                        = useRef<HTMLDivElement>(null);
  const recognitionRef                        = useRef<any>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  useEffect(() => { if (!currentUser) return; checkDbHealth().then(ok => setDbStatus(ok ? 'ok' : 'error')); }, [currentUser]);

  const currentP = selectedPersonality ? personalities.find(p => p.id === selectedPersonality)! : null;

  // ── Voice input ───────────────────────────────────────────
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Voice not supported in this browser'); return; }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (e: Event) => {
      const speechEvent = e as unknown as { results: { [key: number]: { [key: number]: { transcript: string } } } };
      const transcript = speechEvent.results[0][0].transcript;
      setInputText(prev => prev + transcript);
      setCharCount(prev => prev + transcript.length);
      toast.success('Voice captured!', { style: { background: '#10b981', color: '#fff', border: 'none', borderRadius: '10px' } });
    };
    rec.onerror = () => { toast.error('Voice error — try again'); setIsRecording(false); };
    rec.onend = () => setIsRecording(false);
    rec.start();
    recognitionRef.current = rec;
    setIsRecording(true);
  };

  // ── File attach ───────────────────────────────────────────
  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    toast.loading(`Uploading ${file.name}...`);
    const ok = await uploadFile(currentUser.id, file);
    toast.dismiss();
    if (ok) {
      toast.success(`${file.name} uploaded & saved! 📎`);
      setInputText(prev => prev + ` [File attached: ${file.name}]`);
    } else {
      toast.error('Upload failed');
    }
  };

  const handleLogin = (user: UserType) => setCurrentUser(user);
  const handleLogout = () => { clearUser(); setCurrentUser(null); setShowChat(false); setSelectedPersonality(null); setMessages([]); setChatHistory([]); };

  const handleSelect = async (id: PersonalityType) => {
    const p = personalities.find(p => p.id === id)!;
    setSelectedPersonality(id); setShowChat(true); setLoadingHistory(true);
    toast.success(`Switched to ${p.emoji} ${p.name}!`, { style: { background: p.color, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 600 } });
    const history = await loadHistory(currentUser!.id, id);
    setLoadingHistory(false); setMemoryCount(history.length);
    if (history.length > 0) {
      setMessages(history.map((h, i) => ({ id: `r_${i}`, text: h.content, sender: h.role === 'user' ? 'user' : 'bot', timestamp: new Date(), personality: id })));
      setChatHistory(history);
      toast.success(`📂 Loaded ${history.length} saved messages!`, { style: { background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px' } });
    } else {
      setMessages([{ id: Date.now().toString(), text: greetings[id], sender: 'bot', timestamp: new Date(), personality: id }]);
      setChatHistory([]);
    }
  };

  const handleBack = () => { setShowChat(false); setSelectedPersonality(null); setMessages([]); setChatHistory([]); };

  const clearChat = async () => {
    if (!selectedPersonality || !currentUser) return;
    try { await fetch(`/api/messages?userId=${currentUser.id}&personality=${selectedPersonality}`, { method: 'DELETE' }); } catch { }
    setMemoryCount(0);
    setMessages([{ id: Date.now().toString(), text: greetings[selectedPersonality], sender: 'bot', timestamp: new Date(), personality: selectedPersonality }]);
    setChatHistory([]);
    toast.success('Chat cleared!');
  };

  const copyMessage = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };
  const likeMessage = (id: string, type: 'like' | 'dislike') => setMessages(prev => prev.map(m => m.id === id ? { ...m, liked: type === 'like', disliked: type === 'dislike' } : m));

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if (!text || !selectedPersonality || isTyping || !currentUser) return;
    const p = personalities.find(p => p.id === selectedPersonality)!;
    setMessages(prev => [...prev, { id: Date.now().toString(), text, sender: 'user', timestamp: new Date(), personality: selectedPersonality }]);
    setInputText(''); setCharCount(0); setIsTyping(true);
    const newHist = [...chatHistory, { role: 'user' as const, content: text }];
    setChatHistory(newHist);
    saveMessage(currentUser.id, selectedPersonality, 'user', text);
    try {
      const reply = await callGroq(p.systemPrompt, newHist);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: reply, sender: 'bot', timestamp: new Date(), personality: selectedPersonality }]);
      const updated = [...newHist, { role: 'assistant' as const, content: reply }];
      setChatHistory(updated); setMemoryCount(updated.length);
      saveMessage(currentUser.id, selectedPersonality, 'assistant', reply);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), text: `⚠️ ${msg}`, sender: 'bot', timestamp: new Date(), personality: selectedPersonality }]);
      toast.error('API error — check your Groq key');
    } finally { setIsTyping(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const togglePanel = (p: SidebarPanel) => setSidebarPanel(prev => prev === p ? null : p);

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#f0ede8', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      <Toaster position="bottom-center" />

      {/* SIDEBAR */}
      <aside style={{ width: 64, background: '#1a1a1a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '18px 0', gap: 4, flexShrink: 0, zIndex: 30, boxShadow: '2px 0 20px rgba(0,0,0,0.15)' }}>
        {/* Logo */}
        <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14, cursor: 'pointer', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>🤖</div>

        {/* Home */}
        {[
          { icon: Home,    tip: 'Home',         action: () => { setShowChat(false); setSidebarPanel(null); } },
          { icon: Search,  tip: 'Search',        action: () => togglePanel('search') },
          { icon: History, tip: 'Chat History',  action: () => togglePanel('history') },
          { icon: Paperclip, tip: 'Files',       action: () => togglePanel('files') },
          { icon: Clock,   tip: 'Recent',        action: () => togglePanel('history') },
        ].map(({ icon: Icon, tip, action }, i) => (
          <button key={i} title={tip} onClick={action}
            style={{ width: 40, height: 40, background: 'transparent', border: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2e2e2e'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#666'; }}>
            <Icon size={18} />
          </button>
        ))}

        {/* Bottom: logout + avatar */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button onClick={handleLogout} title="Logout" style={{ width: 36, height: 36, background: 'transparent', border: 'none', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#666', transition: 'all 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}>
            <LogOut size={16} />
          </button>
          <div title={currentUser.name} style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(236,72,153,0.4)' }}>
            {currentUser.avatar}
          </div>
        </div>
      </aside>

      {/* SIDEBAR PANEL (search / history / files) */}
      {sidebarPanel && (
        <SidebarPanelView
          panel={sidebarPanel}
          userId={currentUser.id}
          onSelectPersonality={handleSelect}
          onClose={() => setSidebarPanel(null)}
        />
      )}

      {/* MAIN — shifts right when panel open */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', marginLeft: sidebarPanel ? 300 : 0, transition: 'margin-left 0.25s ease' }}>

        {/* TOPBAR */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 28px', background: 'rgba(240,237,232,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e0ddd8', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e0ddd8', borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <span>⚙️</span><span>PersonaBot v2.0</span><span style={{ color: '#bbb', fontSize: 10 }}>▾</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>Daily PersonaBot</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div title={dbStatus === 'ok' ? 'Database connected' : 'Database offline'} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: dbStatus === 'ok' ? '#10b981' : dbStatus === 'error' ? '#ef4444' : '#aaa', cursor: 'help' }}>
              <Database size={13} />
              <span style={{ fontWeight: 500 }}>{dbStatus === 'ok' ? 'DB Online' : dbStatus === 'error' ? 'DB Offline' : 'Checking...'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#666' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
              <span style={{ fontWeight: 500 }}>Groq Online</span>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

          {/* HOME */}
          {!showChat && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px 24px' }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 44 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 54, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-1.5px', margin: 0 }}>
                      Hi {currentUser.name}, <span style={{ color: '#aaa8a2' }}>Ready to</span>
                      <br />Chat &amp; Achieve
                      <br />Great Things?
                    </h2>
                    <p style={{ marginTop: 16, color: '#888', fontSize: 15, maxWidth: 420, lineHeight: 1.6 }}>
                      Pick a personality and start chatting — powered by Groq's ultra-fast LLaMA 3.3 with persistent memory.
                    </p>
                  </div>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 116, height: 116, background: '#1a1a1a', borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, animation: 'floatBot 3s ease-in-out infinite', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>🤖</div>
                    <div style={{ position: 'absolute', bottom: -4, right: -130, background: '#fff', border: '1.5px solid #e8e5e0', borderRadius: 14, padding: '10px 14px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>Hey there! 👋 Pick a personality!</div>
                    <div style={{ position: 'absolute', inset: -8, borderRadius: 34, border: '2px solid rgba(124,58,237,0.2)', animation: 'pulse 2s ease-in-out infinite' }} />
                  </div>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Groq LLaMA 3.3', icon: '⚡', color: '#f97316' },
                    { label: 'Vercel Hosted',   icon: '▲', color: '#000' },
                    { label: 'Neon Memory',     icon: '🗄️', color: '#00e599' },
                    { label: 'Free & Fast',     icon: '🚀', color: '#8b5cf6' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid #e8e5e0', borderRadius: 12, padding: '8px 14px', fontSize: 12, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', color: s.color }}>
                      <span>{s.icon}</span><span>{s.label}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: `1px solid ${dbStatus === 'ok' ? '#10b981' : '#e8e5e0'}`, borderRadius: 12, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: dbStatus === 'ok' ? '#10b981' : '#aaa' }}>
                    {dbStatus === 'ok' ? <CheckCircle size={13} /> : dbStatus === 'error' ? <XCircle size={13} color="#ef4444" /> : <Database size={13} />}
                    <span>{dbStatus === 'ok' ? 'Memory Active' : dbStatus === 'error' ? 'Memory Offline' : 'Checking...'}</span>
                  </div>
                </div>

                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', color: '#aaa', marginBottom: 18, textTransform: 'uppercase' }}>Choose your personality</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
                  {personalities.map((p, i) => <PersonalityCard key={p.id} personality={p} isActive={selectedPersonality === p.id} onClick={() => handleSelect(p.id)} delay={i * 70} />)}
                </div>
              </div>
            </div>
          )}

          {/* CHAT */}
          {showChat && currentP && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 28px', background: '#fff', borderBottom: '1px solid #e8e5e0', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 46, height: 46, background: currentP.gradient, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: `0 4px 14px ${currentP.color}40` }}>{currentP.emoji}</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700 }}>{currentP.name}</div>
                  <div style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={11} style={{ color: currentP.color }} /> Groq LLaMA 3.3
                    {memoryCount > 0 && <span style={{ background: `${currentP.color}22`, color: currentP.color, borderRadius: 20, padding: '1px 8px', fontWeight: 600, fontSize: 11 }}>💾 {memoryCount} saved</span>}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={clearChat} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fee2e2', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#ef4444' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fecaca')} onMouseLeave={e => (e.currentTarget.style.background = '#fee2e2')}>
                    <Trash2 size={13} /> Clear
                  </button>
                  <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0ede8', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#555' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e8e5e0')} onMouseLeave={e => (e.currentTarget.style.background = '#f0ede8')}>
                    <ArrowLeft size={13} /> Back
                  </button>
                </div>
              </div>

              {loadingHistory && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: '#aaa', fontSize: 13, gap: 8 }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${currentP.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Loading saved conversation...
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeUp 0.3s ease' }}>
                    {msg.sender === 'bot' && <div style={{ width: 32, height: 32, background: currentP.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginRight: 10, flexShrink: 0, alignSelf: 'flex-end' }}>{currentP.emoji}</div>}
                    <div style={{ maxWidth: '66%' }}>
                      <div style={{ padding: '12px 16px', fontSize: 14, lineHeight: 1.7, borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.sender === 'user' ? `linear-gradient(135deg, ${currentP.color}, ${currentP.color}dd)` : '#fff', color: msg.sender === 'user' ? '#fff' : '#222', border: msg.sender === 'bot' ? '1px solid #e8e5e0' : 'none', boxShadow: msg.sender === 'user' ? `0 4px 16px ${currentP.color}40` : '0 2px 8px rgba(0,0,0,0.06)', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, paddingInline: 4, justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                        <span style={{ fontSize: 10, color: '#bbb' }}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.sender === 'bot' && (<>
                          <button onClick={() => copyMessage(msg.text)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: 2, display: 'flex' }} title="Copy"><Copy size={11} /></button>
                          <button onClick={() => likeMessage(msg.id, 'like')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: msg.liked ? '#10b981' : '#ccc', padding: 2, display: 'flex' }}><ThumbsUp size={11} /></button>
                          <button onClick={() => likeMessage(msg.id, 'dislike')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: msg.disliked ? '#ef4444' : '#ccc', padding: 2, display: 'flex' }}><ThumbsDown size={11} /></button>
                        </>)}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, animation: 'fadeUp 0.3s ease' }}>
                    <div style={{ width: 32, height: 32, background: currentP.gradient, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{currentP.emoji}</div>
                    <div style={{ padding: '12px 18px', background: '#fff', border: '1px solid #e8e5e0', borderRadius: '18px 18px 18px 4px', display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0, 150, 300].map((d, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: currentP.color, animation: `typingBounce 1.2s ${d}ms infinite` }} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM INPUT */}
        <div style={{ background: 'rgba(240,237,232,0.97)', backdropFilter: 'blur(10px)', borderTop: '1px solid #e0ddd8', padding: '14px 28px 18px', flexShrink: 0 }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 10 }}>
              <span>✦ {selectedPersonality ? `Chatting with ${currentP?.emoji} ${currentP?.name}` : 'Pick a personality above to start chatting'}</span>
              <span>⚡ Groq · 🗄️ Neon · ▲ Vercel</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {/* File attach */}
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileAttach} accept=".txt,.pdf,.png,.jpg,.jpeg,.doc,.docx" />
              <button onClick={() => fileInputRef.current?.click()} title="Attach file" style={{ width: 40, height: 40, background: '#fff', border: '1.5px solid #e0ddd8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#888', flexShrink: 0, transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#1a1a1a')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#e0ddd8')}>
                <Paperclip size={18} />
              </button>

              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: `2px solid ${inputText ? (currentP?.color || '#1a1a1a') : '#e0ddd8'}`, borderRadius: 28, padding: '10px 12px 10px 20px', transition: 'border-color 0.2s', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
                <input value={inputText} onChange={e => { setInputText(e.target.value); setCharCount(e.target.value.length); }} onKeyDown={handleKey}
                  placeholder='Example: "Tell me something interesting..."'
                  disabled={!selectedPersonality || isTyping}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: '#222', fontFamily: "'DM Sans', sans-serif" }} />
                {charCount > 0 && <span style={{ fontSize: 11, color: '#ccc', flexShrink: 0 }}>{charCount}</span>}
                {/* Voice input */}
                <button onClick={toggleVoice} title={isRecording ? 'Stop recording' : 'Start voice input'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isRecording ? '#ef4444' : '#bbb', display: 'flex', alignItems: 'center', transition: 'color 0.2s', animation: isRecording ? 'pulse 1s infinite' : 'none' }}>
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              </div>

              <button onClick={() => handleSend()} disabled={!inputText.trim() || !selectedPersonality || isTyping}
                style={{ width: 44, height: 44, background: currentP ? currentP.color : '#1a1a1a', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0, transition: 'all 0.2s', opacity: (!inputText.trim() || !selectedPersonality || isTyping) ? 0.4 : 1, boxShadow: currentP ? `0 4px 16px ${currentP.color}60` : 'none' }}>
                <Send size={17} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {quickActions.map((a, i) => (
                <button key={i} onClick={() => { if (!selectedPersonality) { toast.error('Pick a personality first!'); return; } handleSend(a.prompt); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.2s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = currentP?.color || '#333'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a1a'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                  <a.icon size={14} />{a.label}
                </button>
              ))}
              <button style={{ display: 'flex', alignItems: 'center', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 14px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#333')} onMouseLeave={e => (e.currentTarget.style.background = '#1a1a1a')}>
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;800;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; width: 100%; overflow: hidden; }
        @keyframes floatBot { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes typingBounce { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-7px); } }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(1); } 50% { opacity:0.8; transform:scale(1.05); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d8d5d0; border-radius: 4px; }
      `}</style>
    </div>
  );
}

function PersonalityCard({ personality, isActive, onClick, delay }: { personality: Personality; isActive: boolean; onClick: () => void; delay: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: isActive ? personality.gradient : hovered ? '#fafaf8' : '#fff', border: `2px solid ${isActive ? personality.color : hovered ? personality.color : '#e8e5e0'}`, borderRadius: 20, padding: '26px 22px', cursor: 'pointer', transition: 'all 0.25s', transform: hovered && !isActive ? 'translateY(-4px)' : 'none', boxShadow: isActive ? `0 8px 32px ${personality.color}30` : hovered ? '0 12px 36px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)', animation: `fadeUp 0.4s ease ${delay}ms both`, position: 'relative', overflow: 'hidden' }}>
      {isActive && <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: '50%', background: personality.color, boxShadow: `0 0 8px ${personality.color}` }} />}
      <div style={{ fontSize: 34, marginBottom: 16 }}>{personality.emoji}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 7, color: '#1a1a1a' }}>{personality.name}</div>
      <div style={{ fontSize: 13, color: '#777', lineHeight: 1.55, marginBottom: 16 }}>{personality.description}</div>
      <div style={{ display: 'inline-flex', fontSize: 12, fontWeight: 600, padding: '5px 13px', borderRadius: 20, background: isActive ? `${personality.color}22` : '#f0ede8', color: isActive ? personality.color : '#888', border: `1px solid ${isActive ? personality.color + '44' : 'transparent'}` }}>{personality.tag}</div>
    </div>
  );
}