import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(() => {
    // Przy starcie sprawdzamy, czy token istnieje w przeglądarce
    const token = localStorage.getItem('token');
    return token ? { token } : null;
  });

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);