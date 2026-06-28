import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { FiActivity, FiBookOpen, FiHome, FiLogOut, FiMenu, FiPackage, FiShield, FiUsers, FiX } from 'react-icons/fi';

const tabs = ['overview', 'users', 'resources', 'marketplace', 'housing', 'sos'];
const tabMeta = {
  overview: { label: 'Dashboard', icon: FiActivity }, users: { label: 'All users', icon: FiUsers },
  resources: { label: 'Resources', icon: FiBookOpen }, marketplace: { label: 'Marketplace', icon: FiPackage },
  housing: { label: 'Housing', icon: FiHome }, sos: { label: 'SOS alerts', icon: FiShield },
};
const emptyData = { profiles: [], resources: [], products: [], housing: [], sos: [] };

export default function AdminPage({ session, profile }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  async function fetchAdminData() {
    setLoading(true);
    setError('');
    const requests = [
      supabase.from('profiles').select('*').order('updated_at', { ascending: false }),
      supabase.from('resources').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('created_at', { ascending: false }),
      supabase.from('housing_listings').select('*').order('created_at', { ascending: false }),
      supabase.from('sos_events').select('*').order('created_at', { ascending: false }),
    ];
    const results = await Promise.all(requests);
    setData({ profiles: results[0].data || [], resources: results[1].data || [], products: results[2].data || [], housing: results[3].data || [], sos: results[4].data || [] });
    const failure = results.find((result) => result.error);
    if (failure) setError(`Some admin data could not be loaded: ${failure.error.message}`);
    setLoading(false);
  }

  useEffect(() => { fetchAdminData(); }, []);

  const stats = useMemo(() => ({
    Users: data.profiles.length,
    Resources: data.resources.length,
    Marketplace: data.products.length,
    Housing: data.housing.length,
    'Active SOS': data.sos.filter((item) => ['pending', 'active'].includes(item.status)).length,
  }), [data]);

  const statIcons = { Users: FiUsers, Resources: FiBookOpen, Marketplace: FiPackage, Housing: FiHome, 'Active SOS': FiShield };

  async function setUserRole(profile, role) {
    const email = profile.university_email || profile.mail || 'this user';
    if (!window.confirm(`Set ${email} role to ${role}?`)) return;
    setLoading(true);
    const { error: rpcError } = await supabase.rpc('admin_set_user_role', { target_user_id: profile.id, new_role: role });
    if (rpcError) {
      setError(`Role update failed: ${rpcError.message}. Apply sql/role_based_access.sql in Supabase first.`);
      setLoading(false);
      return;
    }
    await fetchAdminData();
  }

  async function deleteRecord(table, record, label) {
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    const { error: deleteError } = await supabase.from(table).delete().eq('id', record.id);
    if (deleteError) setError(`Delete failed: ${deleteError.message}`);
    else await fetchAdminData();
  }

  async function resolveSOS(item) {
    const { error: updateError } = await supabase.from('sos_events').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', item.id);
    if (updateError) setError(`Could not resolve SOS: ${updateError.message}`);
    else await fetchAdminData();
  }

  return <div className="min-h-screen bg-[#f4f6fa]">
    <div className="grid w-full lg:grid-cols-[270px_minmax(0,1fr)]">
      <AdminSidebar activeTab={activeTab} onSelect={(tab) => { setActiveTab(tab); setDrawerOpen(false); }} session={session} profile={profile} className="hidden lg:block" />
      <main className="min-w-0 px-5 py-7 md:px-10 md:py-10 xl:px-12">
      <header className="mb-8 flex items-center justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[#a67800]">Admin workspace</p><h1 className="mt-1 text-3xl font-bold text-[#171b2e] md:text-4xl">{activeTab === 'overview' ? 'Admin Console' : tabMeta[activeTab].label}</h1><p className="mt-2 text-sm text-slate-500">Manage users, academic content, listings and campus safety.</p></div><button type="button" onClick={() => setDrawerOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#14182b] text-xl text-white lg:hidden" aria-label="Open admin menu"><FiMenu /></button></header>
      {error && <div role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(stats).map(([label, value]) => <Stat key={label} label={label} value={value} icon={statIcons[label]} />)}</div>
      {loading && <p className="mt-8 font-bold text-slate-500">Loading admin data…</p>}
      {!loading && activeTab === 'overview' && <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform distribution</p><h2 className="mt-1 text-2xl font-bold text-[#071a3d]">Content at a glance</h2><AdminChart stats={stats} /></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-bold text-[#071a3d]">Recent activity</h2><div className="mt-5 grid gap-4"><Summary title="Newest users" items={data.profiles.slice(0, 4)} /><Summary title="Recent SOS events" items={data.sos.slice(0, 4)} /></div></div></section>}
      {!loading && activeTab === 'users' && <Table title="Users and roles" headers={['User', 'Email', 'Role', 'Actions']} rows={data.profiles.map(profile => [profile.full_name || 'Unnamed', profile.university_email || profile.mail || '—', String(profile.role || 'student').toLowerCase(), <div className="flex flex-wrap gap-2"><Action onClick={() => setUserRole(profile, 'cr')}>Make CR</Action><Action onClick={() => setUserRole(profile, 'student')}>Remove CR</Action></div>])} />}
      {!loading && activeTab === 'resources' && <ContentTable title="Uploaded resources" items={data.resources} profiles={data.profiles} table="resources" onDelete={deleteRecord} />}
      {!loading && activeTab === 'marketplace' && <ContentTable title="Marketplace listings" items={data.products} profiles={data.profiles} table="products" onDelete={deleteRecord} />}
      {!loading && activeTab === 'housing' && <ContentTable title="Housing listings" items={data.housing} profiles={data.profiles} table="housing_listings" onDelete={deleteRecord} />}
      {!loading && activeTab === 'sos' && <Table title="SOS events" headers={['Person', 'Mobile', 'Status', 'Location', 'Created', 'Action']} rows={data.sos.map(item => { const owner = data.profiles.find((profile) => profile.id === item.user_id); return [owner?.full_name || owner?.university_email || 'Unknown user', owner?.mobile || 'Not provided', item.status, item.latitude && item.longitude ? <a className="font-bold text-blue-700" href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer">Open map</a> : 'Unavailable', formatDate(item.created_at), ['pending', 'active'].includes(item.status) ? <Action onClick={() => resolveSOS(item)}>Resolve</Action> : '—']; })} />}
      </main>
    </div>
    {drawerOpen && <div className="fixed inset-0 z-[70] bg-slate-950/40 lg:hidden" onClick={() => setDrawerOpen(false)}><div className="absolute left-0 top-0 h-full w-[min(300px,88vw)] overflow-y-auto bg-[#14182b] shadow-2xl" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setDrawerOpen(false)} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white" aria-label="Close admin menu"><FiX /></button><AdminSidebar activeTab={activeTab} onSelect={(tab) => { setActiveTab(tab); setDrawerOpen(false); }} session={session} profile={profile} /></div></div>}
  </div>;
}

function AdminSidebar({ activeTab, onSelect, session, profile, className = '' }) {
  const navigate = useNavigate();
  const name = profile?.full_name || session?.user?.email?.split('@')[0] || 'Administrator';
  const logout = async () => { await supabase.auth.signOut(); navigate('/'); };
  return <aside className={`min-h-screen bg-[#14182b] text-white ${className}`}><div className="sticky top-0 flex min-h-screen flex-col px-5 py-7"><div className="flex items-center gap-3 px-2"><img src="/logonav.png" alt="UniConnect" className="h-12 w-12 rounded-xl object-contain" /><div><strong className="block text-lg">UniConnect</strong><span className="block text-[10px] uppercase tracking-[0.16em] text-slate-400">Admin console</span></div></div><p className="mb-2 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Management</p><nav className="space-y-1"><Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"><FiHome className="text-lg" />Home</Link>{tabs.map((tab) => { const Icon = tabMeta[tab].icon; return <button type="button" key={tab} onClick={() => onSelect(tab)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition ${activeTab === tab ? 'bg-[#f5bd28] text-[#14182b]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="text-lg" />{tabMeta[tab].label}</button>; })}</nav><button type="button" onClick={logout} className="mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white"><FiLogOut className="text-lg" />Logout</button><div className="mt-auto rounded-2xl bg-[#242a40] p-4"><div className="flex items-center gap-3">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff3c4] font-bold text-[#14182b]">{name.charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="text-xs text-slate-400">Administrator</p></div></div><p className="mt-3 truncate border-t border-white/10 pt-3 text-[11px] text-slate-500">{session?.user?.email}</p></div></div></aside>;
}

function Stat({ label, value, icon: Icon }) { const colors = { Users: '#2563eb', Resources: '#059669', Marketplace: '#7c3aed', Housing: '#d97706', 'Active SOS': '#dc2626' }; return <div className="rounded-2xl border border-slate-200 border-t-4 bg-white p-5 shadow-sm" style={{ borderTopColor: colors[label] }}><div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-[#071a3d]">{Icon && <Icon />}</span><strong className="text-3xl font-bold text-[#071a3d]">{value}</strong></div><span className="mt-3 block text-sm font-semibold text-slate-500">{label}</span></div>; }
function Action({ children, onClick, danger }) { return <button onClick={onClick} className={`rounded-full px-3 py-2 text-xs font-black ${danger ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-[#18004d]'}`}>{children}</button>; }
function formatDate(value) { return value ? new Date(value).toLocaleString() : '—'; }
function Summary({ title, items }) { return <div className="rounded-2xl bg-blue-50 p-5"><h3 className="font-black text-[#18004d]">{title}</h3><div className="mt-3 space-y-2">{items.length ? items.map(item => <div key={item.id} className="rounded-xl bg-white p-3 text-sm"><strong>{item.full_name || item.title || item.status || 'Activity'}</strong><p className="text-xs text-slate-500">{item.university_email || item.mail || formatDate(item.created_at)}</p></div>) : <p className="text-sm text-slate-500">No records.</p>}</div></div>; }
function Table({ title, headers, rows }) { return <section className="mt-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"><h2 className="p-6 text-2xl font-black text-[#18004d]">{title}</h2><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-blue-50"><tr>{headers.map(h => <th key={h} className="px-4 py-3 text-xs uppercase tracking-wide text-[#18004d]">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i} className="border-t border-blue-50">{row.map((cell, j) => <td key={j} className="max-w-sm px-4 py-3 text-slate-700">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">No records found.</td></tr>}</tbody></table></div></section>; }
function ContentTable({ title, items, profiles, table, onDelete }) { return <Table title={title} headers={['Title', 'Added by', 'Status', 'Created', 'Action']} rows={items.map(item => { const ownerId = item.uploaded_by || item.seller_id || item.user_id; const owner = profiles.find(profile => profile.id === ownerId); return [item.title || item.file_name || 'Untitled', owner?.full_name || owner?.university_email || owner?.mail || ownerId || '—', item.status || item.resource_type || '—', formatDate(item.created_at), <Action danger onClick={() => onDelete(table, item, item.title || item.file_name || 'record')}>Delete</Action>]; })} />; }
function AdminChart({ stats }) { const items = Object.entries(stats); const max = Math.max(1, ...items.map(([, value]) => value)); return <div className="mt-8 space-y-4" role="img" aria-label="Horizontal chart of platform statistics">{items.map(([label, value]) => <div key={label} className="grid grid-cols-[90px_1fr_35px] items-center gap-3"><span className="text-xs font-semibold text-slate-500">{label}</span><div className="h-3 overflow-hidden rounded-sm bg-slate-100"><div className="h-full rounded-sm bg-[#174b82]" style={{ width: `${Math.max(3, value / max * 100)}%` }} /></div><strong className="text-right text-sm text-slate-700">{value}</strong></div>)}</div>; }
