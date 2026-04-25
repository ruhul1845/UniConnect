import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

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

import ResourcesPage from './pages/ResourcesPage';
import HousingPage from './pages/HousingPage';
import SafetyPage from './pages/SafetyPage';
import AdminPage from './pages/AdminPage';

function ProtectedPage({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <UniLayout session={session}>
      {children}
    </UniLayout>
  );
}

function PublicOnlyPage({ session, children }) {
  if (session) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="rounded-3xl border border-blue-100 bg-white px-8 py-6 text-center shadow-xl">
          <p className="text-sm font-black uppercase tracking-widest text-yellow-500">
            UniConnect
          </p>
          <p className="mt-2 font-bold text-[#18004d]">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyPage session={session}>
              <Login />
            </PublicOnlyPage>
          }
        />

        <Route
          path="/signup"
          element={
            <PublicOnlyPage session={session}>
              <Signup />
            </PublicOnlyPage>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedPage session={session}>
              <Homepage />
            </ProtectedPage>
          }
        />

        <Route
          path="/resources"
          element={
            <ProtectedPage session={session}>
              <ResourcesPage />
            </ProtectedPage>
          }
        />

        <Route
          path="/marketplace"
          element={
            <ProtectedPage session={session}>
              <Marketplace />
            </ProtectedPage>
          }
        />

        <Route
          path="/housing"
          element={
            <ProtectedPage session={session}>
              <HousingPage />
            </ProtectedPage>
          }
        />

        <Route
          path="/safety"
          element={
            <ProtectedPage session={session}>
              <SafetyPage />
            </ProtectedPage>
          }
        />

        <Route
          path="/conversations"
          element={
            <ProtectedPage session={session}>
              <Conversations />
            </ProtectedPage>
          }
        />

        <Route
          path="/chat/:conversationId"
          element={
            <ProtectedPage session={session}>
              <Chat />
            </ProtectedPage>
          }
        />

        <Route
          path="/product/:id"
          element={
            <ProtectedPage session={session}>
              <ProductDetails />
            </ProtectedPage>
          }
        />

        <Route
          path="/sell"
          element={
            <ProtectedPage session={session}>
              <SellItem />
            </ProtectedPage>
          }
        />

        <Route
          path="/my-listings"
          element={
            <ProtectedPage session={session}>
              <MyListings />
            </ProtectedPage>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedPage session={session}>
              <AdminPage />
            </ProtectedPage>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;