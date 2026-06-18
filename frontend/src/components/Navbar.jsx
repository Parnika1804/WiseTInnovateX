import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80 px-4 sm:px-6 py-4 mb-8 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 m-0">
            EventFlow <span className="font-light text-slate-500 text-base hidden sm:inline">Orchestrator</span>
          </h1>
          
          {/* Desktop Navigation */}
          {user.role === 'Committee' && (
            <div className="hidden md:flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/60">
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
                    className={`px-4 py-1.5 rounded-lg text-sm transition-all duration-200 font-semibold ${
                      isActive
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
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
          <span className="text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
            {user.role}
          </span>
          <button 
            onClick={handleLogout}
            className="text-sm font-bold text-slate-500 hover:text-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-600 hover:text-slate-900 focus:outline-none p-2"
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
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg px-4 py-4 animate-fade-in-up z-50">
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
                    className={`px-4 py-3 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg">
            <span className="text-xs font-semibold text-slate-500 uppercase">Role: {user.role}</span>
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;