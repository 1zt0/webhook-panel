const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ endpoints: {}, logs: [] }, null, 2));
}

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Parse all body types
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(bodyParser.text({ type: '*/*', limit: '10mb' }));

// Serve static panel
app.use(express.static(path.join(__dirname, 'public')));

// API: List all endpoints
app.get('/api/endpoints', (req, res) => {
  const data = loadData();
  const list = Object.values(data.endpoints).map(e => ({
    id: e.id,
    name: e.name,
    key: e.key,
    createdAt: e.createdAt,
    requestCount: data.logs.filter(l => l.endpointId === e.id).length
  }));
  res.json(list);
});

// API: Create endpoint
app.post('/api/endpoints', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const data = loadData();
  const id = uuidv4();
  const key = uuidv4().replace(/-/g, '').slice(0, 16);

  data.endpoints[id] = {
    id,
    name: name.trim(),
    key,
    createdAt: new Date().toISOString()
  };

  saveData(data);
  res.json(data.endpoints[id]);
});

// API: Delete endpoint
app.delete('/api/endpoints/:id', (req, res) => {
  const data = loadData();
  if (!data.endpoints[req.params.id]) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  delete data.endpoints[req.params.id];
  // Also remove related logs
  data.logs = data.logs.filter(l => l.endpointId !== req.params.id);
  saveData(data);
  res.json({ success: true });
});

// API: Get logs (optionally filter by endpoint)
app.get('/api/logs', (req, res) => {
  const data = loadData();
  let logs = data.logs;

  if (req.query.endpointId) {
    logs = logs.filter(l => l.endpointId === req.query.endpointId);
  }

  // newest first, limit 200
  logs = logs.slice(-200).reverse();
  res.json(logs);
});

// API: Clear logs
app.delete('/api/logs', (req, res) => {
  const data = loadData();
  if (req.query.endpointId) {
    data.logs = data.logs.filter(l => l.endpointId !== req.query.endpointId);
  } else {
    data.logs = [];
  }
  saveData(data);
  res.json({ success: true });
});

// The actual webhook receiver
app.all('/hook/:key', (req, res) => {
  const data = loadData();
  const endpoint = Object.values(data.endpoints).find(e => e.key === req.params.key);

  if (!endpoint) {
    return res.status(404).json({ error: 'Webhook not found' });
  }

  const logEntry = {
    id: uuidv4(),
    endpointId: endpoint.id,
    endpointName: endpoint.name,
    method: req.method,
    headers: req.headers,
    query: req.query,
    body: req.body,
    ip: req.ip || req.connection.remoteAddress,
    receivedAt: new Date().toISOString()
  };

  data.logs.push(logEntry);
  // Keep only last 1000 logs total
  if (data.logs.length > 1000) {
    data.logs = data.logs.slice(-1000);
  }
  saveData(data);

  res.status(200).json({ received: true, id: logEntry.id });
});

// Fallback for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  Webhook Panel running at http://localhost:${PORT}`);
  console.log(`  Create endpoints in the panel and use /hook/<key>\n`);
});
