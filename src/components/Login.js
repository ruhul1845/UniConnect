import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) alert(error.message);
  };

  return (
    <main className="uc-auth-wrap">
      <section className="uc-auth-card">
        <div className="uc-brand mb-6">
          <img className="uc-logo" src="/logonav.png" alt="UniConnect" />
          <span><strong>UniConnect</strong><small>CSE Departmental Hub</small></span>
        </div>
        <div className="mb-5 rounded-xl border border-red-200 border-l-4 border-l-red-500 bg-red-50/80 px-4 py-3 text-xs leading-5 text-slate-700"><div className="mb-1.5 flex items-center gap-2 font-black uppercase tracking-wider text-red-700"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" /></span>Important account notice</div><strong className="text-slate-900">@cs.du.ac.bd</strong> is the official domain and requires two-step email verification. <strong className="text-slate-900">@du.ac.bd</strong> allows fake emails during testing only and will be removed in the final release.</div>
        <p className="uc-eyebrow-dark">Secure student access</p>
        <h2>Student Login</h2>
        <p>Use your verified university email to access resources, marketplace, housing and safety tools.</p>
        <form onSubmit={handleLogin}>
          <div><label className="uc-label">University Email</label><input className="uc-input" type="email" placeholder="name@cs.du.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="uc-label">Password</label><div className="relative"><input className="uc-input pr-12" type={showPassword ? 'text' : 'password'} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-3 grid place-items-center px-1 text-lg text-slate-500 hover:text-[#18004d]" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <FiEyeOff /> : <FiEye />}</button></div></div>
          <button className="uc-btn uc-btn-gold w-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>
        <p className="mt-5 text-sm text-slate-600">New here? <Link className="font-black text-uniBlue" to="/signup">Create account</Link></p>
      </section>
    </main>
  );
}
