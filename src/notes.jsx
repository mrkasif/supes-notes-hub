import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Download, Flame, Home, LayoutDashboard, Search, Star, Trophy, Upload, User, Wrench } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
const DEMO_USERNAME = 'klabnotes';
const DEMO_PASSWORD = '123456';
const DEMO_PDF = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

const SAMPLE_NOTES = [
  'Data Structures Unit 2',
  'Operating Systems Unit 4',
  'DBMS Quick Revision',
  'Computer Networks Notes',
  'Java OOP Cheat Sheet',
  'Maths 3 Solved Set',
  'TOC End Sem Pack',
  'Software Engineering Midterm',
  'COA Unit 1-3',
  'Python Lab Manual',
  'AI Basics Intro',
  'ML Regression Notes',
  'Cyber Security Unit 2',
  'Cloud Computing Notes',
  'Web Tech Unit 5',
  'Compiler Design Cheats',
  'Digital Logic Design',
  'C Programming Basics',
  'Physics First Year',
  'Discrete Maths Unit 1',
  'Microprocessors 8086',
  'Android Dev Notes',
  'DevOps Intro',
  'Project Management Notes',
  'Statistics for CS',
  'JavaScript ES6 Notes',
  'System Design Basics',
  'Data Mining Crash Notes',
  'Cryptography Unit 3',
  'IoT Fundamentals',
].map((title, i) => {
  const subjects = ['DSA', 'Operating Systems', 'DBMS', 'Networks', 'AI', 'ML', 'Cloud', 'Web Tech', 'Compiler', 'Maths'];
  const branches = ['CSE', 'IT', 'ENTC'];
  const universities = ['SPPU', 'MU', 'AKTU'];
  const uploaders = ['Rohit', 'Aakash', 'Neha', 'Priya', 'Kiran', 'Vivek', 'Riya', 'Pooja', 'Sana', 'Arjun'];
  const semester = `Sem ${1 + (i % 8)}`;
  const verified = i % 7 === 0;
  const recommended = i % 5 === 0;
  return {
    id: `s-${i + 1}`,
    title,
    subject: subjects[i % subjects.length],
    semester,
    branch: branches[i % branches.length],
    university: universities[i % universities.length],
    uploader: uploaders[i % uploaders.length],
    downloads: 420 - i * 9,
    rating: Number((4.8 - (i % 10) * 0.1).toFixed(1)),
    ratingCount: 12 + (i % 28),
    verified,
    recommended,
    uploadDate: new Date(2026, 1, 28 - i).toISOString(),
    expiresAt: verified ? null : (Date.now() + (45 - i) * 24 * 60 * 60 * 1000),
    fileUrl: DEMO_PDF,
    status: 'approved',
    views: 180 - i * 3,
  };
});

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

function expiresLabel(note) {
  if (note.expiresAt === null || note.verified) return 'Never expires';
  if (typeof note.expiresAt !== 'number') return 'Expires in 30 days';
  const left = Math.ceil((note.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
  if (left <= 0) return 'Expired';
  return `Expires in: ${left} days`;
}

async function parseResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function getAuthHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function Navbar({ page, setPage, user, onOpenAuth, onLogout }) {
  const items = [
    ['home', 'Home', Home],
    ['browse', 'Browse', Search],
    ['upload', 'Upload', Upload],
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['leaderboard', 'Leaderboard', Trophy],
  ];
  return (
    <nav className="sticky top-0 z-20 bg-zinc-950/95 border-b border-zinc-800 backdrop-blur px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <button onClick={() => setPage('home')} className="text-zinc-100 text-xl font-bold">NotesHub</button>
        <div className="hidden md:flex gap-2">
          {items.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setPage(id)} className={`px-3 py-2 rounded-lg text-sm ${page === id ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <span className="inline-flex items-center gap-2"><Icon size={14} />{label}</span>
            </button>
          ))}
          {user?.role === 'admin' && (
            <button onClick={() => setPage('admin')} className={`px-3 py-2 rounded-lg text-sm ${page === 'admin' ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'}`}>
              <span className="inline-flex items-center gap-2"><Wrench size={14} />Admin</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <button onClick={() => setPage('profile')} className="px-3 py-2 rounded-lg text-sm bg-zinc-800 text-zinc-100"><span className="inline-flex items-center gap-2"><User size={14} />{user.username}</span></button>
              <button onClick={onLogout} className="text-rose-300 text-sm">Logout</button>
            </>
          ) : (
            <button onClick={onOpenAuth} className="px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white">Login</button>
          )}
        </div>
      </div>
    </nav>
  );
}

function AuthModal({ onClose, onLogin }) {
  const [isReg, setReg] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isReg ? '/api/auth/register' : '/api/auth/login';
      const data = await parseResponse(await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
      }));
      onLogin(data.token, data.user);
      onClose();
    } catch (err) { setMsg(err.message); }
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/70 p-4 flex items-center justify-center">
      <section className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-zinc-100 shadow-xl">
        <h2 className="text-2xl font-bold mb-2">{isReg ? 'Create ID' : 'Login'}</h2>
        <p className="text-zinc-400 text-sm mb-3">Demo: {DEMO_USERNAME} / {DEMO_PASSWORD}</p>
        <div className="flex gap-2 mb-3">
          <button className="px-3 py-2 rounded-lg bg-zinc-800 text-sm" onClick={() => { setUsername(DEMO_USERNAME); setPassword(DEMO_PASSWORD); setReg(false); }}>Use Demo</button>
          <button className="px-3 py-2 rounded-lg bg-zinc-800 text-sm" onClick={onClose}>Close</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} required />
          <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          <button className="w-full py-2 rounded-lg bg-indigo-600 text-white">Continue</button>
        </form>
        <button className="mt-3 text-indigo-400 text-sm" onClick={() => setReg((v) => !v)}>{isReg ? 'Have account? Login' : 'Need account? Register'}</button>
        {msg && <p className="text-zinc-300 text-sm mt-2">{msg}</p>}
      </section>
    </div>
  );
}

function NoteCard({ note, onOpen }) {
  return (
    <article className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg hover:shadow-indigo-900/20 hover:-translate-y-0.5 hover:border-zinc-700 transition">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-zinc-100 font-semibold text-xl leading-tight">{note.title}</h3>
        {note.verified && <span className="text-xs px-2 py-1 rounded-full bg-emerald-600/20 text-emerald-300 border border-emerald-600/40">Verified</span>}
      </div>
      {note.recommended && <p className="text-xs text-amber-300 mb-2">Recommended</p>}
      <p className="text-zinc-400 text-sm mb-1">{note.branch} - {note.semester}</p>
      <p className="text-zinc-500 text-sm mb-3">{note.subject}</p>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <p className="text-zinc-400">⏳ {expiresLabel(note)}</p>
        <p className="text-zinc-400">✅ {note.verified ? 'Verified' : 'Community'}</p>
        <p className="text-zinc-400">⭐ {note.rating}</p>
        <p className="text-zinc-400">⬇ {note.downloads}</p>
      </div>
      <div className="flex justify-between text-sm mb-3">
        <span className="text-amber-300 inline-flex items-center gap-1"><Star size={14} />{note.rating} ({note.ratingCount})</span>
        <span className="text-zinc-300 inline-flex items-center gap-1"><Download size={14} />{note.downloads}</span>
      </div>
      <button onClick={() => onOpen(note)} className="w-full py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition">Open Note</button>
    </article>
  );
}

function NoteModal({ note, user, token, onClose, onRequireLogin, saved, onSave, onDownloaded }) {
  const [msg, setMsg] = useState('');
  if (!note) return null;

  const download = async () => {
    if (!user || !token) { onRequireLogin(); return; }
    try {
      if (!String(note.id).startsWith('s-')) {
        await parseResponse(await fetch(`${API_BASE}/api/notes/${note.id}/download`, { method: 'POST', headers: getAuthHeader(token) }));
      }
      window.open(note.fileUrl, '_blank', 'noopener,noreferrer');
      onDownloaded(note.id);
    } catch (err) { setMsg(err.message); }
  };

  return (
    <div className="fixed inset-0 z-30 bg-black/80 p-4 overflow-y-auto">
      <div className="max-w-5xl mx-auto bg-zinc-950 border border-zinc-800 rounded-xl p-5">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-zinc-100 text-3xl font-bold">{note.title}</h2>
            <p className="text-zinc-400 text-sm">{note.subject} | {note.semester} | Uploaded by {note.uploader} | {fmt(note.uploadDate)}</p>
            <p className="text-zinc-500 text-sm">Downloads: {note.downloads} | Rating: {note.rating} ({note.ratingCount})</p>
            <p className="text-zinc-500 text-sm">{expiresLabel(note)}</p>
          </div>
          <button onClick={onClose} className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200">Close</button>
        </div>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <button className="py-2 rounded-lg bg-indigo-600 text-white" onClick={onSave}>{saved ? 'Saved to Favorites' : 'Save to Favorites'}</button>
          <button className="py-2 rounded-lg bg-zinc-800 text-zinc-100">Report this file</button>
          <button className="py-2 rounded-lg bg-emerald-600 text-white" onClick={download}>{user ? 'Download' : 'Login to Download'}</button>
        </div>
        <iframe title="PDF Preview" src={note.fileUrl} className="w-full h-[68vh] border border-zinc-800 rounded-lg" />
        {msg && <p className="mt-2 text-sm text-rose-300">{msg}</p>}
      </div>
    </div>
  );
}

function UploadSection({ user, token, onRequireLogin, onUploaded }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [pdf, setPdf] = useState(null);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!user || !token) { onRequireLogin(); return; }
    const fd = new FormData();
    fd.append('title', title);
    fd.append('subject', subject);
    fd.append('pdf', pdf);
    try {
      await parseResponse(await fetch(`${API_BASE}/api/notes/upload`, { method: 'POST', headers: getAuthHeader(token), body: fd }));
      setTitle(''); setSubject(''); setPdf(null); setMsg('Uploaded. Waiting for admin approval. +10 points added.');
      onUploaded();
    } catch (err) {
      if (String(err.message).toLowerCase().includes('duplicate')) setMsg('Duplicate detected. A similar note already exists.');
      else setMsg(err.message);
    }
  };

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow">
      <h2 className="text-zinc-100 text-2xl font-bold mb-4">Upload Notes (PDF)</h2>
      <form onSubmit={submit} className="space-y-3">
        <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <input className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-zinc-100" type="file" accept="application/pdf" onChange={(e) => setPdf(e.target.files?.[0] || null)} required />
        <button className="px-4 py-2 rounded-lg bg-emerald-600 text-white">Upload</button>
      </form>
      {msg && <p className="text-sm text-zinc-300 mt-2">{msg}</p>}
    </section>
  );
}

function Dashboard({ data, notifications }) {
  const stats = data || { totalUploads: 0, totalDownloads: 0, totalViews: 0, reputation: 0, badge: 'Bronze Contributor', recentActivity: [] };
  return (
    <section className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-zinc-100 text-3xl font-bold mb-2">User Dashboard</h2>
        <p className="text-zinc-400">You uploaded {stats.totalUploads} notes. Your notes got {stats.totalDownloads} downloads. Reputation: {stats.reputation} points.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
          <StatCard title="Total uploads" value={stats.totalUploads} />
          <StatCard title="Total downloads" value={stats.totalDownloads} />
          <StatCard title="Total views" value={stats.totalViews} />
          <StatCard title="Reputation" value={stats.reputation} />
          <StatCard title="Badge" value={stats.badge} />
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-zinc-100 font-semibold mb-2">Recent Activity</h3>
          {(stats.recentActivity || []).length === 0 ? <p className="text-zinc-400 text-sm">No activity yet.</p> : stats.recentActivity.map((x, i) => <p className="text-zinc-300 text-sm mb-1" key={i}>{x}</p>)}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-zinc-100 font-semibold mb-2 inline-flex items-center gap-2"><Bell size={16} />Notifications</h3>
          {notifications.length === 0 ? <p className="text-zinc-400 text-sm">No notifications yet.</p> : notifications.map((n) => <p key={n.id} className="text-zinc-300 text-sm mb-1">{n.message}</p>)}
        </div>
      </div>
    </section>
  );
}

function StatCard({ title, value }) {
  return <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3"><p className="text-zinc-500 text-sm">{title}</p><p className="text-zinc-100 text-2xl font-bold">{value}</p></div>;
}

function AdminPanel({ token }) {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [expired, setExpired] = useState([]);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [s, p] = await Promise.all([
        parseResponse(await fetch(`${API_BASE}/api/admin/stats`, { headers: getAuthHeader(token) })),
        parseResponse(await fetch(`${API_BASE}/api/admin/pending`, { headers: getAuthHeader(token) })),
      ]);
      setStats(s); setPending(p.notes || []); setExpired(p.expired || []);
    } catch (err) { setMsg(err.message); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const moderate = async (id, action) => {
    try {
      await parseResponse(await fetch(`${API_BASE}/api/admin/notes/${id}/${action}`, { method: 'POST', headers: getAuthHeader(token) }));
      load();
    } catch (err) { setMsg(err.message); }
  };

  const verify = async (id) => {
    try {
      await parseResponse(await fetch(`${API_BASE}/api/admin/notes/${id}/verify`, { method: 'POST', headers: { ...getAuthHeader(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ verified: true, recommended: true }) }));
      load();
    } catch (err) { setMsg(err.message); }
  };

  return (
    <section className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h2 className="text-zinc-100 text-2xl font-bold mb-2">Admin Panel</h2>
        {stats && <p className="text-zinc-400 text-sm">Pending: {stats.pending} | Approved: {stats.approved} | Rejected: {stats.rejected} | Expired: {stats.expired} | Users: {stats.users} | Banned: {stats.bannedUsers}</p>}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-zinc-100 font-semibold mb-3">Pending Uploads</h3>
        {pending.length === 0 ? <p className="text-zinc-400 text-sm">No pending uploads.</p> : pending.map((n) => (
          <div key={n.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-2 flex items-center justify-between gap-2">
            <p className="text-zinc-200 text-sm">{n.title} - {n.subject} ({n.ownerUsername})</p>
            <div className="flex gap-2">
              <button onClick={() => moderate(n.id, 'approve')} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">Approve</button>
              <button onClick={() => moderate(n.id, 'reject')} className="px-2 py-1 text-xs rounded bg-rose-600 text-white">Reject</button>
              <button onClick={() => verify(n.id)} className="px-2 py-1 text-xs rounded bg-indigo-600 text-white">Verify</button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-zinc-100 font-semibold mb-3">Expired Notes</h3>
        {expired.length === 0 ? <p className="text-zinc-400 text-sm">No expired notes.</p> : expired.map((n) => (
          <div key={n.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-2">
            <p className="text-zinc-200 text-sm">{n.title} - {n.subject} ({n.ownerUsername})</p>
            <p className="text-zinc-500 text-xs">Expired on: {n.expiresAt ? fmt(n.expiresAt) : 'N/A'}</p>
          </div>
        ))}
      </div>
      {msg && <p className="text-sm text-rose-300">{msg}</p>}
    </section>
  );
}

function Footer() {
  return <footer className="mt-10 border-t border-zinc-800 py-8 text-sm text-zinc-500"><div className="max-w-7xl mx-auto px-4 grid sm:grid-cols-2 md:grid-cols-3 gap-3"><p>About</p><p>Contact</p><p>Privacy Policy</p><p>DMCA</p><p>Terms</p><p>Social Links</p></div></footer>;
}

export default function App() {
  const [page, setPage] = useState(localStorage.getItem('user') ? 'dashboard' : 'home');
  const [authOpen, setAuthOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => { const raw = localStorage.getItem('user'); return raw ? JSON.parse(raw) : null; });
  const [apiNotes, setApiNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState([]);
  const [filters, setFilters] = useState({ university: 'All', branch: 'All', semester: 'All', subject: '', sortBy: 'newest' });
  const [analytics, setAnalytics] = useState({ totalNotes: 0, totalDownloads: 0, activeContributors: 0 });
  const [dash, setDash] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const mergedNotes = useMemo(() => {
    const mapped = apiNotes.map((n) => ({
      id: n.id, title: n.title, subject: n.subject, semester: n.semester || 'Sem 3', branch: n.branch || 'IT', university: n.university || 'SPPU',
      uploader: n.ownerUsername, uploadDate: n.createdAt, downloads: n.downloads || 0, views: n.views || 0,
      expiresAt: n.expiresAt ?? null,
      rating: n.ratingCount ? Number(((n.ratingSum || 0) / n.ratingCount).toFixed(1)) : 0,
      ratingCount: n.ratingCount || 0, verified: !!n.verified, recommended: !!n.recommended, fileUrl: `${API_BASE}${n.fileUrl}`, status: n.status || 'pending',
    }));
    return [...mapped, ...SAMPLE_NOTES];
  }, [apiNotes]);

  const filteredNotes = useMemo(() => {
    const list = mergedNotes.filter((n) =>
      (filters.university === 'All' || n.university === filters.university) &&
      (filters.branch === 'All' || n.branch === filters.branch) &&
      (filters.semester === 'All' || n.semester === filters.semester) &&
      (!filters.subject.trim() || n.subject.toLowerCase().includes(filters.subject.toLowerCase()))
    );
    if (filters.sortBy === 'downloads') list.sort((a, b) => b.downloads - a.downloads);
    else if (filters.sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    else list.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    return list;
  }, [mergedNotes, filters]);

  const loadNotes = async () => {
    try { const data = await parseResponse(await fetch(`${API_BASE}/api/notes`, { headers: getAuthHeader(token) })); setApiNotes(data.notes || []); }
    catch { setApiNotes([]); }
  };

  const loadAnalytics = async () => {
    try { const data = await parseResponse(await fetch(`${API_BASE}/api/analytics`)); setAnalytics(data); }
    catch { setAnalytics({ totalNotes: 0, totalDownloads: 0, activeContributors: 0 }); }
  };

  const loadDashboard = async () => {
    if (!token) return;
    try { const data = await parseResponse(await fetch(`${API_BASE}/api/users/me/dashboard`, { headers: getAuthHeader(token) })); setDash(data.stats); setNotifications(data.notifications || []); }
    catch { setDash(null); setNotifications([]); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadNotes(); loadAnalytics(); }, [token]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDashboard(); }, [token]);

  const onLogin = (newToken, newUser) => { setToken(newToken); setUser(newUser); localStorage.setItem('token', newToken); localStorage.setItem('user', JSON.stringify(newUser)); setPage('dashboard'); };
  const onLogout = () => { setToken(''); setUser(null); localStorage.removeItem('token'); localStorage.removeItem('user'); setPage('home'); };

  return (
    <main className="min-h-screen bg-black">
      <Navbar page={page} setPage={setPage} user={user} onOpenAuth={() => setAuthOpen(true)} onLogout={onLogout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {page === 'home' && (
          <>
            <section className="rounded-2xl p-10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 mb-6 shadow-xl">
              <p className="text-indigo-400 text-sm mb-2">Study smarter, together</p>
              <h1 className="text-zinc-100 text-5xl font-extrabold mb-3">Find Verified Semester Notes Instantly.</h1>
              <p className="text-zinc-400 text-lg mb-5">Upload, preview, rate, and download notes from your college community.</p>
              <div className="flex gap-3"><button className="px-5 py-3 rounded-lg bg-indigo-600 text-white" onClick={() => setPage('browse')}>Browse Notes</button><button className="px-5 py-3 rounded-lg bg-zinc-800 text-zinc-100" onClick={() => setPage('upload')}>Upload Notes</button></div>
            </section>
            <section className="grid sm:grid-cols-3 gap-3 mb-6">{[['Notes Uploaded', analytics.totalNotes], ['Downloads', analytics.totalDownloads], ['Active Contributors', analytics.activeContributors]].map(([k, v]) => <StatCard key={k} title={k} value={v} />)}</section>
            <section className="mb-6"><h2 className="text-zinc-100 text-2xl font-bold mb-3 inline-flex items-center gap-2"><Flame size={20} />Trending Notes</h2><div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{mergedNotes.slice().sort((a,b)=>b.downloads-a.downloads).slice(0,6).map((n) => <NoteCard key={n.id} note={n} onOpen={setSelected} />)}</div></section>
          </>
        )}
        {page === 'browse' && <section><h2 className="text-zinc-100 text-2xl font-bold mb-3 inline-flex items-center gap-2"><Search size={20} />Browse Notes</h2><div className="grid lg:grid-cols-4 gap-4"><aside className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><h3 className="text-zinc-100 mb-2">Filters</h3><div className="space-y-2"><select className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200" value={filters.university} onChange={(e) => setFilters((f) => ({ ...f, university: e.target.value }))}><option>All</option><option>SPPU</option><option>MU</option><option>AKTU</option></select><select className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200" value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}><option>All</option><option>CSE</option><option>IT</option><option>ENTC</option></select><select className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200" value={filters.semester} onChange={(e) => setFilters((f) => ({ ...f, semester: e.target.value }))}><option>All</option><option>Sem 1</option><option>Sem 2</option><option>Sem 3</option><option>Sem 4</option><option>Sem 5</option><option>Sem 6</option><option>Sem 7</option><option>Sem 8</option></select><input className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200" placeholder="Subject" value={filters.subject} onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))} /><select className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200" value={filters.sortBy} onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}><option value="newest">Newest</option><option value="downloads">Most Downloaded</option><option value="rating">Rating</option></select></div></aside><div className="lg:col-span-3 grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filteredNotes.map((n) => <NoteCard key={n.id} note={n} onOpen={setSelected} />)}</div></div></section>}
        {page === 'upload' && <UploadSection user={user} token={token} onRequireLogin={() => setAuthOpen(true)} onUploaded={() => { loadNotes(); loadDashboard(); }} />}
        {page === 'dashboard' && (user ? <Dashboard data={dash} notifications={notifications} /> : <p className="text-zinc-300">Login required.</p>)}
        {page === 'leaderboard' && <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><h2 className="text-zinc-100 text-2xl font-bold mb-3 inline-flex items-center gap-2"><Trophy size={20} />Leaderboard</h2>{Object.entries(mergedNotes.reduce((a,n)=>{if(!a[n.uploader])a[n.uploader]={u:0,d:0};a[n.uploader].u+=1;a[n.uploader].d+=n.downloads;return a;},{})).map(([name,v])=>({name,...v})).sort((a,b)=>b.u-a.u||b.d-a.d).map((r,i)=><div key={r.name} className="bg-zinc-950 border border-zinc-800 rounded p-3 mb-2 flex justify-between"><p className="text-zinc-200">#{i+1} {r.name}</p><p className="text-zinc-400 text-sm">{r.u} uploads | {r.d} downloads</p></div>)}</section>}
        {page === 'profile' && <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"><h2 className="text-zinc-100 text-2xl font-bold mb-3">Profile</h2>{!user ? <p className="text-zinc-300">Login required.</p> : <><p className="text-zinc-300">Username: {user.username}</p><p className="text-zinc-400">Role: {user.role}</p><p className="text-zinc-400">Badge: {dash?.badge || user.badge || 'Bronze Contributor'}</p></>}</section>}
        {page === 'admin' && user?.role === 'admin' && <AdminPanel token={token} />}
      </div>
      <Footer />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onLogin={onLogin} />}
      {selected && <NoteModal note={selected} user={user} token={token} onClose={() => setSelected(null)} onRequireLogin={() => setAuthOpen(true)} saved={saved.includes(selected.id)} onSave={() => setSaved((s) => s.includes(selected.id) ? s.filter((x) => x !== selected.id) : [...s, selected.id])} onDownloaded={() => { loadNotes(); loadDashboard(); }} />}
    </main>
  );
}
