import crypto from 'node:crypto';
import { makeCookie, json, readJson } from './_lib.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  const { password = '', who = '윤재' } = await readJson(req).catch(() => ({}));
  const want = Buffer.from(process.env.APP_PASSWORD || ''), got = Buffer.from(String(password));
  const ok = want.length > 0 && want.length === got.length && crypto.timingSafeEqual(want, got);
  if (!ok) { await new Promise(r => setTimeout(r, 600)); return json(res, 401, { ok: false }); }
  res.setHeader('Set-Cookie', makeCookie(who === '희주' ? '희주' : '윤재'));
  json(res, 200, { ok: true });
}
