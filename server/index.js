const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
  console.log('WebSocket client connected');
  ws.send(JSON.stringify({info: 'connected'}));
});

// POST /notify { message: string, source?: string }
app.post('/notify', (req, res) => {
  const { message, source } = req.body || {};
  if (!message) return res.status(400).json({ error: 'missing message' });

  const payload = JSON.stringify({ message, source: source || 'unknown' });
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(payload);
  });
  console.log('Broadcasted notification:', payload);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Notification bridge listening on http://localhost:${PORT}`));
