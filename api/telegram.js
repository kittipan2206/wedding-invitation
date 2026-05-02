const GAS_URL =
  'https://script.google.com/macros/s/AKfycbx3xzXnYpTqjmhY7MjYrgQ03c_9TvtNgYtiP_afh9VbOTDt6E_8As_u32FSX7yKAoQG/exec';

const SECRET = process.env.TELEGRAM_SECRET_TOKEN || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (SECRET) {
    const token = req.headers['x-telegram-bot-api-secret-token'];
    if (token !== SECRET) return res.status(401).end();
  }

  await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
    redirect: 'follow',
  });

  res.status(200).json({ ok: true });
}
