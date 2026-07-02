import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiArrowUpRight, FiBookOpen, FiHome, FiShield, FiShoppingBag } from 'react-icons/fi';
import HomeNotificationFeed from './HomeNotificationFeed';
import { supabase } from '../supabaseClient';

const features = [
  { icon: FiBookOpen, title: 'Academic Resources', text: 'Batch-wise slides, books, lab sheets, mid-term and final question banks.', link: '/resources', tone: '#4f46e5', metric: 'Archive', image: '/module-images/resources.jpg' },
  { icon: FiShoppingBag, title: 'Student Marketplace', text: 'Buy and sell hardware, textbooks, software licenses and academic items.', link: '/marketplace', tone: '#7c3aed', metric: 'Trade', image: '/module-images/marketplace.jpg' },
  { icon: FiHome, title: 'Housing & To-Let', text: 'Find flats, sublets and compatible roommates near campus.', link: '/housing', tone: '#047857', metric: 'Living', image: '/module-images/housing.jpg' },
  { icon: FiShield, title: 'Safety SOS', text: 'Emergency contacts, SOS trigger guidance and recent safety alerts.', link: '/safety', tone: '#be123c', metric: 'Safety', image: '/module-images/safety.jpg' },
];

export default function Homepage({ session }) {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [activeFeature, setActiveFeature] = useState(0);

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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature((current) => (current + 1) % features.length);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

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
        <div className="uc-section-head uc-slider-head">
          <div>
            <p className="uc-eyebrow">Quick access</p>
            <h2>Everything students need in one portal</h2>
          </div>
          <div className="uc-slider-controls" aria-label="Module slider controls">
            <button type="button" onClick={() => setActiveFeature((activeFeature - 1 + features.length) % features.length)} aria-label="Previous module"><FiArrowLeft /></button>
            <button type="button" onClick={() => setActiveFeature((activeFeature + 1) % features.length)} aria-label="Next module"><FiArrowRight /></button>
          </div>
        </div>
        <div className="uc-module-slider" aria-label="UniConnect modules">
          <div className="uc-module-track" style={{ transform: `translateX(-${activeFeature * 100}%)` }}>
            {features.map(({ icon: Icon, title, text, link, tone, metric, image }, index) => (
              <div className="uc-module-slide" key={title}>
                <Link to={link} className="uc-module-card">
                  <div className="uc-module-copy">
                    <div className="uc-module-card-top">
                      <span className="uc-module-icon" style={{ color: tone, backgroundColor: `${tone}10` }}><Icon /></span>
                      <span className="uc-module-count">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="uc-module-body">
                      <span className="uc-module-label">{metric}</span>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                    <span className="uc-module-link">Open module <FiArrowUpRight /></span>
                  </div>
                  <div className="uc-module-photo">
                    <img src={image} alt="" loading="lazy" />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        <div className="uc-slider-dots" aria-label="Choose module slide">
          {features.map(({ title }, index) => (
            <button
              type="button"
              key={title}
              className={activeFeature === index ? 'active' : ''}
              onClick={() => setActiveFeature(index)}
              aria-label={`Show ${title}`}
              aria-current={activeFeature === index}
            />
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
