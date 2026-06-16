import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';

const API = 'http://localhost:8000';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      login(res.data);

      const { role } = res.data.user;

      if (role === 'Committee') {
        navigate('/dashboard');
      } else if (role === 'Judge') {
        navigate(`/judge-dashboard?token=${res.data.token}`);
      } else if (role === 'Participant') {
        navigate(`/participant-portal?token=${res.data.token}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Failed to log in. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob" />

        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-40 animate-blob animation-delay-2000" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>

            <span className="text-xl font-bold tracking-wider text-white">
              EventFlow
            </span>
          </div>

          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Intelligent Event <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Orchestration.
            </span>
          </h1>

          <p className="text-slate-400 text-lg max-w-md leading-relaxed">
            The command center for seamless team formation, dynamic pipeline
            management, and automated participant communication.
          </p>
        </div>

        <div className="relative z-10 text-slate-500 text-sm font-medium">
          © {new Date().getFullYear()} EventFlow Systems. All rights reserved.
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 flex items-center justify-center mb-4">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>

            <h2 className="text-3xl font-black text-slate-900">
              EventFlow
            </h2>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white p-10 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100"
          >
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Committee Login
              </h2>

              <p className="text-slate-500 text-sm font-medium">
                Access your administrative dashboard
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-semibold border border-red-100 mb-6 flex items-start gap-3">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Email Address
                </label>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@eventflow.com"
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Password
                </label>

                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-200 ${
                  loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              </button>
            </form>
          </motion.div>

          <div className="mt-8 px-6 text-center">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                <strong className="text-slate-800">
                  Are you a Participant or Judge?
                </strong>
                <br />
                You do not need a password. Please check your email inbox and
                click your secure Magic Link to access your portal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;