const baseUrl = window.location.origin;

async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

// ---------- Endpoints ----------
async function loadEndpoints() {
  const endpoints = await api('/endpoints');
  const list = document.getElementById('endpointsList');
  const filter = document.getElementById('filterEndpoint');

  // Update filter dropdown
  const currentFilter = filter.value;
  filter.innerHTML = '<option value="">All endpoints</option>';
  endpoints.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.id;
    opt.textContent = e.name;
    filter.appendChild(opt);
  });
  filter.value = currentFilter;

  if (endpoints.length === 0) {
    list.innerHTML = '<p class="empty">No endpoints yet. Create one above.</p>';
    return;
  }

  list.innerHTML = endpoints.map(e => {
    const url = `${baseUrl}/hook/${e.key}`;
    return `
      <div class="endpoint-card" data-id="${e.id}">
        <div class="endpoint-info">
          <h3>${escapeHtml(e.name)}</h3>
          <div class="endpoint-url">${url}</div>
          <div class="endpoint-meta">
            ${e.requestCount} request${e.requestCount !== 1 ? 's' : ''} • Created ${formatTime(e.createdAt)}
          </div>
        </div>
        <div class="endpoint-actions">
          <button class="copy-btn" data-url="${url}">Copy URL</button>
          <button class="delete-btn" data-id="${e.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach listeners
  list.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.url);
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy URL', 1500);
    });
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this endpoint and its logs?')) return;
      await api(`/endpoints/${btn.dataset.id}`, { method: 'DELETE' });
      await loadEndpoints();
      await loadLogs();
    });
  });
}

// ---------- Logs ----------
async function loadLogs() {
  const endpointId = document.getElementById('filterEndpoint').value;
  const query = endpointId ? `?endpointId=${endpointId}` : '';
  const logs = await api(`/logs${query}`);
  const list = document.getElementById('logsList');

  if (logs.length === 0) {
    list.innerHTML = '<p class="empty">No requests received yet.</p>';
    return;
  }

  list.innerHTML = logs.map(log => `
    <div class="log-card" data-log='${escapeHtml(JSON.stringify(log))}'>
      <div>
        <span class="log-method ${log.method}">${log.method}</span>
        <span class="log-summary">${escapeHtml(log.endpointName)}</span>
        <div class="log-time">${formatTime(log.receivedAt)} • ${log.ip || 'unknown IP'}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.log-card').forEach(card => {
    card.addEventListener('click', () => {
      const log = JSON.parse(card.dataset.log);
      showModal(log);
    });
  });
}

function showModal(log) {
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent =
    `${log.method} → ${log.endpointName} @ ${formatTime(log.receivedAt)}`;

  const pretty = {
    method: log.method,
    ip: log.ip,
    receivedAt: log.receivedAt,
    headers: log.headers,
    query: log.query,
    body: log.body
  };

  document.getElementById('modalBody').textContent = JSON.stringify(pretty, null, 2);
  modal.classList.remove('hidden');
}

// ---------- Events ----------
document.getElementById('createBtn').addEventListener('click', async () => {
  const input = document.getElementById('endpointName');
  const name = input.value.trim();
  if (!name) return alert('Please enter a name');

  try {
    await api('/endpoints', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    input.value = '';
    await loadEndpoints();
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById('endpointName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('createBtn').click();
});

document.getElementById('filterEndpoint').addEventListener('change', loadLogs);

document.getElementById('clearLogsBtn').addEventListener('click', async () => {
  const endpointId = document.getElementById('filterEndpoint').value;
  const msg = endpointId
    ? 'Clear logs for this endpoint?'
    : 'Clear ALL logs?';
  if (!confirm(msg)) return;

  const query = endpointId ? `?endpointId=${endpointId}` : '';
  await api(`/logs${query}`, { method: 'DELETE' });
  await loadLogs();
  await loadEndpoints(); // refresh request counts
});

document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('modal').classList.add('hidden');
});

document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') {
    document.getElementById('modal').classList.add('hidden');
  }
});

// Auto-refresh logs every 5 seconds
setInterval(loadLogs, 5000);

// Initial load
loadEndpoints();
loadLogs();
