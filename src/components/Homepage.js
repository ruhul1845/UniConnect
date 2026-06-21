import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import HomeNotificationFeed from './HomeNotificationFeed';
import { supabase } from '../supabaseClient';

const features = [
  ['📚', 'Academic Resources', 'Batch-wise slides, books, lab sheets, mid-term and final question banks.', '/resources'],
  ['🛒', 'Student Marketplace', 'Buy and sell hardware, textbooks, software licenses and academic items.', '/marketplace'],
  ['🏠', 'Housing & To-Let', 'Find flats, sublets and compatible roommates near campus.', '/housing'],
  ['🚨', 'Safety SOS', 'Emergency contacts, SOS trigger guidance and recent safety alerts.', '/safety'],
];

export default function Homepage({ session }) {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadStats() {
      if (!session?.user?.id) {
        setStats(null);
        setStatsError('Login to view live platform statistics.');
        return;
      }

      const results = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('resources').select('id', { count: 'exact', head: true }),
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('housing_listings').select('id', { count: 'exact', head: true }),
      ]);
      if (!active) return;

      const failed = results.find((result) => result.error);
      if (failed) {
        console.error('Platform stats error:', failed.error.message);
        setStatsError(failed.error.message);
        setStats(null);
        return;
      }

      setStatsError('');
      setStats({
        registered_students: results[0].count,
        academic_resources: results[1].count,
        marketplace_items: results[2].count,
        housing_listings: results[3].count,
      });
    }
    loadStats();
    return () => { active = false; };
  }, [session?.user?.id]);

  const statItems = [
    [stats?.registered_students, 'Registered Students'],
    [stats?.academic_resources, 'Academic Resources'],
    [stats?.marketplace_items, 'Marketplace Items'],
    [stats?.housing_listings, 'Housing Listings'],
  ];

  return (
    <>
      <section className="uc-home-hero">
        <div className="uc-hero-content">
          <p className="uc-eyebrow">University student service platform</p>
          <h1>Connect With Your Department Digitally</h1>
          <p className="uc-lead">Academic resources, student marketplace, housing and safety tools for verified CSE students in one clean blue, golden and white hub.</p>
          <div className="uc-hero-actions">
            <Link className="uc-btn uc-btn-gold" to="/resources">Explore Resources</Link>
            <Link className="uc-btn uc-btn-gold" to="/marketplace">Open Marketplace</Link>
          </div>
        </div>
      </section>

      <div className="uc-floating-stats">
        {statItems.map(([value, label]) => (
          <div className="uc-stat" key={label}>
            <strong>{statsError ? '—' : stats ? Number(value || 0).toLocaleString() : '…'}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {statsError && (
        <p role="alert" className="mx-auto mt-3 max-w-5xl px-6 text-center text-sm font-bold text-red-700">
          {session ? 'Live statistics are unavailable. Please refresh and try again.' : statsError}
        </p>
      )}

      <section className="uc-section">
        <div className="uc-section-head">
          <div>
            <p className="uc-eyebrow">Quick access</p>
            <h2>Everything students need in one portal</h2>
          </div>
        </div>
        <div className="uc-grid-4">
          {features.map(([icon, title, text, link]) => (
            <Link
              to={link}
              className="uc-card py-4 px-5 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(250,204,21,0.35)]"
              key={title}
            >
              <span className="uc-icon">{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </Link>
          ))}
        </div>
      </section >

      <section className="uc-section" style={{ paddingTop: 0 }}>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
          <div className="pt-4">
            <p className="uc-eyebrow">Campus activity</p>
            <h2 className="mt-2">Department News & Events</h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-600">
              Real departmental updates and activity notifications appear here—without placeholder news cards.
            </p>
          </div>
          <HomeNotificationFeed session={session} />
        </div>
      </section>
    </>
  );
}
