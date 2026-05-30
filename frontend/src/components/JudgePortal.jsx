import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AssessmentGuide from './AssessmentGuide';
import { useAuth } from './AuthContext';

const API = 'http://localhost:8000';

const JudgePortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { login } = useAuth();

  const [judgeName, setJudgeName] = useState(null);
  const [tokenError, setTokenError] = useState(false);

  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

  // Step 1: decode token and establish session
  useEffect(() => {
    if (!token) { setTokenError(true); return; }
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const payload = JSON.parse(jsonPayload);

      if (payload.role !== 'Judge') { setTokenError(true); return; }

      // Establish session in AuthContext
      login({ token, user: { name: payload.name, email: payload.email, role: 'Judge' } });
      setJudgeName(payload.name);
    } catch (err) {
      console.error("Invalid JWT", err);
      setTokenError(true);
    }
  }, [token]);

  // Step 2: load all approved teams once judge is authenticated
  useEffect(() => {
    if (!judgeName) return;
    axios.get(`${API}/teams`)
      .then(res => {
        const approved = res.data.filter(t => t.status === 'APPROVED');
        setTeams(approved);
        if (approved.length > 0) setSelectedTeam(approved[0]);
      })
      .catch(err => console.error("Could not load teams", err));
  }, [judgeName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    setSubmitting(true);
    setSubmitStatus('');
    try {
      const res = await axios.post(`${API}/scores/submit`, {
        team_id: selectedTeam.id,
        judge_name: judgeName,
        score: parseFloat(score),
        notes,
      });
      setSubmitStatus(res.data.warning
        ? `⚠️ ${res.data.warning}`
        : `✅ Score submitted for ${selectedTeam.name}!`
      );
      setScore('');
      setNotes('');
    } catch (err) {
      setSubmitStatus(`❌ ${err.response?.data?.detail || 'Submission failed.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 max-w-xl mx-auto bg-red-50 border border-red-200 rounded-xl text-center text-red-800">
        <h2 className="text-xl font-bold mb-2">Invalid or Missing Access Token</h2>
        <p>A secure magic link is required to access the Judge Portal. Please check your email for the link.</p>
      </div>
    </div>
  );

  if (!judgeName) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500">Verifying access...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white px-8 py-5">
        <h2 className="text-xl font-bold">Judge Evaluation Portal</h2>
        <p className="text-slate-400 text-sm mt-1">
          Welcome, <span className="text-white font-semibold">{judgeName}</span>
          {' '}· Evaluating <span className="text-white font-semibold">{teams.length}</span> team{teams.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {teams.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-800">
            <p className="font-semibold">No approved teams available yet.</p>
            <p className="text-sm mt-1">Check back once teams have been approved by the committee.</p>
          </div>
        ) : (
          <>
            {/* Team selector tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTeam(t); setScore(''); setNotes(''); setSubmitStatus(''); }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    selectedTeam?.id === t.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {selectedTeam && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* AI Assessment Guide */}
                <div>
                  <AssessmentGuide teamId={selectedTeam.id} />
                </div>

                {/* Score submission */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Submit Score — <span className="text-blue-600">{selectedTeam.name}</span>
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Final Score (0–10)</label>
                      <input
                        type="number" step="0.1" min="0" max="10"
                        value={score} onChange={e => setScore(e.target.value)} required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Evaluation Notes</label>
                      <textarea
                        value={notes} onChange={e => setNotes(e.target.value)} required
                        rows={5}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                      />
                    </div>
                    <button
                      type="submit" disabled={submitting}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 rounded-lg font-bold transition-colors"
                    >
                      {submitting ? 'Submitting...' : 'Lock in Evaluation'}
                    </button>
                    {submitStatus && (
                      <div className={`p-3 rounded-lg text-sm font-medium ${
                        submitStatus.startsWith('✅') ? 'bg-green-50 text-green-700' :
                        submitStatus.startsWith('⚠️') ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {submitStatus}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JudgePortal;
