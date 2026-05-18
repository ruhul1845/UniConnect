import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
          <span className="uc-logo">UC</span>
          <span><strong>UniConnect</strong><small>CSE Departmental Hub</small></span>
        </div>
        <p className="uc-eyebrow-dark">Secure student access</p>
        <h2>Student Login</h2>
        <p>Use your verified university email to access resources, marketplace, housing and safety tools.</p>
        <form onSubmit={handleLogin}>
          <div><label className="uc-label">University Email</label><input className="uc-input" type="email" placeholder="name@du.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="uc-label">Password</label><input className="uc-input" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button className="uc-btn uc-btn-gold w-full" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
        </form>
        <p className="mt-5 text-sm text-slate-600">New here? <Link className="font-black text-uniBlue" to="/signup">Create account</Link></p>
      </section>
    </main>
  );
}
