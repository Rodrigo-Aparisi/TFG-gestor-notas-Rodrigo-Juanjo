import { tokenStore } from '../tokenStore';

describe('tokenStore', () => {
  afterEach(() => tokenStore.clear());

  it('returns null when no token is set', () => {
    expect(tokenStore.get()).toBeNull();
  });

  it('stores and returns the access token', () => {
    tokenStore.set('abc.def.ghi');
    expect(tokenStore.get()).toBe('abc.def.ghi');
  });

  it('clears the token', () => {
    tokenStore.set('abc.def.ghi');
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });

  it('does not persist the token in localStorage', () => {
    tokenStore.set('secret-token');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
