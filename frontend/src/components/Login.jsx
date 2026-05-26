import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  // Your VIP Admin Emails
  const allowedEmails = [
    'malikaarti6905@gmail.com',
    'iec2024029@iiita.ac.in',
    'ankitaak2312@gmail.com',
    'tweetdiaries935@gmail.com'
  ];

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (allowedEmails.includes(email.toLowerCase().trim())) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Access Denied. Email not authorized for this demo.');
    }
  };

  const handleRoleSelect = (role) => {
    login(role);
    
    // Extract the part before the @ to use as their username!
    const username = email.split('@')[0];
    
    if (role === 'Committee') {
      navigate('/dashboard'); 
    }
    
    if (role === 'Judge') {
      // Automatically creates a token with THEIR name, assigning them to grade Team 1
      const judgeData = { judgeName: username, teamId: 1 };
      const dynamicJudgeToken = btoa(JSON.stringify(judgeData));
      navigate(`/judge-dashboard?token=${dynamicJudgeToken}`);
    }
    
    if (role === 'Participant') {
      const participantData = { id: 1 };
      const dynamicParticipantToken = btoa(JSON.stringify(participantData));
      navigate(`/participant-portal?token=${dynamicParticipantToken}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-gray-50 rounded-xl border border-gray-200 mt-10 p-8 shadow-sm">
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome to EventFlow</h2>
      
      {!isAuthenticated ? (
        <div className="w-full max-w-md mt-6">
          <p className="text-gray-500 mb-4 text-center">Please enter your authorized email to access the system.</p>
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button 
              type="submit" 
              className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-900 transition-colors"
            >
              Verify Email
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-center mt-6 w-full animate-fade-in">
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md mb-6 w-full text-center border border-green-200">
            ✅ Authenticated as: <strong>{email}</strong>
          </div>
          <p className="text-gray-500 mb-6">Select your module:</p>
          <div className="flex gap-4">
            <button 
              onClick={() => handleRoleSelect('Committee')} 
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Event Setup & Teams
            </button>
            <button 
              onClick={() => handleRoleSelect('Judge')} 
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            >
              Evaluation Portal
            </button>
            <button 
              onClick={() => handleRoleSelect('Participant')} 
              className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
            >
              Participant Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;