// Shared helpers for the serverless API (Vercel Node functions, no dependencies).
import crypto from 'node:crypto';

const NOTION_VERSION = '2026-03-11';

export const DS = () => process.env.NOTION_DATA_SOURCE_ID;

export async function notion(path, { method = 'GET', body } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = { Authorization: `Bearer ${process.env.NOTION_TOKEN}`, 'Notion-Version': NOTION_VERSION };
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const r = await fetch('https://api.notion.com/v1' + path, { method, headers, body: isForm ? body : body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || `notion ${r.status}`); e.status = r.status; throw e; }
  return j;
}

const sign = v => crypto.createHmac('sha256', process.env.SESSION_SECRET || 'change-me').update(v).digest('base64url');

export function makeCookie(who) {
  const v = Buffer.from(JSON.stringify({ who, t: Date.now() })).toString('base64url');
  return `s=${v}.${sign(v)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 120}`;
}

export function session(req) {
  const m = /(?:^|;\s*)s=([^;]+)/.exec(req.headers.cookie || '');
  if (!m) return null;
  const [v, sig] = m[1].split('.');
  if (!v || !sig) return null;
  const a = Buffer.from(sign(v)), b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(v, 'base64url').toString()); } catch { return null; }
}

export function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

export async function readRaw(req, limit) {
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) { const e = new Error('too large'); e.status = 413; throw e; } chunks.push(c); }
  return Buffer.concat(chunks);
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const b = await readRaw(req, 1e6);
  return b.length ? JSON.parse(b.toString()) : {};
}

// Notion property names of the 「기록」 database
export const P = { title: '제목', kind: '종류', stopId: '장소ID', place: '장소', day: '일차', text: '내용', done: '완료', who: '작성자', photo: '사진', trip: '여행' };
export const KIND = { note: '메모', todo: '할 일', photo: '사진' };
export const TRIP = () => process.env.TRIP_KEY || 'hongkong-2026';
export const rt = s => [{ type: 'text', text: { content: String(s ?? '').slice(0, 2000) } }];
