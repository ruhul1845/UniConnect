import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { isCseEmail } from '../auth/emailPolicy';

export default function VerifyEmailPage({ session, profile, onVerified }) {
  const navigate = useNavigate();
  const email = profile?.university_email || session?.user?.email || '';
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile?.email_verified === true) navigate('/dashboard', { replace: true });
  }, [navigate, profile?.email_verified]);

  if (!session) return <Navigate to="/login" replace />;
  if (!isCseEmail(email)) return <Navigate to="/dashboard" replace />;

  async function sendCode() {
    setSending(true); setMessage('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setSending(false);
    setMessage(error ? error.message : `A new code was sent to ${email}.`);
  }

  async function verify(event) {
    event.preventDefault();
    setVerifying(true); setMessage('');
    const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
    if (otpError) {
      setVerifying(false); setMessage(otpError.message); return;
    }
    const { error: profileError } = await supabase.rpc('mark_cs_email_verified');
    setVerifying(false);
    if (profileError) { setMessage(`Code accepted, but profile verification failed: ${profileError.message}`); return; }
    setMessage('Email verified. Opening your dashboard…');
    onVerified?.();
  }

  return <main className="uc-auth-wrap">
    <section className="uc-auth-card">
      <div className="uc-brand mb-5"><img className="uc-logo" src="/logonav.png" alt="UniConnect" /><span><strong>UniConnect</strong><small>CSE Departmental Hub</small></span></div>
      <p className="uc-eyebrow-dark">One last step</p>
      <h2>Verify your CSE email</h2>
      <p>Enter the one-time code sent to <strong>{email}</strong>.</p>
      {message && <div role="status" className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-[#071a3d]">{message}</div>}
      <form onSubmit={verify}>
        <div><label className="uc-label">Verification code</label><input className="uc-input text-center text-xl tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} maxLength="8" required autoFocus /></div>
        <button className="uc-btn uc-btn-gold w-full" disabled={verifying}>{verifying ? 'Verifying…' : 'Verify email'}</button>
      </form>
      <button type="button" onClick={sendCode} disabled={sending} className="mt-4 w-full text-sm font-bold text-[#071a3d] disabled:opacity-60">{sending ? 'Sending…' : 'Resend code'}</button>
    </section>
  </main>;
}
