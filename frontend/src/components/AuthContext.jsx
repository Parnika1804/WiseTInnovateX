import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  /**
   * Call this after a successful /auth/login or /auth/register response.
   * Pass the full response object: { token, user: { id, name, email, role } }
   *
   * Stores both the JWT and the user profile so any component can access:
   *   user.token   → real JWT for authenticated API calls (?token=...)
   *   user.id      → participant / judge ID
   *   user.name    → display name
   *   user.email
   *   user.role    → "Committee" | "Judge" | "Participant"
   */
  const login = ({ token, user: profile }) => {
    setUser({ token, ...profile });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
