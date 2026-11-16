// Feedback notes from the game (the N key). Only the owner's browser holds the key, so only the owner can send one.
// Each note is kept privately in the project's Blob store: notes/<id>.json, and notes/<id>.jpg for the screenshot.
import { put } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const keyOk = k => {
  const want = process.env.FEEDBACK_KEY || '';
  if (!want || typeof k !== 'string' || k.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(k), Buffer.from(want));
};

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'post only' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (!keyOk(body.key)) return res.status(403).json({ error: 'not allowed' });
  delete body.key;
  const shot = body.screenshot; delete body.screenshot;
  const id = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17) + '-' + Math.random().toString(36).slice(2, 6);
  body.received = new Date().toISOString();
  if (typeof shot === 'string' && shot.startsWith('data:image/jpeg;base64,')){
    await put(`notes/${id}.jpg`, Buffer.from(shot.slice(shot.indexOf(',') + 1), 'base64'), { access: 'private', contentType: 'image/jpeg', addRandomSuffix: false });
    body.screenshotFile = `notes/${id}.jpg`;
  }
  await put(`notes/${id}.json`, JSON.stringify(body, null, 2), { access: 'private', contentType: 'application/json', addRandomSuffix: false });
  return res.status(200).json({ ok: true, id });
}
