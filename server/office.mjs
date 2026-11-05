import { CodexError } from './codex.mjs';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export const roles = [
  { id: 'manager', name: 'Minh', role: 'Điều phối', color: '#b0c891', instruction: 'Bạn là quản lý dự án. Phân tích yêu cầu, đưa ra kế hoạch ngắn gọn và tiêu chí hoàn thành. Không hỏi lại khi có thể nêu giả định hợp lý.' },
  { id: 'analyst', name: 'Linh', role: 'Phân tích', color: '#e8bc82', instruction: 'Bạn là chuyên viên phân tích. Dựa vào yêu cầu và kế hoạch, phân tích lựa chọn, rủi ro và đề xuất cụ thể. Bạn không có công cụ duyệt web; không bịa nguồn hoặc khẳng định đã nghiên cứu Internet.' },
  { id: 'writer', name: 'An', role: 'Sáng tạo', color: '#b7aedb', instruction: 'Bạn là chuyên viên nội dung. Tổng hợp yêu cầu, kế hoạch và phân tích thành sản phẩm cuối cùng có thể sử dụng. Viết bằng tiếng Việt, cụ thể, dễ đọc. Không bịa nguồn.' },
];
export class OfficeError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function createOffice({ dbPath = '.data/office.sqlite', generate, provider = generate ? 'openai' : 'demo', demoDelay = 900, queueLimit = 20 } = {}) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, body TEXT NOT NULL)');
  const events = new EventEmitter();
  let active = null, execution = null, closed = false;
  const all = () => db.prepare('SELECT body FROM jobs ORDER BY rowid ASC').all().map(row => JSON.parse(row.body));
  const save = job => {
    if (closed) return;
    db.prepare('INSERT INTO jobs VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET body = excluded.body').run(job.id, JSON.stringify(job));
    events.emit('change');
  };
  // Never silently restart paid/in-flight work after a process restart.
  for (const job of all()) {
    if (['running', 'queued'].includes(job.status)) {
      job.status = 'failed'; job.currentAgent = null;
      job.error = 'Máy chủ đã khởi động lại. Chọn thử lại để tạo lượt xử lý mới.';
      save(job);
    }
  }
  const get = id => {
    const row = db.prepare('SELECT body FROM jobs WHERE id = ?').get(id);
    if (!row) throw new OfficeError(404, 'Không tìm thấy công việc.');
    return JSON.parse(row.body);
  };
  const snapshot = () => {
    const jobs = all();
    const queued = jobs.filter(job => job.status === 'queued');
    const totals = { queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
    for (const job of jobs) if (job.status in totals) totals[job.status]++;
    return { mode: generate ? 'live' : 'demo', provider, queueLimit, totals,
      agents: roles.map(({ instruction, ...role }) => role),
      jobs: jobs.slice(-50).reverse().map(job => ({ ...job, queuePosition: job.status === 'queued' ? queued.findIndex(item => item.id === job.id) + 1 : undefined })),
    };
  };
  function pump() {
    if (closed || active) return;
    const job = all().find(item => item.status === 'queued');
    if (!job) return;
    const controller = new AbortController();
    active = { job, controller };
    job.status = 'running'; job.startedAt = new Date().toISOString(); save(job);
    execution = run(job, controller.signal);
  }
  async function run(job, signal) {
    try {
      for (const agent of roles) {
        signal.throwIfAborted();
        job.currentAgent = agent.id; save(job);
        const text = generate ? await generate(agent, job, { signal }) : await demo(agent, job, signal);
        signal.throwIfAborted();
        if (!text?.trim()) throw new Error('Empty model output');
        job.steps.push({ agentId: agent.id, text, completedAt: new Date().toISOString() }); save(job);
      }
      job.status = 'completed'; job.currentAgent = null; job.finishedAt = new Date().toISOString(); save(job);
    } catch (error) {
      if (!signal.aborted) {
        job.status = 'failed'; job.currentAgent = null; job.finishedAt = new Date().toISOString();
        job.error = error instanceof CodexError ? error.message : 'Không thể hoàn thành yêu cầu AI. Kiểm tra cấu hình, kết nối hoặc hạn mức rồi thử lại.';
        save(job);
      }
    } finally { active = null; if (!closed) pump(); }
  }
  async function demo(agent, job, signal) {
    await delay(demoDelay, undefined, { signal });
    const brief = job.prompt.slice(0, 240);
    if (agent.id === 'manager') return `[Mô phỏng] Kế hoạch cho: “${brief}”\n\n1. Xác định mục tiêu và đối tượng.\n2. Phân tích các hướng thực hiện.\n3. Chuẩn bị bản đề xuất để bạn duyệt.\n\nTiêu chí: rõ đầu việc, có thứ tự ưu tiên và bước tiếp theo.`;
    if (agent.id === 'analyst') return `[Mô phỏng] Phân tích sơ bộ\n\nYêu cầu: ${brief}\n\n• Bắt đầu bằng một phạm vi nhỏ để kiểm chứng.\n• Xác định nguồn lực và dữ liệu còn thiếu.\n• Đánh giá theo tính khả thi, thời gian và chi phí.\n\nĐây là nội dung mẫu theo kịch bản, chưa có nghiên cứu hay gọi AI.`;
    return `[Mô phỏng] Bản đề xuất mẫu\n\n${brief}\n\n01 — Chốt mục tiêu\nViết một kết quả cụ thể cần đạt và cách đo lường.\n\n02 — Thực hiện bản thử\nChọn đầu việc quan trọng nhất, làm bản đầu và thu thập phản hồi.\n\n03 — Đánh giá & cải tiến\nĐối chiếu kết quả với mục tiêu rồi lên bước tiếp theo.\n\nKết nối Codex CLI phía server để nhận nội dung AI thực sự theo yêu cầu của bạn.`;
  }
  function submit(prompt, retryOf) {
    if (closed) throw new OfficeError(503, 'Văn phòng đang tạm dừng.');
    if (all().filter(job => ['queued', 'running'].includes(job.status)).length >= queueLimit) throw new OfficeError(429, 'Hàng đợi đã đầy. Hãy đợi hoặc hủy một công việc.');
    const job = { id: randomUUID(), prompt, mode: generate ? 'live' : 'demo', provider, status: 'queued', currentAgent: null, steps: [], createdAt: new Date().toISOString(), ...(retryOf ? { retryOf } : {}) };
    save(job); pump(); return get(job.id);
  }
  return {
    events, snapshot, submit,
    cancel(id) {
      const job = active?.job.id === id ? active.job : get(id);
      if (!['running', 'queued'].includes(job.status)) throw new OfficeError(409, 'Chỉ có thể hủy công việc đang chạy hoặc chờ.');
      job.status = 'cancelled'; job.currentAgent = null; job.finishedAt = new Date().toISOString();
      save(job);
      if (active?.job.id === id) active.controller.abort();
      return job;
    },
    retry(id) {
      const job = get(id);
      if (!['failed', 'cancelled'].includes(job.status)) throw new OfficeError(409, 'Chỉ thử lại công việc bị lỗi hoặc đã hủy.');
      return submit(job.prompt, job.id);
    },
    close() {
      closed = true;
      if (active) { active.controller.abort(); return execution.finally(() => db.close()); }
      db.close(); return Promise.resolve();
    },
  };
}
