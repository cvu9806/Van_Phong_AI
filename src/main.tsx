import React, { useEffect, useState, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, Box, ChevronRight, CircleHelp, Clock3, LayoutGrid, LoaderCircle, Plus, Send, Sparkles, Users, X, Zap } from 'lucide-react';
const OfficeScene = lazy(() => import('./OfficeScene'));
import TaskBoard from './TaskBoard';
import OfficeOverview from './OfficeOverview';
import type { OfficeState } from './types';
import './style.css';

const samples = ['Lên kế hoạch ra mắt một quán cà phê nhỏ', 'Viết nội dung giới thiệu sản phẩm văn phòng AI', 'Lập kế hoạch học lập trình trong 30 ngày'];
function App() {
  const [office, setOffice] = useState<OfficeState>({ mode: 'demo', agents: [], jobs: [] });
  const [connected, setConnected] = useState(false);
  const [providerInfo, setProviderInfo] = useState<{ ready: boolean; message?: string; auth?: string } | null>(null);
  async function checkProvider() {
    try {
      const response = await fetch('/api/provider');
      if (!response.ok) throw new Error();
      setProviderInfo(await response.json());
    } catch { setProviderInfo({ ready: false, message: 'Không thể kiểm tra provider. Thử kết nối lại.' }); }
  }
  useEffect(() => { void checkProvider(); }, []);
  const [selected, setSelected] = useState('manager');
  const [prompt, setPrompt] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [view, setView] = useState<'3d' | '2d'>(() => { try { return localStorage.getItem('office-view') === '2d' ? '2d' : '3d'; } catch { return '3d'; } });
  function changeView(value: '3d' | '2d') { setView(value); try { localStorage.setItem('office-view', value); } catch { /* Storage may be unavailable. */ } };
  useEffect(() => {
    const stream = new EventSource('/api/events');
    stream.onmessage = e => { setOffice(JSON.parse(e.data)); setConnected(true); };
    stream.onerror = () => setConnected(false);
    return () => stream.close();
  }, []);
  useEffect(() => {
    if (!help) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function keyboard(e: KeyboardEvent) {
      if (e.key === 'Escape') setHelp(false);
      if (e.key !== 'Tab') return;
      const buttons = document.querySelectorAll<HTMLButtonElement>('.help-modal button');
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, [help]);
  const running = office.jobs.find(job => job.status === 'running');
  const agent = office.agents.find(a => a.id === selected);
  const pending = office.jobs.filter(job => ['queued', 'running'].includes(job.status)).length;
  const canSubmit = office.mode === 'demo' || !!providerInfo?.ready;
  function reusePrompt(value: string) { setPrompt(value); document.getElementById('brief')?.focus(); }
  const counts = office.totals || { queued: office.jobs.filter(j => j.status === 'queued').length, running: running ? 1 : 0, completed: office.jobs.filter(j => j.status === 'completed').length, failed: office.jobs.filter(j => j.status === 'failed').length, cancelled: office.jobs.filter(j => j.status === 'cancelled').length };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    const submittedPrompt = prompt;
    setError(''); setSending(true);
    try {
      const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: submittedPrompt }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Không thể gửi công việc.');
      setOpened(body.id); setPrompt(current => current === submittedPrompt ? '' : current);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể kết nối máy chủ.'); }
    finally { setSending(false); }
  }
  return <div className="app-shell">
    <aside className="rail"><a className="brand" href="#" aria-label="Văn Phòng AI"><Box size={26}/></a><div className="rail-divider"/><a href="#workspace" className="rail-button active" aria-label="Văn phòng"><LayoutGrid size={21}/></a><a href="#team" className="rail-button" aria-label="Đội ngũ"><Users size={21}/></a><a href="#tasks" className="rail-button" aria-label="Công việc"><Clock3 size={21}/></a><button className="rail-button help" onClick={() => setHelp(true)} aria-label="Hướng dẫn"><CircleHelp size={21}/></button><div className="user-avatar">B</div></aside>
    <div className="workspace" id="workspace">
      <header className="topbar"><div className="breadcrumb">Không gian của bạn <ChevronRight size={14}/><strong>Văn phòng AI</strong></div><div className="topbar-right"><span className={`connection ${connected ? '' : 'offline'}`}><i/>{connected ? 'Đã kết nối' : 'Đang kết nối lại…'}</span><span className="version">BẢN THỬ NGHIỆM 0.2</span></div></header>
      <main>
        <section className="page-heading"><div><div className="eyebrow"><span/> KHÔNG GIAN LÀM VIỆC THÔNG MINH</div><h1>Ý tưởng của bạn. <span>Đội ngũ của bạn.</span></h1><p>Giao một mục tiêu. Để những người đồng đội AI cùng bạn bắt đầu.</p></div><button className="button subtle" onClick={() => setHelp(true)}><CircleHelp size={16}/> Khám phá văn phòng</button></section>
        <section className="workspace-metrics" aria-label="Tổng quan công việc"><div><span>Đồng đội AI</span><strong>{office.agents.length.toString().padStart(2, '0')}<small>cùng một mục tiêu</small></strong></div><div><span>Đang thực hiện</span><strong>{counts.running.toString().padStart(2, '0')}<small>{running ? 'đội ngũ đang xử lý' : 'sẵn sàng nhận việc'}</small></strong></div><div><span>Trong hàng đợi</span><strong>{counts.queued.toString().padStart(2, '0')}<small>xử lý theo thứ tự</small></strong></div><div><span>Đã hoàn thành</span><strong>{counts.completed.toString().padStart(2, '0')}<small>kết quả được lưu lại</small></strong></div></section>
        <div className="dashboard">
          <div className="office-column">
            <section className="office-card"><div className="card-top"><div><span className="tiny-label">PHÒNG 01</span><h2>Văn phòng sáng tạo <span className="room-dot"/></h2></div><span className="mode-pill"><Sparkles size={13}/>{office.mode === 'demo' ? 'Chế độ mô phỏng' : office.provider === 'codex' ? 'Codex CLI' : 'OpenAI API'}</span></div>
              <div className="view-controls" role="group" aria-label="Chế độ xem văn phòng"><button aria-pressed={view === '3d'} onClick={() => changeView('3d')}>Không gian 3D</button><button aria-pressed={view === '2d'} onClick={() => changeView('2d')}>Sơ đồ 2D</button></div><div className="scene-wrap">{view === '3d' ? <><Suspense fallback={<div className="scene-fallback">Đang chuẩn bị văn phòng…</div>}><OfficeScene resetCount={cameraKey} agents={office.agents} selected={selected} currentAgent={running?.currentAgent} onSelect={setSelected}/></Suspense><div className="scene-corner"><span className="live-dot"/> {running ? 'Đội ngũ đang làm việc' : 'Sẵn sàng cho ý tưởng mới'}</div><button className="reset-view" onClick={() => setCameraKey(k => k + 1)} aria-label="Đặt lại góc nhìn"><Box size={15}/> Góc nhìn mặc định</button></> : <OfficeOverview agents={office.agents} selected={selected} onSelect={setSelected} running={running}/>}</div>
              <div className="scene-footer"><span><span className="mouse-icon">↔</span> {view === '3d' ? 'Kéo để xoay · Cuộn để thu phóng' : 'Chế độ nhẹ · Không cần WebGL'}</span><span>Chọn nhân vật để làm quen <ArrowRight size={13}/></span></div>
            </section>
            <section className="team-section" id="team"><div className="section-title"><h2>Đồng đội của bạn <span>03</span></h2><span>Mỗi người một thế mạnh</span></div><div className="team-grid">{office.agents.map((a, i) => <button key={a.id} className={`agent-card ${selected === a.id ? 'selected' : ''}`} aria-pressed={selected === a.id} onClick={() => setSelected(a.id)}><span className="agent-avatar" style={{ background: a.color }}>{['M', 'L', 'A'][i]}<i className={running?.currentAgent === a.id ? 'busy' : ''}/></span><span className="agent-info"><strong>{a.name}</strong><small>{a.role}</small></span><span className="agent-status">{running?.currentAgent === a.id ? <LoaderCircle className="spin" size={14}/> : <span className="status-dot"/>}{running?.currentAgent === a.id ? 'Đang làm' : 'Sẵn sàng'}</span></button>)}</div></section>
          </div>
          <aside className="task-column"><section className="composer"><div className="composer-icon"><Sparkles size={23}/></div><span className="tiny-label">TỪ Ý TƯỞNG ĐẾN HÀNH ĐỘNG</span><h2>Hôm nay, mình<br/>cùng làm gì?</h2><p>Mô tả mục tiêu. Minh sẽ lập kế hoạch,<br className="desktop-break"/> Linh phân tích và An hoàn thiện nội dung.</p><form onSubmit={submit}><label htmlFor="brief">Công việc của bạn</label><div className="textarea-wrap"><textarea id="brief" placeholder="Ví dụ: Lên kế hoạch ra mắt một quán cà phê nhỏ dành cho người yêu sách…" value={prompt} onChange={e => setPrompt(e.target.value)} minLength={10} maxLength={4000} required/><span>{prompt.length}/4.000</span></div><button className="button primary send-button" disabled={!connected || sending || !canSubmit || pending >= (office.queueLimit || 20) || prompt.trim().length < 10} type="submit">{sending ? <LoaderCircle size={17} className="spin"/> : <Send size={16}/>} {sending ? 'Đang giao việc…' : running ? 'Thêm vào hàng đợi' : 'Bắt đầu cùng đội ngũ'}<ArrowRight size={17}/></button></form>{error && <p className="error" role="alert">{error}</p>}<div className="suggestions"><span>HOẶC THỬ MỘT Ý TƯỞNG</span>{samples.map(s => <button key={s} onClick={() => { setPrompt(s); document.getElementById('brief')?.focus(); }}><Plus size={13}/>{s}</button>)}</div><div className="demo-note"><Zap size={15}/><p>{office.mode === 'demo' ? 'Bạn đang trải nghiệm mô phỏng. Chọn AI_PROVIDER=codex và đăng nhập Codex trên máy chủ để làm việc với AI thật.' : office.provider === 'codex' ? 'Đang dùng Codex CLI trên máy chủ. Mỗi công việc chạy 3 lượt; hạn mức theo phương thức đăng nhập Codex.' : 'Đã cấu hình OpenAI API. Mỗi công việc thực hiện 3 lượt xử lý; chi phí theo nhà cung cấp.'}</p></div>{office.mode === 'live' && <div className="provider-status" role="status"><p className={providerInfo?.ready ? '' : 'error'}>{providerInfo?.message || 'Đang kiểm tra provider…'}</p><button type="button" onClick={() => void checkProvider()}>Kiểm tra lại kết nối</button></div>}</section>
          <section className="agent-detail"><span className="detail-symbol" style={{ background: agent?.color }}><Users size={19}/></span><div><strong>{agent ? `${agent.name} · ${agent.role}` : 'Đang tải đội ngũ…'}</strong><p>{selected === 'manager' ? 'Biến mục tiêu thành kế hoạch rõ ràng.' : selected === 'analyst' ? 'Phân tích lựa chọn, cơ hội và rủi ro.' : 'Kết nối ý tưởng thành nội dung hoàn chỉnh.'}</p></div></section></aside>
        </div>
        <TaskBoard jobs={office.jobs} agents={office.agents} opened={opened} onOpen={setOpened} connected={connected} canRetry={canSubmit} onReuse={reusePrompt}/>
        <footer className="page-footer"><span><Box size={14}/> VĂN PHÒNG AI</span><span>Không gian nhỏ. Khả năng lớn.</span><span>Được tạo để cùng bạn tiến xa hơn.</span></footer>
      </main>
    </div>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()}><button className="close-modal" autoFocus aria-label="Đóng hướng dẫn" onClick={() => setHelp(false)}><X size={20}/></button><div className="composer-icon"><Sparkles/></div><h2 id="help-title">Chào mừng đến văn phòng</h2><p>01 — Kéo chuột để xoay văn phòng, cuộn để thu phóng. Chọn nhân vật hoặc thẻ tên để xem vai trò.</p><p>02 — Nhập mục tiêu từ 10 đến 4.000 ký tự. Cả ba agent sẽ lần lượt lập kế hoạch, phân tích và tổng hợp. Bạn có thể giao thêm việc vào hàng đợi, hủy hoặc thử lại một công việc.</p><p>03 — Mở công việc để đọc từng bước, sao chép hoặc tải kết quả. Lịch sử được lưu trong SQLite trên máy chủ.</p><div className="demo-note"><Zap size={17}/><p>Để dùng Codex: cài CLI, chạy codex login trên máy chủ và chọn AI_PROVIDER=codex. Có thể dùng đăng nhập ChatGPT; không cần API key. AI_PROVIDER=demo bật mô phỏng. Agent hiện tập trung vào lập kế hoạch và nội dung.</p></div><button className="button primary" onClick={() => setHelp(false)}>Bắt đầu khám phá <ArrowRight size={16}/></button></section></div>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
