import { act, fireEvent, render, screen } from '@testing-library/react';
import SafetyPage from './SafetyPage';
import { supabase } from '../supabaseClient';

jest.mock('../supabaseClient', () => ({ supabase: { from: jest.fn() } }));

function sosQuery() {
  const pending = { id: 'sos-1', user_id: 'user-1', status: 'pending' };
  const active = { ...pending, status: 'active' };
  const builder = {
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    select: jest.fn(() => builder),
    single: jest.fn()
      .mockResolvedValueOnce({ data: pending, error: null })
      .mockResolvedValueOnce({ data: active, error: null }),
    then: (resolve) => resolve({ error: null }),
  };
  return builder;
}

beforeEach(() => {
  jest.useFakeTimers();
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (success) => success({ coords: { latitude: 23.7, longitude: 90.4, accuracy: 10 } }) },
  });
});

afterEach(() => jest.useRealTimers());

test('holding SOS creates an alert and activates it after the cancellation window', async () => {
  const query = sosQuery();
  supabase.from.mockReturnValue(query);
  render(<SafetyPage session={{ user: { id: 'user-1' } }} />);
  const button = screen.getByRole('button', { name: /hold for 3 seconds to trigger sos/i });
  fireEvent.pointerDown(button);
  await act(async () => { jest.advanceTimersByTime(3000); await Promise.resolve(); await Promise.resolve(); });
  expect(query.insert).toHaveBeenCalledWith([expect.objectContaining({ user_id: 'user-1', status: 'pending', latitude: 23.7 })]);
  expect(screen.getByText(/sending in 5/i)).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(5000); await Promise.resolve(); await Promise.resolve(); });
  expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  expect(screen.getByText(/alert active/i)).toBeInTheDocument();
});

test('emergency contact buttons use telephone links', () => {
  supabase.from.mockReturnValue(sosQuery());
  render(<SafetyPage session={{ user: { id: 'user-1' } }} />);
  expect(screen.getAllByRole('link', { name: /call now/i })[0]).toHaveAttribute('href', 'tel:999');
});
