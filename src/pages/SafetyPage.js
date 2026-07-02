import { useEffect, useRef, useState } from 'react';
import { PageHero } from '../components/UniLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { supabase } from '../supabaseClient';
import { FaRegHandPointRight } from 'react-icons/fa';

const contacts = [
  { name: 'National Emergency', phone: '999' },
  { name: 'Campus Security', phone: process.env.REACT_APP_CAMPUS_SECURITY_PHONE || '999' },
  { name: 'Medical Help', phone: process.env.REACT_APP_MEDICAL_PHONE || '999' },
  { name: 'Proctorial Body', phone: process.env.REACT_APP_PROCTOR_PHONE || '999' },
];

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({});
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      () => resolve({}),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });
}

export default function SafetyPage({ session }) {
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [event, setEvent] = useState(null);
  const [message, setMessage] = useState('Press and hold the SOS button for 3 seconds.');
  const holdTimer = useRef(null);
  const progressTimer = useRef(null);
  const countdownTimer = useRef(null);

  useEffect(() => () => {
    clearTimeout(holdTimer.current);
    clearInterval(progressTimer.current);
    clearInterval(countdownTimer.current);
  }, []);

  async function beginSOS() {
    if (countdown !== null || event?.status === 'active') return;
    setHolding(true);
    setHoldProgress(0);
    const started = Date.now();
    progressTimer.current = setInterval(() => setHoldProgress(Math.min(100, ((Date.now() - started) / 3000) * 100)), 80);
    holdTimer.current = setTimeout(triggerSOS, 3000);
  }

  function stopHolding() {
    if (!holding) return;
    clearTimeout(holdTimer.current);
    clearInterval(progressTimer.current);
    setHolding(false);
    setHoldProgress(0);
  }

  async function triggerSOS() {
    clearInterval(progressTimer.current);
    setHolding(false);
    setHoldProgress(100);
    setMessage('Getting your location and preparing the alert…');
    const location = await getLocation();
    const payload = { user_id: session.user.id, status: 'pending', ...location };
    const { data, error } = await supabase.from('sos_events').insert([payload]).select().single();
    if (error) {
      setHoldProgress(0);
      setMessage(`Could not create SOS alert: ${error.message}`);
      return;
    }
    setEvent(data);
    setCountdown(5);
    setMessage('SOS prepared. Cancel now if this was accidental.');
    let remaining = 5;
    countdownTimer.current = setInterval(async () => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimer.current);
        const { data: activated, error: updateError } = await supabase.from('sos_events').update({ status: 'active', activated_at: new Date().toISOString() }).eq('id', data.id).select().single();
        if (updateError) setMessage(`Alert saved but activation failed: ${updateError.message}`);
        else {
          setEvent(activated);
          setMessage('SOS alert is active. Contact emergency services if you can do so safely.');
        }
        setCountdown(null);
      }
    }, 1000);
  }

  async function cancelSOS() {
    clearTimeout(holdTimer.current);
    clearInterval(progressTimer.current);
    clearInterval(countdownTimer.current);
    if (event?.id) await supabase.from('sos_events').update({ status: 'cancelled', resolved_at: new Date().toISOString() }).eq('id', event.id);
    setEvent(null);
    setCountdown(null);
    setHolding(false);
    setHoldProgress(0);
    setMessage('SOS cancelled. Press and hold again if you need help.');
  }

  return <>
    <PageHero danger eyebrow="Emergency support" title="Safety & Emergency Support" subtitle="Send a location-aware SOS alert and quickly call emergency contacts." />
    <main className="mx-auto max-w-7xl px-6 py-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-8 text-center">
          <button
            type="button"
            aria-label="Hold for 3 seconds to trigger SOS"
            onPointerDown={beginSOS}
            onPointerUp={stopHolding}
            onPointerLeave={stopHolding}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) beginSOS(); }}
            onKeyUp={(e) => { if (e.key === 'Enter' || e.key === ' ') stopHolding(); }}
            className="relative mx-auto grid h-48 w-48 touch-none place-items-center overflow-hidden rounded-full bg-red-600 text-5xl font-black text-white shadow-2xl shadow-red-200 ring-8 ring-red-100"
          >
            <span className="absolute bottom-0 left-0 w-full bg-red-800/50 transition-all" style={{ height: `${holdProgress}%` }} />
            <span className="relative">SOS</span>
          </button>
          <h2 className="mt-8 text-3xl font-black text-uniBlue">{countdown !== null ? `Sending in ${countdown}…` : event?.status === 'active' ? 'Alert active' : 'Hold for 3 seconds'}</h2>
          <p role="status" className="mt-2 text-slate-600">{message}</p>
          {(holding || countdown !== null || event) && <Button className="mt-6" variant="outline" onClick={cancelSOS}>Cancel SOS</Button>}
        </Card>
        <Card className="p-6">
          <p className="text-xs font-black uppercase tracking-widest text-uniGold">Safety status</p>
          <h2 className="mt-2 text-2xl font-black text-uniBlue">How your alert works</h2>
          <div className="mt-5 space-y-3">
            {['Hold prevents accidental taps', 'You get 5 seconds to cancel', 'Your available GPS coordinates are stored securely', 'Admins can see and resolve active alerts'].map((t, index) => (
              <div
                className="uc-safety-step flex items-center gap-3 rounded-2xl bg-blue-50 p-4 font-semibold text-uniBlue"
                style={{ animationDelay: `${index * 140}ms` }}
                key={t}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#f0b400] shadow-sm">
                  <FaRegHandPointRight />
                </span>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-500">SOS does not replace calling emergency services. If you are in immediate danger, call 999.</p>
        </Card>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {contacts.map(({ name, phone }) => <Card className="p-5" key={name}><h3 className="font-black text-uniBlue">{name}</h3><p className="mt-2 text-sm text-slate-500">{phone}</p><a href={`tel:${phone}`} className="mt-4 inline-flex w-full justify-center rounded-full bg-[#18004d] px-5 py-2.5 text-sm font-extrabold text-white">Call Now</a></Card>)}
      </div>
    </main>
  </>;
}
