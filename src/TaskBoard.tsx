import { useState } from 'react';
import { ArrowDownToLine, Check, ChevronDown, Clock3, Copy, LoaderCircle, RotateCcw, Search, Square, X } from 'lucide-react';
import type { Agent, Job } from './types';

const statusText = { queued: 'Đang chờ', running: 'Đang thực hiện', completed: 'Hoàn thành', failed: 'Cần thử lại', cancelled: 'Đã hủy' };
type Props = { jobs: Job[]; agents: Agent[]; opened: string | null; onOpen: (id: string | null) => void; connected: boolean; canRetry: boolean; onReuse: (prompt: string) => void };
export default function TaskBoard({ jobs, agents, opened, onOpen, connected, canRetry, onReuse }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | Job['status']>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const visible = jobs.filter(job => (filter === 'all' || job.status === filter) && job.prompt.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));
  async function action(job: Job, verb: 'cancel' | 'retry') {
    setBusy(job.id); setError('');
    try {
      const res = await fetch(`/api/jobs/${job.id}/${verb}`, { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Không thể cập nhật công việc.');
      if (verb === 'retry') { setFilter('all'); setQuery(''); onOpen(body.id); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Mất kết nối máy chủ.'); }
    finally { setBusy(null); }
  }
  const resultText = (job: Job) => `${job.prompt}\nTrạng thái: ${statusText[job.status]}\nChế độ: ${job.mode === 'demo' ? 'MÔ PHỎNG' : job.provider === 'codex' ? 'Codex CLI' : 'OpenAI API'}\n\n${job.steps.map(step => `${agents.find(a => a.id === step.agentId)?.name || step.agentId}\n${step.text}`).join('\n\n———\n\n')}`;
  async function copy(job: Job) {
    try { await navigator.clipboard.writeText(resultText(job)); setCopied(job.id); setTimeout(() => setCopied(null), 1800); }
    catch { setError('Không thể sao chép. Hãy dùng nút tải kết quả.'); }
  }
  function download(job: Job) {
    const url = URL.createObjectURL(new Blob([resultText(job)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `van-phong-ai-${job.id.slice(0, 8)}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="tasks-section" id="tasks">
    <div className="section-title"><h2>Dòng công việc <span>{String(jobs.length).padStart(2, '0')}</span></h2><span>50 công việc gần nhất</span></div>
    <div className="task-toolbar"><div className="task-tabs" role="group" aria-label="Lọc công việc">{(['all', 'queued', 'running', 'completed', 'failed', 'cancelled'] as const).map(value => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{value === 'all' ? 'Tất cả' : statusText[value]}<span>{value === 'all' ? jobs.length : jobs.filter(job => job.status === value).length}</span></button>)}</div><label className="task-search"><Search size={14}/><input type="search" aria-label="Tìm công việc" placeholder="Tìm công việc…" value={query} onChange={e => setQuery(e.target.value)}/></label></div>
    {error && <p className="error" role="alert">{error}</p>}
    {jobs.length === 0 ? <div className="empty-state"><div><Clock3 size={24}/></div><h3>Một khởi đầu mới đang chờ</h3><p>Công việc đầu tiên của đội ngũ sẽ xuất hiện ở đây.</p><button onClick={() => document.getElementById('brief')?.focus()}>Giao việc đầu tiên →</button></div> : visible.length === 0 ? <div className="empty-state"><h3>Không tìm thấy công việc phù hợp</h3><p>Thử từ khóa khác hoặc chọn tất cả trạng thái.</p><button onClick={() => { setQuery(''); setFilter('all'); }}>Xóa bộ lọc</button></div> : <div className="job-list">{visible.map(job => <div className={`job-row ${opened === job.id ? 'open' : ''}`} key={job.id}>
      <button className="job-summary" onClick={() => onOpen(opened === job.id ? null : job.id)} aria-expanded={opened === job.id}><span className={`job-icon ${job.status}`}>{job.status === 'running' ? <LoaderCircle className="spin" size={17}/> : job.status === 'completed' ? <Check size={17}/> : job.status === 'queued' ? <Clock3 size={17}/> : job.status === 'cancelled' ? <Square size={15}/> : <X size={17}/>}</span><span className="job-name"><strong>{job.prompt}</strong><small>{new Date(job.createdAt).toLocaleString('vi-VN')} · {job.mode === 'demo' ? 'Mô phỏng' : job.provider === 'codex' ? 'Codex CLI' : 'AI thật'} · {job.steps.length}/3 bước {job.retryOf ? '· Lượt thử lại' : ''}</small></span><span className={`job-status ${job.status}`}>{statusText[job.status]}{job.status === 'queued' && job.queuePosition ? ` #${job.queuePosition}` : ''}</span><ChevronDown size={16}/></button>
      {opened === job.id && <div className="job-results"><div className="job-stepper" aria-label="Tiến độ công việc">{agents.map(a => <div key={a.id} className={job.steps.some(s => s.agentId === a.id) ? 'done' : job.currentAgent === a.id ? 'current' : ''}><span>{job.steps.some(s => s.agentId === a.id) ? <Check size={12}/> : job.currentAgent === a.id ? <LoaderCircle size={12} className="spin"/> : <span className="step-point"/>}</span><strong>{a.name}</strong><small>{a.role}</small></div>)}</div>
        {job.error && <p className="error">{job.error}</p>}
        {job.status === 'queued' && <p className="queue-message"><Clock3 size={15}/> Đang chờ lượt {job.queuePosition || ''}. Văn phòng xử lý lần lượt để kiểm soát hạn mức.</p>}
        {job.status === 'cancelled' && <p className="queue-message">Đã dừng công việc. Kết quả các bước đã hoàn thành được giữ lại. Lượt gọi đã gửi có thể vẫn tính vào hạn mức.</p>}
        {job.steps.map(step => <article key={step.agentId}><h3><span style={{ background: agents.find(a => a.id === step.agentId)?.color }}/>{agents.find(a => a.id === step.agentId)?.name}<small>{agents.find(a => a.id === step.agentId)?.role}</small></h3><p>{step.text}</p></article>)}
        {job.status === 'running' && <div className="working-message" role="status"><LoaderCircle size={15} className="spin"/> {agents.find(a => a.id === job.currentAgent)?.name || 'Đội ngũ'} đang xử lý…</div>}
        <div className="result-actions">
          {['queued', 'running'].includes(job.status) && <button className="cancel-action" disabled={!connected || busy !== null} onClick={() => void action(job, 'cancel')}><Square size={13}/> {busy === job.id ? 'Đang hủy…' : 'Hủy công việc'}</button>}
          {['failed', 'cancelled'].includes(job.status) && <button disabled={!connected || !canRetry || busy !== null} onClick={() => void action(job, 'retry')}><RotateCcw size={14}/> {busy === job.id ? 'Đang gửi…' : 'Thử lại'}</button>}
          {job.steps.length > 0 && <><button onClick={() => void copy(job)}>{copied === job.id ? <Check size={14}/> : <Copy size={14}/>} {copied === job.id ? 'Đã sao chép' : 'Sao chép'}</button><button onClick={() => download(job)}><ArrowDownToLine size={14}/> Tải kết quả</button></>}
          <button onClick={() => onReuse(job.prompt)}>Dùng lại yêu cầu</button>
        </div>
      </div>}
    </div>)}</div>}
  </section>;
}
