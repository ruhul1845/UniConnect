import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

const tabs = ['overview', 'users', 'resources', 'marketplace', 'housing', 'sos'];
const emptyData = { profiles: [], resources: [], products: [], housing: [], sos: [] };

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return <div className="min-h-screen bg-slate-50">
    <section className="bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5] px-6 py-14 text-white">
      <div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">Restricted access</p><h1 className="mt-3 text-4xl font-black md:text-6xl">Admin Console</h1><p className="mt-3 text-blue-100">Manage roles and review all platform contributions and safety events.</p></div>
    </section>
    <main className="mx-auto max-w-7xl px-6 py-10">
      {error && <div role="alert" className="mb-5 rounded-2xl bg-red-50 p-4 text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{Object.entries(stats).map(([label, value]) => <Stat key={label} label={label} value={value} />)}</div>
      <div className="mt-8 flex flex-wrap gap-2">{tabs.map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-5 py-2.5 text-sm font-black capitalize ${activeTab === tab ? 'bg-[#18004d] text-white' : 'border border-blue-100 bg-white text-[#18004d]'}`}>{tab}</button>)}</div>
      {loading && <p className="mt-8 font-bold text-slate-500">Loading admin data…</p>}
      {!loading && activeTab === 'overview' && <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black text-[#18004d]">Recent platform activity</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><Summary title="Newest users" items={data.profiles.slice(0, 5)} /><Summary title="Recent SOS events" items={data.sos.slice(0, 5)} /></div></section>}
      {!loading && activeTab === 'users' && <Table title="Users and roles" headers={['User', 'Email', 'Role', 'Actions']} rows={data.profiles.map(profile => [profile.full_name || 'Unnamed', profile.university_email || profile.mail || '—', String(profile.role || 'student').toLowerCase(), <div className="flex flex-wrap gap-2"><Action onClick={() => setUserRole(profile, 'cr')}>Make CR</Action><Action onClick={() => setUserRole(profile, 'student')}>Remove CR</Action></div>])} />}
      {!loading && activeTab === 'resources' && <ContentTable title="Uploaded resources" items={data.resources} profiles={data.profiles} table="resources" onDelete={deleteRecord} />}
      {!loading && activeTab === 'marketplace' && <ContentTable title="Marketplace listings" items={data.products} profiles={data.profiles} table="products" onDelete={deleteRecord} />}
      {!loading && activeTab === 'housing' && <ContentTable title="Housing listings" items={data.housing} profiles={data.profiles} table="housing_listings" onDelete={deleteRecord} />}
      {!loading && activeTab === 'sos' && <Table title="SOS events" headers={['User ID', 'Status', 'Location', 'Created', 'Action']} rows={data.sos.map(item => [item.user_id, item.status, item.latitude && item.longitude ? `${Number(item.latitude).toFixed(5)}, ${Number(item.longitude).toFixed(5)}` : 'Unavailable', formatDate(item.created_at), ['pending', 'active'].includes(item.status) ? <Action onClick={() => resolveSOS(item)}>Resolve</Action> : '—'])} />}
    </main>
  </div>;
}

function Stat({ label, value }) { return <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm"><strong className="block text-3xl font-black text-[#18004d]">{value}</strong><span className="text-sm font-bold text-slate-500">{label}</span></div>; }
function Action({ children, onClick, danger }) { return <button onClick={onClick} className={`rounded-full px-3 py-2 text-xs font-black ${danger ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-[#18004d]'}`}>{children}</button>; }
function formatDate(value) { return value ? new Date(value).toLocaleString() : '—'; }
function Summary({ title, items }) { return <div className="rounded-2xl bg-blue-50 p-5"><h3 className="font-black text-[#18004d]">{title}</h3><div className="mt-3 space-y-2">{items.length ? items.map(item => <div key={item.id} className="rounded-xl bg-white p-3 text-sm"><strong>{item.full_name || item.title || item.status || 'Activity'}</strong><p className="text-xs text-slate-500">{item.university_email || item.mail || formatDate(item.created_at)}</p></div>) : <p className="text-sm text-slate-500">No records.</p>}</div></div>; }
function Table({ title, headers, rows }) { return <section className="mt-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm"><h2 className="p-6 text-2xl font-black text-[#18004d]">{title}</h2><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-blue-50"><tr>{headers.map(h => <th key={h} className="px-4 py-3 text-xs uppercase tracking-wide text-[#18004d]">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i} className="border-t border-blue-50">{row.map((cell, j) => <td key={j} className="max-w-sm px-4 py-3 text-slate-700">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">No records found.</td></tr>}</tbody></table></div></section>; }
function ContentTable({ title, items, profiles, table, onDelete }) { return <Table title={title} headers={['Title', 'Added by', 'Status', 'Created', 'Action']} rows={items.map(item => { const ownerId = item.uploaded_by || item.seller_id || item.user_id; const owner = profiles.find(profile => profile.id === ownerId); return [item.title || item.file_name || 'Untitled', owner?.full_name || owner?.university_email || owner?.mail || ownerId || '—', item.status || item.resource_type || '—', formatDate(item.created_at), <Action danger onClick={() => onDelete(table, item, item.title || item.file_name || 'record')}>Delete</Action>]; })} />; }
