import { render, screen } from '@testing-library/react';
import App from './App';
import { supabase } from './supabaseClient';

jest.mock('./supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  },
}));
jest.mock('./hook/useNotifications', () => () => ({ notifications: [], unreadCount: 0, isInitialized: true, markAllRead: jest.fn(), clearAll: jest.fn() }));

function profileQuery(profile) {
  return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }) };
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
  supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  supabase.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
  supabase.from.mockImplementation(() => profileQuery(null));
});

test('opens the public home page for a guest', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { name: /connect with your department digitally/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /login/i })).toHaveAttribute('href', '/login');
});

test('redirects a guest from a protected feature to login', async () => {
  window.history.pushState({}, '', '/resources');
  render(<App />);
  expect(await screen.findByRole('heading', { name: /student login/i })).toBeInTheDocument();
});

test('redirects a signed-in admin from login to the admin console', async () => {
  const session = { user: { id: 'admin-id', email: 'admin@du.ac.bd' } };
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  supabase.from.mockImplementation((table) => {
    if (table === 'profiles') {
      const builder = {
        eq: () => ({ maybeSingle: async () => ({ data: { id: 'admin-id', role: 'admin', full_name: 'Admin' }, error: null }) }),
        order: async () => ({ data: [{ id: 'admin-id', role: 'admin', full_name: 'Admin' }], error: null }),
      };
      return { select: () => builder };
    }
    const result = Promise.resolve({ data: [], error: null });
    const builder = { select: () => builder, order: () => result };
    return builder;
  });
  window.history.pushState({}, '', '/login');
  render(<App />);
  expect(await screen.findByRole('heading', { name: /admin console/i })).toBeInTheDocument();
});
