import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { normalizeRole } from '../auth/roles';

const sections = [
  { key: 'resources', table: 'resources', owner: 'uploaded_by', label: 'Resources', href: '/resources' },
  { key: 'products', table: 'products', owner: 'seller_id', label: 'Marketplace listings', href: '/my-listings' },
  { key: 'housing', table: 'housing_listings', owner: 'user_id', label: 'Housing listings', href: '/housing/my-listings' },
  { key: 'sos', table: 'sos_events', owner: 'user_id', label: 'SOS events', href: '/safety' },
];

export default function DashboardPage({ session, profile }) {
  const [activity, setActivity] = useState({ resources: [], products: [], housing: [], sos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const role = normalizeRole(profile);

  useEffect(() => {
    let active = true;
    async function loadActivity() {
      setLoading(true);
      const results = await Promise.all(sections.map(({ table, owner }) =>
        supabase.from(table).select('*').eq(owner, session.user.id).order('created_at', { ascending: false }).limit(8)
      ));
      if (!active) return;
      const next = {};
      sections.forEach((section, index) => { next[section.key] = results[index].data || []; });
      setActivity(next);
      const failed = results.find((result) => result.error);
      setError(failed ? 'Some activity could not be loaded. Check that the database migration has been applied.' : '');
      setLoading(false);
    }
    loadActivity();
    return () => { active = false; };
  }, [session.user.id]);

  const total = useMemo(() => Object.values(activity).reduce((sum, items) => sum + items.length, 0), [activity]);
  const name = profile?.full_name || session.user.email?.split('@')[0] || 'Student';

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5] px-6 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">{role} dashboard</p>
          <h1 className="mt-3 text-4xl font-black">Welcome, {name}</h1>
          <p className="mt-3 text-blue-100">Your UniConnect contributions and activity in one place.</p>
          {role === 'admin' && <Link to="/admin" className="mt-6 inline-flex rounded-full bg-yellow-400 px-5 py-3 font-black text-[#18004d]">Open Admin Console</Link>}
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-6 py-10">
        {error && <p role="alert" className="mb-5 rounded-2xl bg-amber-50 p-4 text-amber-800">{error}</p>}
        <div className="mb-6 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <strong className="text-4xl font-black text-[#18004d]">{loading ? '…' : total}</strong>
          <p className="text-sm font-bold text-slate-500">Recent activities</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <section key={section.key} className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-[#18004d]">{section.label}</h2>
                <Link to={section.href} className="text-sm font-black text-blue-700">View all</Link>
              </div>
              <p className="mt-1 text-sm text-slate-500">{activity[section.key].length} recent</p>
              <div className="mt-4 space-y-3">
                {!loading && activity[section.key].length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Nothing here yet.</p>}
                {activity[section.key].map((item) => (
                  <div key={item.id} className="rounded-2xl bg-blue-50 p-4">
                    <p className="font-bold text-[#18004d]">{item.title || item.file_name || item.action || 'SOS alert'}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{item.status || item.resource_type || 'created'} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'recently'}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
