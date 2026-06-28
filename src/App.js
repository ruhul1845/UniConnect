import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { hasRole } from './auth/roles';

import Login from './components/Login';
import Signup from './components/Signup';
import Homepage from './components/Homepage';
import Marketplace from './components/Marketplace';
import SellItem from './components/SellItem';
import MyListings from './components/MyListings';
import ProductDetails from './components/ProductDetails';
import Conversations from './components/Conversations';
import Chat from './components/Chat';
import UniLayout from './components/UniLayout';
import SavedItems from './components/SavedItems';
import SellerOffers from './components/SellerOffers';
import ResourcesPage from './pages/ResourcesPage';
import SafetyPage from './pages/SafetyPage';
import AdminPage from './pages/AdminPage';
import DashboardPage from './pages/DashboardPage';
import HousingPage from './pages/housing/HousingPage.jsx';
import HousingDetail from './pages/housing/HousingDetail.jsx';
import PostHousing from './pages/housing/PostHousing.jsx';
import MyHousingListings from './pages/housing/MyListings.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage';
import { needsEmailVerification } from './auth/emailPolicy';

function LayoutPage({ session, profile, children }) {
  return <UniLayout session={session} profile={profile}>{children}</UniLayout>;
}

function ProtectedPage({ session, profile, children, withLayout = true }) {
  if (!session) return <Navigate to="/login" replace />;
  if (needsEmailVerification(profile, session)) return <Navigate to="/verify-email" replace />;
  return withLayout ? <LayoutPage session={session} profile={profile}>{children}</LayoutPage> : children;
}

function RoleProtectedPage({ session, profile, allowedRoles, children, withLayout = true }) {
  if (!session) return <Navigate to="/login" replace />;
  if (needsEmailVerification(profile, session)) return <Navigate to="/verify-email" replace />;
  if (!hasRole(profile, allowedRoles)) return <Navigate to="/dashboard" replace />;
  return withLayout ? <LayoutPage session={session} profile={profile}>{children}</LayoutPage> : children;
}

function PublicOnlyPage({ session, profile, children }) {
  if (session) return <Navigate to={needsEmailVerification(profile, session) ? '/verify-email' : hasRole(profile, ['admin']) ? '/admin' : '/dashboard'} replace />;
  return children;
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileVersion, setProfileVersion] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchProfile() {
      if (!session?.user?.id) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (!active) return;
      if (error) console.error('Profile fetch error:', error.message);
      setProfile(data || { id: session.user.id, university_email: session.user.email, role: 'student' });
      setProfileLoading(false);
    }
    fetchProfile();
    return () => { active = false; };
  }, [session, profileVersion]);

  if (session === undefined || (session && profileLoading)) {
    return <div className="grid min-h-screen place-items-center bg-slate-50"><div className="rounded-3xl border border-blue-100 bg-white px-8 py-6 text-center shadow-xl"><p className="text-sm font-black uppercase tracking-widest text-yellow-500">UniConnect</p><p className="mt-2 font-bold text-[#18004d]">Loading...</p></div></div>;
  }

  const protectedRoute = (page) => <ProtectedPage session={session} profile={profile}>{page}</ProtectedPage>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<PublicOnlyPage session={session} profile={profile}><Login /></PublicOnlyPage>} />
        <Route path="/signup" element={<PublicOnlyPage session={session} profile={profile}><Signup /></PublicOnlyPage>} />
        <Route path="/verify-email" element={<VerifyEmailPage session={session} profile={profile} onVerified={() => setProfileVersion((value) => value + 1)} />} />
        <Route path="/" element={<LayoutPage session={session} profile={profile}><Homepage session={session} /></LayoutPage>} />
        <Route path="/resources" element={protectedRoute(<ResourcesPage />)} />
        <Route path="/marketplace" element={protectedRoute(<Marketplace />)} />
        <Route path="/housing" element={protectedRoute(<HousingPage />)} />
        <Route path="/safety" element={protectedRoute(<SafetyPage session={session} />)} />
        <Route path="/conversations" element={protectedRoute(<Conversations />)} />
        <Route path="/chat/:conversationId" element={protectedRoute(<Chat />)} />
        <Route path="/product/:id" element={protectedRoute(<ProductDetails />)} />
        <Route path="/sell" element={protectedRoute(<SellItem />)} />
        <Route path="/my-listings" element={protectedRoute(<MyListings />)} />
        <Route path="/housing/post" element={protectedRoute(<PostHousing />)} />
        <Route path="/housing/my-listings" element={protectedRoute(<MyHousingListings />)} />
        <Route path="/housing/edit/:id" element={protectedRoute(<PostHousing />)} />
        <Route path="/housing/:id" element={protectedRoute(<HousingDetail />)} />
        <Route path="/saved-items" element={protectedRoute(<SavedItems />)} />
        <Route path="/offers/:productId" element={protectedRoute(<SellerOffers />)} />
        <Route path="/dashboard" element={<ProtectedPage session={session} profile={profile} withLayout={false}><DashboardPage session={session} profile={profile} onProfileUpdated={() => setProfileVersion((value) => value + 1)} /></ProtectedPage>} />
        <Route path="/admin" element={<RoleProtectedPage session={session} profile={profile} allowedRoles={['admin']} withLayout={false}><AdminPage session={session} profile={profile} /></RoleProtectedPage>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
