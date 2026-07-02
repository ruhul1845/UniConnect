import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiActivity, FiBookOpen, FiCamera, FiHome, FiLogOut, FiMenu, FiPackage, FiShield, FiUser, FiX } from 'react-icons/fi';
import { supabase } from '../supabaseClient';
import { normalizeRole } from '../auth/roles';
import { isCseEmail } from '../auth/emailPolicy';

const sections = [
  { key: 'resources', table: 'resources', owner: 'uploaded_by', label: 'Resources', href: '/resources', icon: FiBookOpen, color: '#1d4ed8' },
  { key: 'products', table: 'products', owner: 'seller_id', label: 'Marketplace', href: '/my-listings', icon: FiPackage, color: '#7c3aed' },
  { key: 'housing', table: 'housing_listings', owner: 'user_id', label: 'Housing', href: '/housing/my-listings', icon: FiHome, color: '#047857' },
  { key: 'sos', table: 'sos_events', owner: 'user_id', label: 'SOS alerts', href: '/safety', icon: FiShield, color: '#be123c' },
];

const drawerItems = [
  { key: 'overview', label: 'Overview', icon: FiActivity },
  { key: 'profile', label: 'My profile', icon: FiUser },
  { key: 'activity', label: 'My activity', icon: FiBookOpen },
];

export default function DashboardPage({ session, profile, onProfileUpdated }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activity, setActivity] = useState({ resources: [], products: [], housing: [], sos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestedView = searchParams.get('view');
  const [activeView, setActiveView] = useState(drawerItems.some((item) => item.key === requestedView) ? requestedView : 'overview');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = normalizeRole(profile);

  useEffect(() => {
    let active = true;
    async function loadActivity() {
      setLoading(true);
      const results = await Promise.all(sections.map(({ table, owner }) =>
        supabase.from(table).select('*').eq(owner, session.user.id).order('created_at', { ascending: false }).limit(20)
      ));
      if (!active) return;
      const next = {};
      sections.forEach((section, index) => { next[section.key] = results[index].data || []; });
      setActivity(next);
      setError(results.some((result) => result.error) ? 'A few activity records could not be loaded.' : '');
      setLoading(false);
    }
    loadActivity();
    return () => { active = false; };
  }, [session.user.id]);

  const counts = useMemo(() => sections.map((section) => ({ ...section, value: activity[section.key].length })), [activity]);
  const total = counts.reduce((sum, item) => sum + item.value, 0);
  const name = profile?.full_name || session.user.email?.split('@')[0] || 'Student';
  const viewTitle = { overview: 'Dashboard', profile: 'My profile', activity: 'My activity' }[activeView];

  useEffect(() => {
    if (drawerItems.some((item) => item.key === requestedView)) setActiveView(requestedView);
  }, [requestedView]);

  const selectView = (key) => {
    setActiveView(key);
    setSearchParams(key === 'overview' ? {} : { view: key });
    setDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6fa]">
      <div className="grid w-full lg:grid-cols-[270px_minmax(0,1fr)]">
        <DashboardDrawer profile={profile} session={session} role={role} activeView={activeView} onSelect={selectView} className="hidden lg:block" />
        <main className="min-w-0 px-5 py-7 md:px-10 md:py-10 xl:px-12">
          <header className="mb-8 flex items-center justify-between gap-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[#a67800]">{role} workspace</p><h1 className="mt-1 text-3xl font-bold text-[#171b2e] md:text-4xl">{viewTitle}</h1><p className="mt-2 text-sm text-slate-500">Welcome back, {name}. Here is what is happening with your UniConnect account.</p></div>
            <button type="button" onClick={() => setDrawerOpen(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#14182b] text-xl text-white lg:hidden" aria-label="Open dashboard menu"><FiMenu /></button>
          </header>
          {error && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
          {activeView === 'overview' && <Overview counts={counts} total={total} activity={activity} loading={loading} role={role} />}
          {activeView === 'profile' && <ProfileEditor session={session} profile={profile} onProfileUpdated={onProfileUpdated} />}
          {activeView === 'activity' && <ActivityView activity={activity} loading={loading} />}
        </main>
      </div>

      {drawerOpen && <div className="fixed inset-0 z-[70] bg-slate-950/40 lg:hidden" onClick={() => setDrawerOpen(false)}>
        <div className="absolute left-0 top-0 h-full w-[min(300px,88vw)] overflow-y-auto bg-[#14182b] shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setDrawerOpen(false)} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white" aria-label="Close dashboard menu"><FiX /></button>
          <DashboardDrawer profile={profile} session={session} role={role} activeView={activeView} onSelect={selectView} />
        </div>
      </div>}
    </div>
  );
}

function DashboardDrawer({ profile, session, role, activeView, onSelect, className = '' }) {
  const navigate = useNavigate();
  const name = profile?.full_name || session.user.email?.split('@')[0] || 'Student';
  const logout = async () => { await supabase.auth.signOut(); navigate('/'); };
  return <aside className={`min-h-screen bg-[#14182b] text-white ${className}`}>
    <div className="sticky top-0 flex min-h-screen flex-col px-5 py-7">
      <div className="flex items-center gap-3 px-2"><img src="/logonav.png" alt="UniConnect" className="h-12 w-12 rounded-xl object-contain" /><div><strong className="block text-lg">UniConnect</strong><span className="block text-[10px] uppercase tracking-[0.16em] text-slate-400">Dashboard</span></div></div>
      <p className="mb-2 mt-10 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
      <nav className="space-y-1" aria-label="Dashboard sections">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"><FiHome className="text-lg" />Home</Link>
        {drawerItems.map(({ key, label, icon: Icon }) => <button type="button" key={key} onClick={() => onSelect(key)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition ${activeView === key ? 'bg-[#f5bd28] text-[#14182b]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}><Icon className="text-lg" />{label}</button>)}
        {role === 'admin' && <Link to="/admin" className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><FiShield className="text-lg" />Admin console</Link>}
      </nav>
      <p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Explore</p>
      <nav className="space-y-1">
        {sections.map(({ key, label, href, icon: Icon }) => <Link key={key} to={href} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"><Icon className="text-lg" />{label}</Link>)}
      </nav>
      <button type="button" onClick={logout} className="mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-400 hover:bg-white/10 hover:text-white"><FiLogOut className="text-lg" />Logout</button>
      <div className="mt-auto rounded-2xl bg-[#242a40] p-4">
        <div className="flex items-center gap-3">{profile?.avatar_url ? <img src={profile.avatar_url} alt={`${name} profile`} className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fff3c4] font-bold text-[#14182b]">{name.charAt(0).toUpperCase()}</div>}<div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="truncate text-xs capitalize text-slate-400">{role} account</p></div></div>
        <p className="mt-3 truncate border-t border-white/10 pt-3 text-[11px] text-slate-500">{session.user.email}</p>
      </div>
    </div>
  </aside>;
}

function Overview({ counts, total, activity, loading }) {
  return <div className="space-y-7">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {counts.map(({ key, label, value, icon: Icon, color }) => <div key={key} className="group relative overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${color}, ${color}88, transparent)` }} />
        <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full opacity-[0.08]" style={{ backgroundColor: color }} />
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 shadow-inner ring-1 ring-slate-100 transition group-hover:scale-105" style={{ color }}><Icon /></span>
          <span className="font-serif text-[2rem] font-bold leading-none text-[#070a2d]">{loading ? '–' : value}</span>
        </div>
        <div className="mt-5">
          <p className="text-sm font-bold text-[#26314f]">{label}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Your total</p>
        </div>
      </div>)}
    </section>
    <section className="grid gap-7 xl:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Contribution mix</p><h2 className="mt-1 text-xl font-bold text-[#071a3d]">Your platform activity</h2></div><strong className="text-2xl text-[#071a3d]">{total}</strong></div>
        <BarChart items={counts} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent</p><h2 className="mt-1 text-xl font-bold text-[#071a3d]">Latest changes</h2>
        <RecentItems activity={activity} loading={loading} />
      </div>
    </section>
  </div>;
}

function BarChart({ items }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return <div className="mt-8 flex h-56 items-end gap-4 border-b border-slate-200 px-2" role="img" aria-label="Bar chart of user activity">
    {items.map((item) => <div key={item.key} className="flex h-full flex-1 flex-col justify-end text-center"><span className="mb-2 text-xs font-bold text-slate-500">{item.value}</span><div className="mx-auto w-full max-w-14 rounded-t-md transition-all" style={{ height: `${Math.max(8, (item.value / max) * 150)}px`, backgroundColor: item.color }} /><span className="mt-3 truncate text-[11px] font-semibold text-slate-500">{item.label}</span></div>)}
  </div>;
}

function RecentItems({ activity, loading }) {
  const recent = Object.values(activity).flat().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);
  if (loading) return <p className="mt-6 text-sm text-slate-500">Loading activity…</p>;
  if (!recent.length) return <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Your recent work will appear here.</p>;
  return <div className="mt-5 divide-y divide-slate-100">{recent.map((item) => <div className="py-3" key={item.id}><p className="truncate text-sm font-semibold text-slate-800">{item.title || item.file_name || item.action || 'SOS alert'}</p><p className="mt-1 text-xs text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'} · {item.status || item.resource_type || 'Created'}</p></div>)}</div>;
}

function ActivityView({ activity, loading }) {
  return <div><div className="mb-6"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">History</p><h2 className="mt-1 text-2xl font-bold text-[#071a3d]">Your activity</h2></div><div className="grid gap-5 md:grid-cols-2">{sections.map((section) => <section key={section.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-bold text-[#071a3d]">{section.label}</h3><Link to={section.href} className="text-xs font-bold text-blue-700">View all</Link></div><div className="mt-4 space-y-2">{!loading && !activity[section.key].length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nothing here yet.</p>}{activity[section.key].slice(0, 8).map((item) => <div key={item.id} className="rounded-xl border border-slate-100 p-3"><p className="truncate text-sm font-semibold">{item.title || item.file_name || item.action || 'SOS alert'}</p><p className="mt-1 text-xs text-slate-400">{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently'}</p></div>)}</div></section>)}</div></div>;
}

function ProfileEditor({ session, profile, onProfileUpdated }) {
  const fileInput = useRef(null);
  const [form, setForm] = useState({ full_name: profile?.full_name || '', mobile: profile?.mobile || '' });
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordCode, setPasswordCode] = useState('');
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const accountEmail = profile?.university_email || session.user.email || '';
  const requiresPasswordOtp = isCseEmail(accountEmail);

  function chooseAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { setMessage('Choose a JPG, PNG or WebP image under 3 MB.'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setMessage('Photo selected. Save your profile to upload it.');
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!form.full_name.trim()) return setMessage('Please enter your full name.');
    if (form.mobile && !/^\+?[0-9][0-9\s-]{7,16}$/.test(form.mobile)) return setMessage('Enter a valid mobile number.');
    setSaving(true); setMessage('');
    try {
      let avatarUrl = profile?.avatar_url || null;
      if (avatarFile) {
        const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${session.user.id}/profile.${extension}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
      }
      const { error } = await supabase.from('profiles').update({ full_name: form.full_name.trim(), mobile: form.mobile.trim() || null, avatar_url: avatarUrl }).eq('id', session.user.id);
      if (error) throw error;
      setAvatarFile(null); setMessage('Profile saved successfully.'); onProfileUpdated?.();
    } catch (error) { setMessage(`Could not save profile: ${error.message}`); }
    finally { setSaving(false); }
  }

  async function sendPasswordCode() {
    setChangingPassword(true); setPasswordMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email: accountEmail, options: { shouldCreateUser: false } });
    setChangingPassword(false);
    if (error) return setPasswordMessage(error.message);
    setPasswordCodeSent(true);
    setPasswordMessage(`A password-change code was sent to ${accountEmail}.`);
  }

  async function changePassword() {
    if (newPassword.length < 8) return setPasswordMessage('Use at least 8 characters for the new password.');
    setChangingPassword(true); setPasswordMessage('');
    if (requiresPasswordOtp) {
      if (!passwordCodeSent || !passwordCode.trim()) { setChangingPassword(false); return setPasswordMessage('Send and enter the verification code first.'); }
      const { error: otpError } = await supabase.auth.verifyOtp({ email: accountEmail, token: passwordCode.trim(), type: 'email' });
      if (otpError) { setChangingPassword(false); return setPasswordMessage(otpError.message); }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) return setPasswordMessage(error.message);
    setNewPassword(''); setPasswordCode(''); setPasswordCodeSent(false);
    setPasswordMessage('Password changed successfully.');
  }

  const name = form.full_name || 'User';
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 px-6 py-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account settings</p><h2 className="mt-1 text-2xl font-bold text-[#071a3d]">My profile</h2></div>
    <form onSubmit={saveProfile} className="grid gap-8 p-6 md:grid-cols-[190px_1fr] md:p-8">
      <div className="text-center">
        <div className="relative mx-auto h-36 w-36">
          {avatarPreview ? <img src={avatarPreview} alt="Profile preview" className="h-36 w-36 rounded-full border-4 border-white object-cover shadow-lg ring-1 ring-slate-200" /> : <div className="grid h-36 w-36 place-items-center rounded-full bg-[#e8eef8] text-5xl font-bold text-[#071a3d] ring-1 ring-slate-200">{name.charAt(0).toUpperCase()}</div>}
          <button type="button" onClick={() => fileInput.current?.click()} className="absolute bottom-1 right-1 grid h-11 w-11 place-items-center rounded-full border-4 border-white bg-[#071a3d] text-white shadow-md" aria-label="Upload profile photo"><FiCamera /></button>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} className="hidden" />
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-400">JPG, PNG or WebP<br />Maximum 3 MB</p>
      </div>
      <div className="space-y-5">
        {message && <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-[#071a3d]">{message}</div>}
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Full name</span><input className="uc-input !rounded-xl" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength="80" /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Mobile number</span><input className="uc-input !rounded-xl" type="tel" placeholder="+880 1XXXXXXXXX" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></label>
        <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Verified university email</span><input className="uc-input !rounded-xl !bg-slate-50 !text-slate-500" value={profile?.university_email || session.user.email || ''} disabled /></label>
        <div className="flex justify-end pt-2"><button type="submit" disabled={saving} className="rounded-xl bg-[#071a3d] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save profile'}</button></div>
        <div className="border-t border-slate-200 pt-6">
          <h3 className="font-bold text-[#071a3d]">Change password</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{requiresPasswordOtp ? 'CSE accounts require an email code before the password can be changed.' : 'Temporary testing accounts do not require email verification.'}</p>
          {passwordMessage && <div role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{passwordMessage}</div>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">New password</span><input className="uc-input !rounded-xl" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" /></label>
            {requiresPasswordOtp && <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Email code</span><input className="uc-input !rounded-xl" inputMode="numeric" value={passwordCode} onChange={(event) => setPasswordCode(event.target.value.replace(/\D/g, ''))} placeholder="Verification code" /></label>}
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            {requiresPasswordOtp && <button type="button" onClick={sendPasswordCode} disabled={changingPassword} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-[#071a3d] disabled:opacity-60">{passwordCodeSent ? 'Resend code' : 'Send code'}</button>}
            <button type="button" onClick={changePassword} disabled={changingPassword} className="rounded-xl bg-[#071a3d] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{changingPassword ? 'Please wait…' : 'Change password'}</button>
          </div>
        </div>
      </div>
    </form>
  </section>;
}
