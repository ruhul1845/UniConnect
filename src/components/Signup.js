import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith('@du.ac.bd') && !cleanEmail.endsWith('@cs.du.ac.bd')) {
      alert('Please use your official university email!');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: fullName || cleanEmail.split('@')[0] } },
    });

    if (!error && data?.user?.id) {
      await supabase.from('profiles').upsert([
        {
          id: data.user.id,
          mail: cleanEmail,
          full_name: fullName || cleanEmail.split('@')[0],
          role: 'Student',
          is_cr: false,
          is_admin: false,
        },
      ]);
    }

    setLoading(false);
    if (error) alert(error.message);
    else alert('Success! Check your email to confirm your account.');
  };

  return (
    <main className="uc-auth-wrap">
      <section className="uc-auth-card">
        <div className="uc-brand mb-6">
          <span className="uc-logo">UC</span>
          <span><strong>UniConnect</strong><small>CSE Departmental Hub</small></span>
        </div>
        <p className="uc-eyebrow-dark">Join verified hub</p>
        <h2>Create Account</h2>
        <p>Register using your university email. Social verification can be added later from profile settings.</p>
        <form onSubmit={handleSignup}>
          <div><label className="uc-label">Full Name</label><input className="uc-input" type="text" placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div><label className="uc-label">University Email</label><input className="uc-input" type="email" placeholder="name@du.ac.bd" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><label className="uc-label">Password</label><input className="uc-input" type="password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button className="uc-btn uc-btn-gold w-full" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Sign Up'}</button>
        </form>
        <p className="mt-5 text-sm text-slate-600">Already have an account? <Link className="font-black text-uniBlue" to="/login">Login</Link></p>
      </section>
    </main>
  );
}
