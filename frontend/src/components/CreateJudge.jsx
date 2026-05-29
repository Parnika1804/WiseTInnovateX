import React, { useState } from 'react';
import axios from 'axios';

const CreateJudge = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleCreateJudge = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ message: 'Creating account & asking AI to draft email...', type: 'info' });

    try {
      const response = await axios.post('http://localhost:8000/auth/create-judge', {
        name: name,
        email: email,
        password: password // Fixed to match the backend!
      });
      
      setStatus({ message: '✅ Judge created and automated email sent successfully!', type: 'success' });
      setName('');
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error(error);
      setStatus({ message: '❌ Failed to create judge. Check backend logs.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
      <h3 className="text-xl font-bold mb-2">Create Judge Account</h3>
      <p className="text-gray-600 mb-4">
        Register a new judge. Our AI will automatically email them their login credentials and a welcoming intro.
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
          <input 
            type="text" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g., JudgeHack2026!"
          />
        </div>

        <button 
          type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold disabled:bg-blue-300 transition-colors"
        >
          {loading ? 'Processing & Sending...' : 'Create Judge & Send Invite'}
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