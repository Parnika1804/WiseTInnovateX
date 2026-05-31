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
  const [scoredTeamIds, setScoredTeamIds] = useState([]); 
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');

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

      login({ token, user: { name: payload.name, email: payload.email, role: 'Judge' } });
      setJudgeName(payload.name);
    } catch (err) {
      console.error("Invalid JWT", err);
      setTokenError(true);
    }
  }, [token]);

  useEffect(() => {
    if (!judgeName) return;

    axios.get(`${API}/event/config`)
      .then(res => {
        if (res.data.status === 'found' && res.data.config.scoring) {
          setMaxScore(res.data.config.scoring.max_score || 10);
        }
      }).catch(console.error);

    axios.get(`${API}/teams`)
      .then(res => {
        const approved = res.data.filter(t => t.status === 'APPROVED');
        setTeams(approved);
        if (approved.length > 0) setSelectedTeam(approved[0]);
      }).catch(console.error);

    fetchScoredTeams();
  }, [judgeName]);

  const fetchScoredTeams = () => {
    if (!judgeName) return;
    axios.get(`${API}/scores/judge/${encodeURIComponent(judgeName)}`)
      .then(res => setScoredTeamIds(res.data.map(s => s.team_id)))
      .catch(console.error);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    
    if (parseFloat(score) < 0 || parseFloat(score) > maxScore) {
      setSubmitStatus(`❌ Score must be between 0 and ${maxScore}.`);
      return;
    }

    setSubmitting(true);
    setSubmitStatus('');
    try {
      await axios.post(`${API}/scores/submit`, {
        team_id: selectedTeam.id,
        judge_name: judgeName,
        score: parseFloat(score),
        notes,
      });
      
      setSubmitStatus(`✅ Score submitted for ${selectedTeam.name}!`);
      setScore('');
      setNotes('');
      fetchScoredTeams(); 
      
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
        <p>A secure magic link is required to access the Judge Portal.</p>
      </div>
    </div>
  );

  if (!judgeName) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500">Verifying access...</div>
    </div>
  );

  // Extract unique project links
  const uniqueProjectLinks = selectedTeam?.members
    ? Array.from(new Set(selectedTeam.members.map(m => m.project_link).filter(link => link && link.trim() !== '')))
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-8 py-5">
        <h2 className="text-xl font-bold">Judge Evaluation Portal</h2>
        <p className="text-slate-400 text-sm mt-1">
          Welcome, <span className="text-white font-semibold">{judgeName}</span>
          {' '}· Evaluated <span className="text-green-400 font-semibold">{scoredTeamIds.length}</span> / {teams.length} teams
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {teams.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-800">
            <p className="font-semibold">No approved teams available yet.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {teams.map(t => {
                const isScored = scoredTeamIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTeam(t); setScore(''); setNotes(''); setSubmitStatus(''); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-2 ${
                      selectedTeam?.id === t.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : isScored 
                          ? 'bg-green-50 text-green-700 border-green-200 hover:border-green-400' 
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {t.name} {isScored && '✓'}
                  </button>
                )
              })}
            </div>

            {selectedTeam && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Team Portfolio & Projects</h3>
                    
                    {uniqueProjectLinks.length > 0 && (
                      <div className="mb-6 pb-6 border-b border-slate-100 flex flex-wrap gap-3">
                        {uniqueProjectLinks.map((link, idx) => (
                          <a 
                            key={idx} href={link} target="_blank" rel="noreferrer" 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm text-sm"
                          >
                            📦 View Team Project {uniqueProjectLinks.length > 1 ? `#${idx + 1}` : ''}
                          </a>
                        ))}
                      </div>
                    )}

                    {selectedTeam.members && selectedTeam.members.length > 0 ? (
                      selectedTeam.members.map(m => (
                        <div key={m.id} className="mb-4 last:mb-0 p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="font-semibold text-slate-800">
                            {m.name} <span className="text-sm font-normal text-slate-500">({m.skill})</span>
                          </p>
                          {m.tech_stack && (
                            <p className="text-sm text-slate-600 mt-1">
                              <span className="font-medium text-slate-700">Tech Stack:</span> {m.tech_stack}
                            </p>
                          )}
                          <div className="flex gap-4 mt-3 text-sm">
                            {m.resume_link ? (
                              <a href={m.resume_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                📄 View Resume
                              </a>
                            ) : (
                              <span className="text-slate-400">No resume</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No member data available.</p>
                    )}
                  </div>

                  <AssessmentGuide teamId={selectedTeam.id} />
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-fit">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Evaluation — <span className="text-blue-600">{selectedTeam.name}</span>
                  </h3>
                  
                  {scoredTeamIds.includes(selectedTeam.id) ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center mt-4">
                      <div className="text-green-500 text-5xl mb-4">✅</div>
                      <h3 className="text-xl font-bold text-green-900 mb-2">Score Locked In</h3>
                      <p className="text-sm text-green-700">
                        You have successfully completed the evaluation for {selectedTeam.name}.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Final Score (0–{maxScore})
                        </label>
                        <input
                          type="number" step="0.1" min="0" max={maxScore}
                          value={score} onChange={e => setScore(e.target.value)} required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Max ${maxScore}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Evaluation Notes</label>
                        <textarea
                          value={notes} onChange={e => setNotes(e.target.value)} required
                          rows={5}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                          placeholder="Provide reasoning for your score..."
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
                          submitStatus.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {submitStatus}
                        </div>
                      )}
                    </form>
                  )}
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