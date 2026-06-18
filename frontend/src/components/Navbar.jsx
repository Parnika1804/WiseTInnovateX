import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from '../ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 px-4 md:px-6 py-3 md:py-4 mb-8 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Brand */}
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 m-0 dark:from-blue-400 dark:to-indigo-400 m-0">
            EventFlow <span className="font-light text-slate-500 dark:text-slate-400 text-base hidden sm:inline">Orchestrator</span>
          </h1>

          {/* Desktop Navigation */}
          {user.role === 'Committee' && (
            <div className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl text-sm font-medium transition-colors duration-300">
              {[
                { name: "Dashboard", path: "/dashboard" },
                { name: "Setup", path: "/setup" },
                { name: "Teams", path: "/teams" },
                { name: "Comms", path: "/comms" },
                { name: "Results", path: "/evaluation" }
              ].map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-1.5 rounded-lg text-sm transition-all duration-200 font-semibold ${isActive
                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop User Actions */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{user.role}</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-200 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 bg-slate-50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-medium transition-all duration-200 border border-slate-200 dark:border-slate-700 hover:border-red-100 dark:hover:border-red-800 shadow-sm"
          >
            Sign Out
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 focus:outline-none p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg px-4 py-4 animate-fade-in-up z-50">
          {user.role === 'Committee' && (
            <div className="flex flex-col gap-2 mb-4">
              {[
                { name: "Dashboard", path: "/dashboard" },
                { name: "Setup", path: "/setup" },
                { name: "Teams", path: "/teams" },
                { name: "Comms", path: "/comms" },
                { name: "Results", path: "/evaluation" }
              ].map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm transition-all duration-200 ${isActive
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Role: {user.role}</span>
            <button onClick={handleLogout} className="text-sm font-medium text-red-600 dark:text-red-400">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;