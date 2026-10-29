// Visit log: one row in Notion 「👀 접속 기록」 per person + page, at most once every 30 minutes.
import { notion, session, json, readJson, VISITS_DS, rt } from './_lib.js';

const seen = new Map();
const LABEL = { '홈': '홈', 'hongkong-2026': '홍콩 여행' };
const device = ua => /iPad|Tablet/i.test(ua) ? '태블릿' : /Mobi|Android|iPhone/i.test(ua) ? '휴대폰' : '컴퓨터';
function browser(ua) {
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : '';
  const br = /KAKAOTALK/i.test(ua) ? '카카오톡' : /NAVER/i.test(ua) ? '네이버' : /SamsungBrowser/.test(ua) ? '삼성 인터넷' : /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : '기타';
  return [os, br].filter(Boolean).join(' · ');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  const s = session(req);
  if (!s) return json(res, 401, { error: 'login' });
  const b = await readJson(req).catch(() => ({}));
  const page = /^[a-z0-9-]{2,40}$/.test(String(b.page || '')) ? b.page : '홈';
  const key = s.who + '|' + page, now = Date.now();
  if (!b.login && seen.has(key) && now - seen.get(key) < 30 * 60 * 1000) return json(res, 200, { ok: true, skipped: true });
  seen.set(key, now);
  const ua = String(req.headers['user-agent'] || '');
  try {
    await notion('/pages', { method: 'POST', body: { parent: { type: 'data_source_id', data_source_id: VISITS_DS() }, properties: {
      '제목': { title: rt(`${s.who} · ${LABEL[page] || page}`) },
      '사람': { select: { name: s.who } }, '페이지': { select: { name: page } },
      '기기': { select: { name: device(ua) } }, '브라우저': { rich_text: rt(browser(ua)) }, '로그인': { checkbox: !!b.login } } } });
    json(res, 200, { ok: true });
  } catch (e) { json(res, 200, { ok: false }); }
}
