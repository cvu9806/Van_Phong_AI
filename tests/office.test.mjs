import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createOffice } from '../server/office.mjs';
import { createApp } from '../server/app.mjs';

async function completed(office) {
  if (!['running', 'queued'].includes(office.snapshot().jobs[0]?.status)) return;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { office.events.off('change', check); reject(new Error('Job timeout')); }, 5000);
    function check() { if (!['running', 'queued'].includes(office.snapshot().jobs[0].status)) { clearTimeout(timeout); office.events.off('change', check); resolve(); } }
    office.events.on('change', check);
    check();
  });
}
test('demo executes all three agents in order', async () => {
  const office = createOffice({ dbPath: ':memory:', demoDelay: 1 });
  try {
    office.submit('Lên kế hoạch cho một cửa hàng sách');
    await completed(office);
    const job = office.snapshot().jobs[0];
    assert.equal(job.status, 'completed');
    assert.deepEqual(job.steps.map(s => s.agentId), ['manager', 'analyst', 'writer']);
    assert.ok(job.steps.every(s => s.text.includes('[Mô phỏng]')));
    assert.equal(job.currentAgent, null);
  } finally { office.close(); }
});
test('live adapter receives preceding outputs and never silently uses demo', async () => {
  const seen = [];
  const office = createOffice({ dbPath: ':memory:', generate: async (agent, job) => { seen.push({ id: agent.id, steps: job.steps.length }); return `Output from ${agent.id}`; } });
  try {
    office.submit('Write a concrete launch plan'); await completed(office);
    assert.deepEqual(seen.map(s => s.steps), [0, 1, 2]);
    assert.equal(office.snapshot().jobs[0].mode, 'live');
    assert.equal(office.snapshot().jobs[0].status, 'completed');
  } finally { office.close(); }
});
test('provider error fails job, hides sensitive diagnostics, and permits retry', async () => {
  const office = createOffice({ dbPath: ':memory:', generate: async () => { throw new Error('secret-provider-value'); } });
  try {
    office.submit('A request that should fail'); await completed(office);
    assert.equal(office.snapshot().jobs[0].status, 'failed');
    assert.equal(JSON.stringify(office.snapshot()).includes('secret-provider-value'), false);
    assert.equal(office.snapshot().jobs[0].steps.length, 0);
    office.submit('A retry after provider failure'); await completed(office);
    assert.equal(office.snapshot().jobs.length, 2);
  } finally { office.close(); }
});
test('SQLite retains results and marks interrupted work failed on restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'office-'));
  const path = join(dir, 'office.sqlite');
  let office = createOffice({ dbPath: path, demoDelay: 0 });
  try {
    office.submit('Persist this useful work result'); await completed(office); office.close();
    const db = new DatabaseSync(path);
    const interrupted = { id: 'interrupted', status: 'running', steps: [], prompt: 'Interrupted work' };
    db.prepare('INSERT INTO jobs VALUES (?, ?)').run(interrupted.id, JSON.stringify(interrupted));
    db.prepare('INSERT INTO jobs VALUES (?, ?)').run('waiting', JSON.stringify({ id: 'waiting', status: 'queued', steps: [], prompt: 'Waiting at shutdown' })); db.close();
    office = createOffice({ dbPath: path });
    assert.equal(office.snapshot().jobs[0].status, 'failed');
    assert.equal(office.snapshot().jobs[1].status, 'failed');
    assert.equal(office.snapshot().jobs[2].steps.length, 3);
    assert.equal(office.snapshot().totals.running + office.snapshot().totals.queued, 0);
  } finally { office.close(); rmSync(dir, { recursive: true, force: true }); }
});
test('HTTP validates input, emits SSE state, and serves results', async () => {
  const office = createOffice({ dbPath: ':memory:', demoDelay: 1 });
  const server = createApp(office).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const invalid = await fetch(`${base}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: '  ' }) });
    assert.equal(invalid.status, 400);
    const controller = new AbortController();
    const stream = await fetch(`${base}/api/events`, { signal: controller.signal });
    assert.match(stream.headers.get('content-type'), /text\/event-stream/);
    const reader = stream.body.getReader();
    const { value } = await reader.read();
    assert.match(new TextDecoder().decode(value), /"agents"/);
    await reader.cancel(); controller.abort();
    const response = await fetch(`${base}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Create a complete marketing plan' }) });
    assert.equal(response.status, 202); await completed(office);
    const state = await (await fetch(`${base}/api/office`)).json();
    assert.equal(state.jobs[0].status, 'completed');
    assert.equal(state.agents.length, 3);
    assert.equal((await fetch(`${base}/api/missing`)).status, 404);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); office.close(); }
});
