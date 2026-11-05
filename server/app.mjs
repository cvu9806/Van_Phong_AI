import express from 'express';
import { OfficeError } from './office.mjs';
import { z } from 'zod';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
export function createApp(office, { dist = resolve('dist'), providerStatus = async () => ({ ready: true }) } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, mode: office.snapshot().mode, provider: office.snapshot().provider }));
  app.get('/api/provider', async (_req, res) => {
    try { res.json({ provider: office.snapshot().provider, ...await providerStatus() }); }
    catch { res.status(503).json({ ready: false, message: 'Không thể kiểm tra kết nối provider.' }); }
  });
  app.get('/api/office', (_req, res) => res.json(office.snapshot()));
  app.post('/api/jobs', (req, res, next) => {
    const input = z.object({ prompt: z.string().trim().min(10).max(4000) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: 'Nội dung công việc cần từ 10 đến 4.000 ký tự.' });
    try { res.status(202).json(office.submit(input.data.prompt)); } catch (error) { next(error); }
  });
  app.post('/api/jobs/:id/cancel', (req, res, next) => {
    try { res.json(office.cancel(req.params.id)); } catch (error) { next(error); }
  });
  app.post('/api/jobs/:id/retry', (req, res, next) => {
    try { res.status(202).json(office.retry(req.params.id)); } catch (error) { next(error); }
  });
  app.get('/api/events', (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.flushHeaders();
    const send = () => res.write(`data: ${JSON.stringify(office.snapshot())}\n\n`);
    send(); office.events.on('change', send);
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);
    req.on('close', () => { clearInterval(heartbeat); office.events.off('change', send); });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'API không tồn tại.' }));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(dist, 'index.html')));
  }
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error instanceof OfficeError ? error.message : error.status === 413 ? 'Nội dung quá dài.' : 'Yêu cầu không hợp lệ hoặc máy chủ gặp lỗi.' }));
  return app;
}
