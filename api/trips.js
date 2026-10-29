// Trip list for the home page. Notion 「여행 기록」 DB is the source; src/trips.json only says which trips have a web page.
import { notion, session, json } from './_lib.js';
import PAGES from '../src/trips.json' with { type: 'json' };

const txt = p => ((p && (p.rich_text || p.title)) || []).map(x => x.plain_text).join('');
const norm = id => String(id || '').replace(/-/g, '');
let cache = { t: 0, data: null };

function fromStatic() {
  return PAGES.map(p => ({ id: p.notionId, key: p.key, color: p.color, ...p.fallback }));
}

async function fromNotion(ds) {
  let rows = [], cursor;
  do {
    const j = await notion(`/data_sources/${ds}/query`, { method: 'POST', body: { page_size: 100, start_cursor: cursor } });
    rows = rows.concat(j.results.filter(r => !r.in_trash && !r.archived));
    cursor = j.has_more ? j.next_cursor : null;
  } while (cursor);
  return rows.map(r => {
    const p = r.properties, cfg = PAGES.find(x => norm(x.notionId) === norm(r.id)) || {};
    const d = p['날짜']?.date || {};
    return { id: r.id, key: cfg.key || null, color: cfg.color || null,
      title: txt(p['Name']) || cfg.fallback?.title || '여행', place: txt(p['여행지']), status: p['상태']?.select?.name || '',
      start: d.start || '', end: d.end || d.start || '', oneLine: txt(p['한줄기록']),
      emoji: r.icon?.type === 'emoji' ? r.icon.emoji : (cfg.fallback?.emoji || '✈️') };
  }).filter(t => t.status !== '취소');
}

export default async function handler(req, res) {
  if (!session(req)) return json(res, 401, { error: 'login' });
  const ds = process.env.NOTION_TRIPS_DATA_SOURCE_ID;
  if (!ds) return json(res, 200, { trips: fromStatic(), source: 'static' });
  try {
    if (!cache.data || Date.now() - cache.t > 60000) cache = { t: Date.now(), data: await fromNotion(ds) };
    json(res, 200, { trips: cache.data, source: 'notion' });
  } catch (e) {
    json(res, 200, { trips: fromStatic(), source: 'static', note: e.message });
  }
}
