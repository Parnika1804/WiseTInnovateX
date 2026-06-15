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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <h3 className="text-xl font-bold mb-1">Invite a Judge</h3>
      <p className="text-gray-500 mb-4 text-sm">
        Enter the evaluator's details. They will receive a secure magic link granting access to evaluate <strong>all teams</strong>.
      </p>

      <form onSubmit={handleCreateJudge} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judge Name</label>
          <input
            type="text" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., Dr. Alan Turing"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="judge@university.edu"
          />
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300 transition-colors"
        >
          {loading ? 'Dispatching...' : 'Generate & Send Magic Link'}
        </button>

        {status.message && (
          <div className={`p-3 rounded-lg text-sm font-medium mt-2 ${
            status.type === 'error' ? 'bg-red-50 text-red-700' :
            status.type === 'success' ? 'bg-green-50 text-green-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {status.message}
          </div>
        )}
      </form>
    </div>
  );
};

export default CreateJudge;