import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [skill, setSkill] = useState('');
  const [background, setBackground] = useState('');
  const [institution, setInstitution] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Login failed'); return; }
      setIsAuthenticated(true);
      setError('');
    } catch {
      setError('Server error — make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, skill, background, institution }),
      });
      const data = await res.json();
      if (!res.ok) {
        // If already registered, hint them to log in instead
        if (res.status === 400 && data.detail === 'Email already registered') {
          setError('Email already registered — please log in instead.');
          setMode('login');
        } else {
          setError(data.detail || 'Signup failed');
        }
        return;
      }
      setIsAuthenticated(true);
      setError('');
    } catch {
      setError('Server error — make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role) => {
    login(role);
    const username = email.split('@')[0];
    if (role === 'Committee') navigate('/dashboard');
    if (role === 'Judge') {
      const judgeData = { judgeName: username, teamId: 1 };
      navigate(`/judge-dashboard?token=${btoa(JSON.stringify(judgeData))}`);
    }
    if (role === 'Participant') {
      const participantData = { id: 1 };
      navigate(`/participant-portal?token=${btoa(JSON.stringify(participantData))}`);
    }
  };

  // ── Shared input style ──────────────────────────────────────────────────
  const inputCls = "px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50";

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-gray-50 rounded-xl border border-gray-200 mt-10 p-8 shadow-sm">
      <h2 className="text-3xl font-bold text-gray-800 mb-1">Welcome to EventFlow</h2>
      <p className="text-gray-400 text-sm mb-6">InnovateX 2025 — Event Management Platform</p>

      {!isAuthenticated ? (
        <div className="w-full max-w-md">

          {/* ── Toggle tabs ── */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              Log In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              Sign Up
            </button>
          </div>

          {/* ── Login form ── */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} className={inputCls} required />
              <input type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} className={inputCls} required />
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button type="submit" disabled={loading}
                className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {loading ? 'Logging in...' : 'Log In'}
              </button>
              <p className="text-center text-sm text-gray-400">
                Don't have an account?{' '}
                <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => setMode('signup')}>
                  Sign up
                </span>
              </p>
            </form>
          )}

          {/* ── Signup form ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <input type="text" placeholder="Full Name" value={name}
                onChange={e => setName(e.target.value)} className={inputCls} required />
              <input type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)} className={inputCls} required />
              <input type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} className={inputCls} required />
              <input type="text" placeholder="Skill (e.g. Backend Developer)" value={skill}
                onChange={e => setSkill(e.target.value)} className={inputCls} required />
              <input type="text" placeholder="Background (e.g. Computer Science)" value={background}
                onChange={e => setBackground(e.target.value)} className={inputCls} />
              <input type="text" placeholder="Institution (e.g. IIT Goa)" value={institution}
                onChange={e => setInstitution(e.target.value)} className={inputCls} />
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              <button type="submit" disabled={loading}
                className="px-6 py-3 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <span className="text-blue-500 cursor-pointer hover:underline" onClick={() => setMode('login')}>
                  Log in
                </span>
              </p>
            </form>
          )}
        </div>

      ) : (
        // ── Role selector after successful auth ──
        <div className="flex flex-col items-center mt-6 w-full animate-fade-in">
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-md mb-6 w-full text-center border border-green-200">
            ✅ Authenticated as: <strong>{email}</strong>
          </div>
          <p className="text-gray-500 mb-6">Select your module:</p>
          <div className="flex gap-4 flex-wrap justify-center">
            <button onClick={() => handleRoleSelect('Committee')}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              Event Setup & Teams
            </button>
            <button onClick={() => handleRoleSelect('Judge')}
              className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors shadow-sm">
              Evaluation Portal
            </button>
            <button onClick={() => handleRoleSelect('Participant')}
              className="px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors shadow-sm">
              Participant Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;