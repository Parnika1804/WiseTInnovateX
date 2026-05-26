import React from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (role) => {
    login(role);
    // Redirect based on role
    if (role === 'Committee') navigate('/');
    if (role === 'Judge') navigate('/judge-dashboard');
    if (role === 'Participant') navigate('/participant-portal');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-gray-50 rounded-xl border border-gray-200 mt-10 p-8 shadow-sm">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome to EventFlow</h2>
      <p className="text-gray-500 mb-8">Please select your role to continue.</p>
      
      <div className="flex gap-4">
        <button 
          onClick={() => handleLogin('Committee')} 
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Committee Member
        </button>
        <button 
          onClick={() => handleLogin('Judge')} 
          className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
          Event Judge
        </button>
        <button 
          onClick={() => handleLogin('Participant')} 
          className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
        >
          Participant
        </button>
      </div>
    </div>
  );
};

export default Login;