import { session, json } from './_lib.js';
export default function handler(req, res) {
  const s = session(req);
  if (!s) return json(res, 401, { ok: false });
  json(res, 200, { ok: true, who: s.who });
}
