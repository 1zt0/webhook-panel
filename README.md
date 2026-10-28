# Webhook Panel

**Build your own webhook receiver with a clean control panel.**

Create unique webhook endpoints, receive any HTTP requests, and inspect full payloads (headers, body, query, IP) in a simple dark-themed dashboard.

![Webhook Panel](https://img.shields.io/badge/Node.js-Express-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- ✨ Create named webhook endpoints with unique secret keys
- 📥 Receive GET / POST / PUT / DELETE (and any method)
- 📋 Full request inspection (headers, body, query params, IP)
- 📊 Request count per endpoint
- 🔄 Auto-refreshing logs (every 5s)
- 🗑️ Delete endpoints & clear logs
- 📁 Zero database — stores everything in a local `data.json`
- 🌐 Dark, modern UI

## Quick Start

```bash
git clone https://github.com/1zt0/webhook-panel.git
cd webhook-panel
npm install
npm start
```

Open **http://localhost:3000**

## Usage

1. Create an endpoint (e.g. "GitHub", "Stripe", "Discord")
2. Copy the generated URL: `http://localhost:3000/hook/<key>`
3. Point any service to that URL
4. Watch requests appear live in the panel
5. Click any request to see the full payload

### Example curl test

```bash
curl -X POST http://localhost:3000/hook/YOUR_KEY \
  -H "Content-Type: application/json" \
  -d '{"event": "test", "message": "Hello webhook!"}'
```

## Deploy

Works great on:

- Railway / Render / Fly.io
- VPS with PM2 or Docker
- Any Node.js host

Just set the `PORT` environment variable if needed.

```bash
# Example with PM2
npm install -g pm2
pm2 start server.js --name webhook-panel
```

## Project Structure

```
webhook-panel/
├── server.js          # Express backend + webhook receiver
├── package.json
├── data.json          # Auto-created storage (gitignored)
├── public/
│   ├── index.html    # Panel UI
│   ├── style.css
│   └── app.js
└── README.md
```

## License

MIT
