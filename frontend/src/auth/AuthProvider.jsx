import { useEffect, useState } from 'react';
import api, { clearTokens, getAccessToken, saveTokens } from '../api/client';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" if there is a saved token to check
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));

  // On page load: if a token is saved, fetch the profile (API Home 4.1)
  useEffect(() => {
    if (!getAccessToken()) return;
    api.get('/auth/me/')
      .then((res) => setUser(res.data))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  async function login(militaryId, password) {
    const { data } = await api.post('/auth/login/', { military_id: militaryId, password });
    saveTokens(data.access, data.refresh);
    setUser(data.user);
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}