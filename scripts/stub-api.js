const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

// Rely on CORS middleware to handle preflight requests

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', stub: true, timestamp: Date.now() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', stub: true });
});

app.get('/api/auth/context', (req, res) => {
  res.json({
    user: { id: uuidv4(), email: 'stub@example.com', type: 'admin' },
    organizations: [],
    clubs: [],
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ id: uuidv4(), email: 'stub@example.com', name: 'Stub User' });
});

app.post('/api/groups', (req, res) => {
  const { name = 'New Org (stub)', sport = 'Football' } = req.body || {};
  const org = {
    id: uuidv4(),
    name,
    sport,
    user_role: 'owner',
    created_at: new Date().toISOString(),
  };
  res.status(201).json(org);
});

app.get('/api/feed', (req, res) => res.json({ activity: [] }));
app.get('/api/notifications', (req, res) => res.json([]));
app.get('/api/clubs', (req, res) => res.json([]));
app.get('/api/payments/config', (req, res) => res.json({ stripe_configured: false }));

app.use((req, res) => {
  res.status(404).json({ error: 'Stub: Not found', path: req.path });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Stub API listening on http://0.0.0.0:${PORT}`);
});
