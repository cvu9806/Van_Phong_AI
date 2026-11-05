import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createOffice } from '../server/office.mjs';
import { createApp } from '../server/app.mjs';

function waitFor(office, condition) {
  if (condition(office.snapshot())) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { office.events.off('change', check); reject(new Error('Queue did not settle')); }, 4000);
    function check() { if (condition(office.snapshot())) { clearTimeout(timer); office.events.off('change', check); resolve(); } }
    office.events.on('change', check);
  });
}
const idle = state => state.jobs.every(job => !['queued', 'running'].includes(job.status));
test('queue runs jobs FIFO and permits only one model call at a time', async () => {
  const order = []; let concurrent = 0, maxConcurrent = 0;
  const office = createOffice({ dbPath: ':memory:', generate: async (agent, job, { signal }) => {
    concurrent++; maxConcurrent = Math.max(maxConcurrent, concurrent);
    order.push(`${job.prompt}:${agent.id}`);
    await delay(2, undefined, { signal }); concurrent--; return 'Output';
  } });
  try {
    const first = office.submit('First work item');
    const second = office.submit('Second work item');
    const third = office.submit('Third work item');
    const state = office.snapshot();
    assert.equal(state.jobs.find(j => j.id === first.id).status, 'running');
    assert.equal(state.jobs.find(j => j.id === second.id).queuePosition, 1);
    assert.equal(state.jobs.find(j => j.id === third.id).queuePosition, 2);
    await waitFor(office, idle);
    assert.equal(maxConcurrent, 1);
    assert.deepEqual(order.map(item => item.split(':')[0]), ['First work item', 'First work item', 'First work item', 'Second work item', 'Second work item', 'Second work item', 'Third work item', 'Third work item', 'Third work item']);
    assert.equal(office.snapshot().totals.completed, 3);
  } finally { await office.close(); }
});
test('cancel blocks late output, skips queued work, then retry creates a fresh job', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  let receivedSignal;
  const office = createOffice({ dbPath: ':memory:', generate: async (_agent, job, { signal }) => {
    if (job.prompt === 'Cancel the running task' && !job.retryOf) { receivedSignal = signal; await gate; }
    return 'Generated output';
  } });
  try {
    const first = office.submit('Cancel the running task');
    const second = office.submit('Let this task complete');
    const third = office.submit('Cancel this waiting task');
    office.cancel(third.id); office.cancel(first.id);
    assert.equal(receivedSignal.aborted, true);
    release(); await waitFor(office, idle);
    const state = office.snapshot();
    assert.equal(state.jobs.find(j => j.id === first.id).status, 'cancelled');
    assert.equal(state.jobs.find(j => j.id === first.id).steps.length, 0);
    assert.equal(state.jobs.find(j => j.id === third.id).steps.length, 0);
    assert.equal(state.jobs.find(j => j.id === second.id).steps.length, 3);
    const retried = office.retry(first.id);
    assert.notEqual(retried.id, first.id); assert.equal(retried.retryOf, first.id);
    await waitFor(office, idle);
    assert.equal(office.snapshot().jobs.find(j => j.id === retried.id).steps.length, 3);
    assert.equal(office.snapshot().jobs.find(j => j.id === first.id).status, 'cancelled');
  } finally { release(); await office.close(); }
});
test('failed work does not stop the next queued job', async () => {
  const office = createOffice({ dbPath: ':memory:', generate: async (_agent, job) => {
    await delay(1);
    if (job.prompt === 'Fail this work item') throw new Error('provider-secret');
    return 'Working';
  } });
  try {
    const bad = office.submit('Fail this work item');
    const good = office.submit('Complete next work item');
    await waitFor(office, idle);
    assert.equal(office.snapshot().jobs.find(j => j.id === bad.id).status, 'failed');
    assert.equal(office.snapshot().jobs.find(j => j.id === good.id).status, 'completed');
  } finally { await office.close(); }
});
test('HTTP supports cancel/retry and rejects queue overflow or invalid transitions', async () => {
  const office = createOffice({ dbPath: ':memory:', demoDelay: 50, queueLimit: 2 });
  const server = createApp(office).listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const first = office.submit('First queued task');
    const second = office.submit('Second queued task');
    const full = await post('/api/jobs', { prompt: 'This work exceeds capacity' });
    assert.equal(full.status, 429); assert.match((await full.json()).error, /Hàng đợi/);
    assert.equal((await post('/api/jobs/not-found/cancel')).status, 404);
    assert.equal((await post(`/api/jobs/${first.id}/retry`)).status, 409);
    assert.equal((await post(`/api/jobs/${second.id}/cancel`)).status, 200);
    assert.equal((await post(`/api/jobs/${second.id}/cancel`)).status, 409);
    const response = await post(`/api/jobs/${second.id}/retry`);
    assert.equal(response.status, 202); assert.equal((await response.json()).retryOf, second.id);
    await waitFor(office, idle);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await office.close(); }
});
