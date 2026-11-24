const http = require('http');
const cache = new Map();
let busy = false;
let lastRequest = 0;

http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const send = (status, data) => {
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };

  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/')
    return send(200, {status: 'online'});

  if (url.pathname !== '/video-stats')
    return send(404, {error: 'Not found'});

  const id = url.searchParams.get('videoId');

  if (!id || !/^\d{15,22}$/.test(id))
    return send(400, {error: 'Invalid video ID'});

  const saved = cache.get(id);
  if (saved && Date.now() - saved.time < 60000)
    return send(200, saved.data);

  if (!process.env.FETCHLAYER_API_KEY)
    return send(503, {error: 'API key missing'});

  if (busy || Date.now() - lastRequest < 60000)
    return send(429, {error: 'Please wait'});

  busy = true;
  lastRequest = Date.now();

  try {
    const response = await fetch(
  "https://api.fetchlayer.dev/tiktok/video-detail",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + process.env.FETCHLAYER_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      video: String(id),
      include: ["exactStats"]
    })
  }
);
if (!response.ok)
      return send(response.status, {error: 'Provider request failed'});

    const raw = await response.json();
    const v = raw.video || raw.data || raw;

    const data = {
      videoId: id,
      views: v.exactStats?.playCount,
      likes: v.exactStats?.diggCount,
      comments: v.exactStats?.commentCount,
      shares: v.exactStats?.shareCount,
      title: v.description,
      coverUrl: v.coverUrl,
      updatedAt: new Date().toISOString()
    };

    if (![data.views, data.likes, data.comments, data.shares].every(Number.isFinite))
      return send(502, {error: 'Invalid provider response'});

    cache.clear();
    cache.set(id, {time: Date.now(), data});
    send(200, data);
  } catch {
    send(502, {error: 'TikTok connection failed'});
  } finally {
    busy = false;
  }
}).listen(process.env.PORT || 10000, '0.0.0.0');
