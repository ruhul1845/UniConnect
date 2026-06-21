import { hasRole, normalizeRole } from './roles';

test('normalizes legacy and current role fields', () => {
  expect(normalizeRole({ role: 'Admin' })).toBe('admin');
  expect(normalizeRole({ is_cr: true })).toBe('cr');
  expect(normalizeRole(null)).toBe('student');
});

test('checks allowed roles without granting admin accidentally', () => {
  expect(hasRole({ role: 'admin' }, ['admin'])).toBe(true);
  expect(hasRole({ role: 'cr' }, ['admin'])).toBe(false);
});
