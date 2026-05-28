import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80 px-6 py-4 mb-8 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand & Links */}
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 m-0">
            EventFlow <span className="font-light text-slate-500 text-base">Orchestrator</span>
          </h1>
          
          {/* Unified segment button styling for clean navigation */}
          {user.role === 'Committee' && (
            <div className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-sm font-medium">
              {[
                { name: 'Dashboard', path: '/' },
                { name: 'Setup Event', path: '/setup' },
                { name: 'Teams', path: '/teams' },
                { name: 'Comms', path: '/comms' },
                { name: 'Evaluations', path: '/evaluation' }
              ].map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-white text-blue-600 shadow-sm font-semibold"
                        : "text-slate-600 hover:text-blue-600 hover:bg-white/50"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side Profile & CTA */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-semibold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            Role: {user.role}
          </div>
          
          <button 
            onClick={handleLogout}
            className="text-sm px-4 py-2 text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-xl font-medium transition-all duration-200 border border-slate-200 hover:border-red-100"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
export { Navbar };