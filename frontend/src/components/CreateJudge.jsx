import React, { useState } from 'react';
import axios from 'axios';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const CreateJudge = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleCreateJudge = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ message: 'Generating magic link and dispatching email...', type: 'info' });

    try {
      const res = await axios.post('http://localhost:8000/auth/create-judge', { name, email });
      setStatus({ message: '✅ Judge invited! Magic link emailed successfully.', type: 'success' });
      
      // Trigger Toast
      const count = res.data?.judge_invite_emails_drafted || 1;
      notifyEmailDraft(count);

      setName('');
      setEmail('');
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail || 'Failed to invite judge. Check backend logs.';
      setStatus({ message: `❌ ${detail}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ... (Rest of the JSX remains exactly the same)
  return (
  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 mb-8">

    <div className="flex items-start gap-4 mb-8">

      <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl">
        👨‍⚖️
      </div>

      <div>
        <h3 className="text-2xl font-bold text-slate-900">
          Invite a Judge
        </h3>

        <p className="mt-1 text-slate-500">
          Generate secure magic links for evaluators to assess all finalist teams.
        </p>
      </div>

    </div>

    <form onSubmit={handleCreateJudge} className="space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Judge Name
          </label>

          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Dr. Alan Turing"
            className="
              w-full
              rounded-2xl
              border border-slate-200
              bg-slate-50
              px-5 py-4
              outline-none
              transition-all
              focus:bg-white
              focus:ring-4 focus:ring-indigo-100
              focus:border-indigo-500
            "
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Email Address
          </label>

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="judge@university.edu"
            className="
              w-full
              rounded-2xl
              border border-slate-200
              bg-slate-50
              px-5 py-4
              outline-none
              transition-all
              focus:bg-white
              focus:ring-4 focus:ring-indigo-100
              focus:border-indigo-500
            "
          />
        </div>

      </div>

      <div className="flex flex-col gap-4">

        <button
          type="submit"
          disabled={loading}
          className={`
            rounded-2xl
            px-8
            py-4
            font-semibold
            text-white
            transition-all
            duration-300
            ${
              loading
                ? "bg-indigo-300 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/25"
            }
          `}
        >
          {loading
            ? "Generating Magic Link..."
            : "Generate & Send Magic Link"}
        </button>

        <p className="text-sm text-slate-500">
          ✓ Links are securely generated and sent directly to judges.
        </p>

      </div>

      {status.message && (
        <div
          className={`
            rounded-2xl
            p-4
            text-sm
            font-medium
            ${
              status.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : status.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }
          `}
        >
          {status.message}
        </div>
      )}

    </form>

  </div>
);
};

export default CreateJudge;