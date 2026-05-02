export default async function handler(req, res) {
  const { id } = req.query;

  // Validate: only alphanumeric + dash/underscore (Google Drive file IDs)
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
    return res.status(400).end('Invalid id');
  }

  const driveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;

  try {
    const upstream = await fetch(driveUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
    });

    if (!upstream.ok) {
      return res.status(upstream.status).end('Upstream error');
    }

    const contentType = upstream.headers.get('content-type') || 'audio/mpeg';

    // Security: only proxy audio or generic binary content, reject HTML
    if (
      !contentType.startsWith('audio/') &&
      !contentType.startsWith('video/') &&
      contentType !== 'application/octet-stream'
    ) {
      return res.status(400).end('Not an audio file — check file permissions or sharing settings');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');

    const cl = upstream.headers.get('content-length');
    if (cl) res.setHeader('Content-Length', cl);

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    if (!res.headersSent) res.status(500).end(err.message);
  }
}
