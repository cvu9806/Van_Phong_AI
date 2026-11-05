import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createCodex } from '../server/codex.mjs';
import { createOffice } from '../server/office.mjs';

async function fakeCli(body, testFn) {
  const dir = await mkdtemp(join(tmpdir(), 'fake codex '));
  const bin = join(dir, 'codex-test');
  await writeFile(bin, `#!${process.execPath}\n${body}`, { mode: 0o700 });
  try { await testFn(bin, dir); } finally { await rm(dir, { recursive: true, force: true }); }
}
test('Codex adapter passes prompt on stdin, constrains execution and cleans temporary files', async () => {
  await fakeCli(`import fs from 'node:fs';
const args = process.argv.slice(2);
const input = fs.readFileSync(0, 'utf8');
const output = args[args.indexOf('--output-last-message') + 1];
fs.writeFileSync(output, 'Kết quả Codex');
fs.writeFileSync(process.argv[1] + '.trace', JSON.stringify({ args, input, cwd: process.cwd() }));`, async bin => {
    const prompt = 'Dữ liệu $(touch hacked); `echo secret`';
    const result = await createCodex({ bin }).generate({ instruction: 'Vai trò quản lý' }, { prompt, steps: [{ text: 'Bước trước' }] });
    assert.equal(result, 'Kết quả Codex');
    const trace = JSON.parse(await readFile(bin + '.trace', 'utf8'));
    assert.ok(trace.input.includes(prompt));
    assert.ok(trace.input.includes('Bước trước'));
    assert.equal(trace.args.includes(prompt), false);
    assert.equal(trace.args[trace.args.indexOf('--sandbox') + 1], 'read-only');
    assert.ok(trace.args.includes('approval_policy="never"'));
    assert.ok(trace.args.includes('shell_tool'));
    assert.ok(trace.args.includes('--ephemeral'));
    assert.ok(trace.args.includes('--ignore-user-config'));
    assert.ok(trace.args.includes('mcp_servers={}'));
    await assert.rejects(access(trace.cwd));
  });
});
test('Codex status distinguishes ChatGPT, missing login and missing executable', async () => {
  await fakeCli("console.error('Logged in using ChatGPT');", async bin => assert.equal((await createCodex({ bin }).status()).auth, 'chatgpt'));
  await fakeCli("console.error('Not logged in'); process.exitCode = 1;", async bin => assert.equal((await createCodex({ bin }).status()).code, 'CODEX_LOGIN_REQUIRED'));
  const status = await createCodex({ bin: '/does-not-exist/codex' }).status();
  assert.equal(status.code, 'CODEX_NOT_FOUND');
});
test('Codex timeout and provider errors return safe actionable failures', async () => {
  await fakeCli('setInterval(() => {}, 1000);', async bin => {
    await assert.rejects(createCodex({ bin, timeoutMs: 100 }).generate({ instruction: 'Test' }, { prompt: 'test', steps: [] }), { code: 'CODEX_TIMEOUT' });
  });
  await fakeCli("console.error('private-token-value unauthorized 401'); process.exitCode = 1;", async bin => {
    await assert.rejects(createCodex({ bin }).generate({ instruction: 'Test' }, { prompt: 'test', steps: [] }), error => error.code === 'CODEX_LOGIN_REQUIRED' && !error.message.includes('private-token-value'));
  });
  await fakeCli('process.exitCode = 0;', async bin => {
    await assert.rejects(createCodex({ bin }).generate({ instruction: 'Test' }, { prompt: 'test', steps: [] }), { code: 'CODEX_FAILED' });
  });
});
test('three office agents execute via Codex subprocess and retain provider identity', async () => {
  await fakeCli(`import fs from 'node:fs';
const args = process.argv.slice(2); fs.readFileSync(0, 'utf8');
fs.writeFileSync(args[args.indexOf('--output-last-message') + 1], 'Kết quả thử nghiệm qua CLI');`, async bin => {
    const codex = createCodex({ bin });
    const office = createOffice({ dbPath: ':memory:', provider: 'codex', generate: (agent, job) => codex.generate(agent, job) });
    try {
      const done = new Promise(resolve => {
        const check = () => { const job = office.snapshot().jobs[0]; if (job && !['running', 'queued'].includes(job.status)) { office.events.off('change', check); resolve(); } };
        office.events.on('change', check);
      });
      office.submit('Một công việc dùng ba agent qua CLI');
      await done;
      const state = office.snapshot();
      assert.equal(state.provider, 'codex');
      assert.equal(state.jobs[0].provider, 'codex');
      assert.equal(state.jobs[0].status, 'completed');
      assert.equal(state.jobs[0].steps.length, 3);
    } finally { office.close(); }
  });
});
test('Codex cancellation terminates the child and cleans its temporary directory', async () => {
  await fakeCli(`import fs from 'node:fs';
fs.writeFileSync(process.argv[1] + '.started', JSON.stringify({ cwd: process.cwd(), pid: process.pid }));
setInterval(() => {}, 1000);`, async bin => {
    const controller = new AbortController();
    const pending = createCodex({ bin }).generate({ instruction: 'Test' }, { prompt: 'test', steps: [] }, { signal: controller.signal });
    const assertion = assert.rejects(pending, { name: 'AbortError' });
    let started;
    for (let i = 0; i < 100; i++) {
      try { started = JSON.parse(await readFile(bin + '.started', 'utf8')); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 10)); }
    }
    assert.ok(started, 'Child must start before cancellation is tested');
    controller.abort(); await assertion;
    await assert.rejects(access(started.cwd));
    assert.throws(() => process.kill(started.pid, 0), { code: 'ESRCH' });
  });
});
