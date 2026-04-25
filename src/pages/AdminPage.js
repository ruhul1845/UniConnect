import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('cr');

  const [crEmail, setCrEmail] = useState('');
  const [crBatch, setCrBatch] = useState('');

  const [profiles, setProfiles] = useState([]);
  const [crUsers, setCrUsers] = useState([]);
  const [resources, setResources] = useState([]);

  const [stats, setStats] = useState({
    users: 0,
    resources: 0,
    listings: 0,
    sos: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);

    try {
      const profilesResult = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      const crResult = await supabase
        .from('cr')
        .select('*')
        .order('created_at', { ascending: false });

      const resourcesResult = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      const productsResult = await supabase
        .from('products')
        .select('*');

      const sosResult = await supabase
        .from('sos_events')
        .select('*');

      setProfiles(profilesResult.data || []);
      setCrUsers(crResult.data || []);
      setResources(resourcesResult.data || []);

      setStats({
        users: profilesResult.data?.length || 0,
        resources: resourcesResult.data?.length || 0,
        listings: productsResult.data?.length || 0,
        sos: sosResult.data?.length || 0,
      });
    } catch (error) {
      console.error('Admin data fetch error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const isValidVarsityEmail = (email) => {
    const clean = email.trim().toLowerCase();

    return (
      clean.endsWith('@du.ac.bd') ||
      clean.endsWith('@cs.du.ac.bd')
    );
  };

  const assignCRByEmail = async () => {
    if (!crEmail.trim()) {
      alert('Please enter student email');
      return;
    }

    if (!crBatch.trim()) {
      alert('Please enter batch');
      return;
    }

    const cleanEmail = crEmail.trim().toLowerCase();

    if (!isValidVarsityEmail(cleanEmail)) {
      alert('Please enter a valid DU varsity email, for example name@du.ac.bd or name@cs.du.ac.bd');
      return;
    }

    setLoading(true);

    try {
      const { data: matchedProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('university_email', cleanEmail)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!matchedProfile) {
        alert('No profile found with this university_email');
        return;
      }

      const crPayload = {
        name: matchedProfile.full_name || cleanEmail.split('@')[0],
        university_email: cleanEmail,
        batch: crBatch.trim(),
      };

      const { error: crError } = await supabase
        .from('cr')
        .upsert([crPayload], {
          onConflict: 'university_email',
        });

      if (crError) throw crError;

      alert(`${cleanEmail} assigned as CR for Batch ${crBatch}`);

      setCrEmail('');
      setCrBatch('');
      fetchAdminData();
    } catch (error) {
      alert('CR assignment failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeCR = async (crUser) => {
    const confirmDelete = window.confirm(
      `Remove CR role from ${crUser.university_email}?`
    );

    if (!confirmDelete) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('cr')
        .delete()
        .eq('id', crUser.id);

      if (error) throw error;

      alert('CR removed successfully');
      fetchAdminData();
    } catch (error) {
      alert('Failed to remove CR: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteResource = async (resource) => {
    const confirmDelete = window.confirm(
      `Delete resource "${resource.title || resource.file_name || 'Untitled'}"?`
    );

    if (!confirmDelete) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resource.id);

      if (error) throw error;

      alert('Resource deleted successfully');
      fetchAdminData();
    } catch (error) {
      alert('Resource delete failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const recentUsers = useMemo(() => {
    return profiles.slice(0, 6);
  }, [profiles]);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-[#18004d] px-6 py-16 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-[#061A40] via-[#123C69] to-[#1E88E5]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.25),transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-yellow-300">
            UniConnect Admin
          </p>

          <h1 className="mt-4 text-4xl font-black md:text-6xl">
            Admin Dashboard
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-blue-50">
            Manage CR roles, uploaded resources, platform statistics, and departmental activity.
          </p>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-slate-200/50">
          <AdminMenuButton
            label="Overview"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />

          <AdminMenuButton
            label="CR Role Assignment"
            active={activeTab === 'cr'}
            onClick={() => setActiveTab('cr')}
          />

          <AdminMenuButton
            label="Resources"
            active={activeTab === 'resources'}
            onClick={() => setActiveTab('resources')}
          />

          <AdminMenuButton
            label="Analytics"
            active={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
          />
        </aside>

        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard title="Users" value={stats.users} />
            <StatCard title="Resources" value={stats.resources} />
            <StatCard title="Listings" value={stats.listings} />
            <StatCard title="SOS Events" value={stats.sos} />
          </div>

          {activeTab === 'overview' && (
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-slate-200/50">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-500">
                  Overview
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#18004d]">
                  Platform Summary
                </h2>
                <p className="mt-2 text-slate-600">
                  This dashboard gives a quick summary of users, resources, marketplace listings, and SOS activity.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-3xl bg-blue-50 p-5">
                  <h3 className="text-xl font-black text-[#18004d]">
                    Recent Users
                  </h3>

                  <div className="mt-4 space-y-3">
                    {recentUsers.length === 0 ? (
                      <p className="text-sm text-slate-500">No users found.</p>
                    ) : (
                      recentUsers.map((user) => (
                        <div
                          key={user.id}
                          className="rounded-2xl bg-white p-4 shadow-sm"
                        >
                          <p className="font-bold text-[#18004d]">
                            {user.full_name || 'Unnamed User'}
                          </p>
                          <p className="text-sm text-slate-500">
                            {user.university_email || 'No university email'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-3xl bg-yellow-50 p-5">
                  <h3 className="text-xl font-black text-[#18004d]">
                    Admin Notes
                  </h3>

                  <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-700">
                    <li>• Admin assigns CR by university email.</li>
                    <li>• CR data is saved in the separate <code>cr</code> table.</li>
                    <li>• Matching uses <code>profiles.university_email</code> and <code>cr.university_email</code>.</li>
                    <li>• Resources page shows upload button only for CR/Admin.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cr' && (
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-slate-200/50">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-500">
                  CR Management
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#18004d]">
                  Assign CR Role by University Email
                </h2>

              </div>



              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px_auto]">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#18004d]">
                    Student University Email
                  </label>
                  <input
                    type="email"
                    value={crEmail}
                    onChange={(e) => setCrEmail(e.target.value)}
                    placeholder="name@du.ac.bd"
                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#18004d]">
                    Batch
                  </label>
                  <input
                    type="text"
                    value={crBatch}
                    onChange={(e) => setCrBatch(e.target.value)}
                    placeholder="2021"
                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={assignCRByEmail}
                    disabled={loading}
                    className="rounded-full bg-yellow-400 px-6 py-3 font-black text-[#18004d] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? 'Saving...' : 'Assign CR'}
                  </button>
                </div>
              </div>

              <div className="mt-8 overflow-x-auto rounded-2xl border border-blue-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-blue-50 text-xs uppercase tracking-wide text-[#18004d]">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">University Email</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {crUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No CR assigned yet.
                        </td>
                      </tr>
                    ) : (
                      crUsers.map((crUser) => (
                        <tr key={crUser.id} className="border-t border-blue-50">
                          <td className="px-4 py-3 font-bold text-[#18004d]">
                            {crUser.name || 'Unnamed CR'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {crUser.university_email}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-[#18004d]">
                              Batch {crUser.batch}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeCR(crUser)}
                              className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-slate-200/50">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-500">
                  Resources
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#18004d]">
                  Uploaded Resources
                </h2>
                <p className="mt-2 text-slate-600">
                  Admin can view and delete uploaded resources from the archive.
                </p>
              </div>

              <div className="mt-8 overflow-x-auto rounded-2xl border border-blue-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-blue-50 text-xs uppercase tracking-wide text-[#18004d]">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {resources.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-4 py-8 text-center text-slate-500"
                        >
                          No resources uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      resources.map((resource) => (
                        <tr key={resource.id} className="border-t border-blue-50">
                          <td className="px-4 py-3 font-bold text-[#18004d]">
                            {resource.title || resource.file_name || 'Untitled'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {resource.resource_type || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {resource.course_code || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {resource.batch || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {resource.year || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => deleteResource(resource)}
                              className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-600 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-slate-200/50">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-500">
                  Analytics
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#18004d]">
                  Platform Analytics
                </h2>
                <p className="mt-2 text-slate-600">
                  Basic analytics summary from Supabase tables.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                <AnalyticsCard
                  title="Total Users"
                  value={stats.users}
                  description="Total profile records found in profiles table."
                />

                <AnalyticsCard
                  title="Total Resources"
                  value={stats.resources}
                  description="Total academic resources uploaded."
                />

                <AnalyticsCard
                  title="Marketplace Listings"
                  value={stats.listings}
                  description="Total products available in marketplace table."
                />

                <AnalyticsCard
                  title="SOS Events"
                  value={stats.sos}
                  description="Total emergency events recorded."
                />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function AdminMenuButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`mb-2 w-full rounded-2xl px-4 py-3 text-left text-sm font-black transition ${active
        ? 'bg-[#18004d] text-white'
        : 'text-[#18004d] hover:bg-blue-50'
        }`}
    >
      {label}
    </button>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-xl shadow-slate-200/50">
      <strong className="block text-3xl font-black text-[#18004d]">
        {value}
      </strong>
      <span className="mt-2 block text-sm font-bold text-slate-500">
        {title}
      </span>
    </div>
  );
}

function AnalyticsCard({ title, value, description }) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-slate-500">
        {title}
      </p>
      <h3 className="mt-2 text-4xl font-black text-[#18004d]">
        {value}
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  );
}