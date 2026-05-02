const GAS_URL =
  'https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const resp = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'music_upload', ...req.body }),
    redirect: 'follow',
  });

  const body = await resp.text();
  if (!resp.ok) {
    console.error('GAS error', resp.status, body.slice(0, 500));
    return res.status(502).json({ error: 'GAS error', status: resp.status, detail: body.slice(0, 300) });
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    console.error('GAS invalid JSON', body.slice(0, 200));
    return res.status(502).json({ error: 'invalid GAS response', detail: body.slice(0, 200) });
  }

  res.status(200).json(data);
}
