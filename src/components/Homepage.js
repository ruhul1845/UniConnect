import { Link, useOutletContext } from 'react-router-dom';
import HomeNotificationFeed from './HomeNotificationFeed';

const features = [
  ['📚', 'Academic Resources', 'Batch-wise slides, books, lab sheets, mid-term and final question banks.'],
  ['🛒', 'Student Marketplace', 'Buy and sell hardware, textbooks, software licenses and academic items.'],
  ['🏠', 'Housing & To-Let', 'Find flats, sublets and compatible roommates near campus.'],
  ['🚨', 'Safety SOS', 'Emergency contacts, SOS trigger guidance and recent safety alerts.'],
];

const notices = [
  ['APR 18', 'Mid-term question bank upload window is now open for assigned CRs.'],
  ['APR 16', 'Safety directory updated with medical and proctorial emergency contacts.'],
  ['APR 12', 'Housing listings now support CSE-only visibility and availability toggles.'],
  ['APR 10', 'Marketplace listings can now start direct in-app buyer/seller chat.'],
];

const news = [
  ['Resource Archive Upgraded', 'New batch, semester and course-wise resource navigation is available.', 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=900&q=80'],
  ['Electronics Marketplace',
    'Find affordable laptops, books, calculators, and other student essentials.',
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80",],
  ['Housing Support', 'Find nearby seats, sublets and roommate matches with schedule compatibility.', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80'],
  ['Safety First', 'SOS guidance and emergency support are available from one dedicated route.', 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=900&q=80'],
];

export default function Homepage() {
  const { session } = useOutletContext() || {};

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
        <div className="uc-stat"><strong>500+</strong><span>Verified Students</span></div>
        <div className="uc-stat"><strong>1200+</strong><span>Academic Resources</span></div>
        <div className="uc-stat"><strong>300+</strong><span>Marketplace Items</span></div>
        <div className="uc-stat"><strong>24/7</strong><span>Safety Support</span></div>
      </div>

      {/* Real-time Notifications Feed */}
      {session && <HomeNotificationFeed session={session} />}

      <section className="uc-section">
        <div className="uc-section-head">
          <div>
            <p className="uc-eyebrow">Quick access</p>
            <h2>Everything students need in one portal</h2>
          </div>
        </div>
        <div className="uc-grid-4">
          {features.map(([icon, title, text, link]) => (
            <div
              className="uc-card py-4 px-5 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(250,204,21,0.35)]"
              key={title}
            >
              <span className="uc-icon">{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section >


      <section className="uc-section" style={{ paddingTop: 0 }}>
        <div className="uc-grid-3" style={{ alignItems: 'start' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <h2>Department News & Events</h2>
            <div className="uc-grid-2" style={{ marginTop: 24 }}>
              {news.map(([title, text, img]) => (
                <article className="uc-card" key={title}>
                  <img className="uc-news-img" src={img} alt={title} />
                  <div className="uc-card-pad">
                    <span className="uc-badge uc-badge-blue">UniConnect</span>
                    <h3 style={{ marginTop: 14 }}>{title}</h3>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <aside className="uc-card">
            <div className="uc-card-pad">
              <p className="uc-eyebrow">Official notices</p>
              <h3>Latest Updates</h3>
            </div>
            {notices.map(([date, text]) => (
              <div className="uc-notice" key={text}>
                <div className="uc-date">{date.split(' ')[1]}<small>{date.split(' ')[0]}</small></div>
                <p>{text}</p>
              </div>
            ))}
          </aside>
        </div>
      </section>
    </>
  );
}
