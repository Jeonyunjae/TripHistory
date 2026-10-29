// POST: upload one JPEG (already resized in the browser) to Notion and create a 「사진」 row.
// GET ?id=: redirect to a fresh Notion file URL (Notion file links expire after about an hour).
import { notion, session, json, readRaw, DS, P, KIND, TRIP, rt } from './_lib.js';

export const config = { api: { bodyParser: false } };
const MAX = 4.3 * 1024 * 1024; // under Vercel's 4.5 MB request limit and Notion free plan's 5 MiB per file

export default async function handler(req, res) {
  const s = session(req);
  if (!s) return json(res, 401, { error: 'login' });
  try {
    if (req.method === 'POST') {
      const buf = await readRaw(req, MAX);
      const up = await notion('/file_uploads', { method: 'POST', body: { filename: 'photo.jpg', content_type: 'image/jpeg' } });
      const fd = new FormData();
      fd.append('file', new Blob([buf], { type: 'image/jpeg' }), 'photo.jpg');
      await notion(`/file_uploads/${up.id}/send`, { method: 'POST', body: fd });
      const pg = await notion('/pages', { method: 'POST', body: { parent: { type: 'data_source_id', data_source_id: DS() }, properties: {
        [P.title]: { title: rt('사진') }, [P.kind]: { select: { name: KIND.photo } }, [P.trip]: { select: { name: TRIP() } },
        [P.who]: { select: { name: s.who } }, [P.photo]: { files: [{ type: 'file_upload', file_upload: { id: up.id }, name: 'photo.jpg' }] } } } });
      return json(res, 200, { id: pg.id });
    }
    if (req.method === 'GET') {
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      if (!id) return json(res, 400, { error: 'id' });
      const pg = await notion(`/pages/${id}`);
      const f = (pg.properties[P.photo]?.files || [])[0];
      const url = f && (f.file?.url || f.external?.url);
      if (!url) return json(res, 404, { error: 'no photo' });
      res.statusCode = 302; res.setHeader('Location', url); res.setHeader('Cache-Control', 'private, max-age=1800'); return res.end();
    }
    json(res, 405, { error: 'method' });
  } catch (e) { json(res, e.status === 413 ? 413 : e.status && e.status < 500 ? e.status : 502, { error: e.message }); }
}
