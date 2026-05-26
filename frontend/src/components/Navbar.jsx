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

  // Only show the navbar if someone is logged in
  if (!user) return null;

  return (
    <nav className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-4 mb-6 shadow-sm">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-gray-800 m-0">EventFlow Orchestrator</h1>
        
        {/* Only show these links to the Committee */}
        {user.role === 'Committee' && (
          <div className="flex gap-4 text-sm font-medium">
            <Link to="/" className={location.pathname === '/' ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}>Dashboard</Link>
            <Link to="/setup" className={location.pathname === '/setup' ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}>Setup Event</Link>
            <Link to="/teams" className={location.pathname === '/teams' ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}>Teams</Link>
            <Link to="/comms" className={location.pathname === '/comms' ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}>Comms</Link>
            <Link to="/evaluation" className={location.pathname === '/evaluation' ? "text-blue-600" : "text-gray-600 hover:text-blue-600"}>Evaluations</Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-semibold">
          Role: {user.role}
        </span>
        <button 
          onClick={handleLogout}
          className="text-sm px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;