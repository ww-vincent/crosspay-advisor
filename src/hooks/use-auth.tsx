'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface AuthUser {
  username: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => false,
  logout: () => {},
  isLoading: true,
});

const TEST_USERS: Record<string, { password: string; role: string }> = {
  test_stu: { password: '111', role: 'Student' },
  test_worker: { password: '222', role: 'Worker' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('mercury-auth');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem('mercury-auth');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    const testUser = TEST_USERS[username];
    if (testUser && testUser.password === password) {
      const authUser = { username, role: testUser.role };
      setUser(authUser);
      sessionStorage.setItem('mercury-auth', JSON.stringify(authUser));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('mercury-auth');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
