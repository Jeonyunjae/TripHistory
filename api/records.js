// Memos, to-dos and photo records, stored as rows of the Notion 「기록」 database.
import { notion, session, json, readJson, DS, P, KIND, tripOf, rt } from './_lib.js';

const KINV = { '메모': 'note', '할 일': 'todo', '사진': 'photo' };
const txt = p => ((p && (p.rich_text || p.title)) || []).map(x => x.plain_text).join('');
const cache = {};

function toRecord(pg) {
  const p = pg.properties;
  return {
    id: pg.id, kind: KINV[p[P.kind]?.select?.name] || 'note', stopId: txt(p[P.stopId]), day: p[P.day]?.number || 0,
    text: txt(p[P.text]), done: !!p[P.done]?.checkbox, who: p[P.who]?.select?.name || '', at: Date.parse(pg.created_time) || 0,
  };
}

export async function listRecords(trip) {
  const c = cache[trip];
  if (c && Date.now() - c.t < 3000) return c.data;
  let out = [], cursor;
  do {
    const j = await notion(`/data_sources/${DS()}/query`, { method: 'POST', body: {
      page_size: 100, start_cursor: cursor, filter: { property: P.trip, select: { equals: trip } },
      sorts: [{ timestamp: 'created_time', direction: 'ascending' }] } });
    out = out.concat(j.results.filter(r => !r.in_trash && !r.archived).map(toRecord));
    cursor = j.has_more ? j.next_cursor : null;
  } while (cursor);
  cache[trip] = { t: Date.now(), data: out };
  return out;
}

export function buildProps(b, who, trip) {
  const o = {};
  if (b.kind) { o[P.kind] = { select: { name: KIND[b.kind] } }; o[P.trip] = { select: { name: trip } }; }
  if (b.kind || b.place != null || b.text != null) {
    const title = b.kind === 'todo' ? b.text : `${b.place || ''} ${b.kind === 'photo' ? '사진' : '메모'}`.trim();
    if (b.kind) o[P.title] = { title: rt(title || '기록') };
  }
  if (b.stopId != null) o[P.stopId] = { rich_text: rt(b.stopId) };
  if (b.place != null) o[P.place] = { rich_text: rt(b.place) };
  if (b.day != null) o[P.day] = { number: Number(b.day) || 0 };
  if (b.text != null) o[P.text] = { rich_text: rt(b.text) };
  if (b.done != null) o[P.done] = { checkbox: !!b.done };
  if (who) o[P.who] = { select: { name: who } };
  return o;
}

export default async function handler(req, res) {
  const s = session(req);
  if (!s) return json(res, 401, { error: 'login' });
  try {
    if (req.method === 'GET') return json(res, 200, { records: await listRecords(tripOf(req)) });
    if (req.method === 'POST') {
      const b = await readJson(req);
      if (!KIND[b.kind]) return json(res, 400, { error: 'kind' });
      const trip = tripOf(req, b);
      const pg = await notion('/pages', { method: 'POST', body: { parent: { type: 'data_source_id', data_source_id: DS() }, properties: buildProps(b, s.who, trip) } });
      delete cache[trip]; return json(res, 200, { id: pg.id });
    }
    if (req.method === 'PATCH') {
      const b = await readJson(req);
      if (!b.id) return json(res, 400, { error: 'id' });
      const { id, trip: _t, ...rest } = b; delete rest.kind;
      await notion(`/pages/${id}`, { method: 'PATCH', body: { properties: buildProps(rest, s.who) } });
      delete cache[tripOf(req, b)]; return json(res, 200, { ok: true });
    }
    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      if (!id) return json(res, 400, { error: 'id' });
      await notion(`/pages/${id}`, { method: 'PATCH', body: { in_trash: true } });
      delete cache[tripOf(req)]; return json(res, 200, { ok: true });
    }
    json(res, 405, { error: 'method' });
  } catch (e) { json(res, e.status && e.status < 500 ? e.status : 502, { error: e.message }); }
}
