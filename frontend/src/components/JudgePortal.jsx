import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import AssessmentGuide from './AssessmentGuide';
import { useAuth } from './AuthContext';
import { useTheme } from '../ThemeContext';

const API = 'http://localhost:8000';

const JudgePortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [judgeName, setJudgeName] = useState(null);
  const [tokenError, setTokenError] = useState(false);

  const [teams, setTeams] = useState([]);
  const [specialMentionTeams, setSpecialMentionTeams] = useState([]);
  const [scoredTeamIds, setScoredTeamIds] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [activeSection, setActiveSection] = useState('main');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [currentRound, setCurrentRound] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [mentors, setMentors] = useState([]);

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
        if (res.data.status === 'found') {
          let scoring = res.data.config.scoring;
          if (typeof scoring === 'string') scoring = JSON.parse(scoring);
          if (scoring) {
            setMaxScore(scoring.max_score || 10);
            setCurrentRound(scoring.current_round || 1);
          }
        }
      }).catch(console.error);

    axios.get(`${API}/teams?qualified_only=true`)
      .then(res => {
        setTeams(res.data);
        if (res.data.length > 0) setSelectedTeam(res.data[0]);
      }).catch(console.error);

    axios.get(`${API}/special-mention/approved`)
      .then(res => {
        const normalized = res.data.map(sm => ({
          ...sm,
          id: sm.team_id,           
          name: sm.team_name,        
        }));
        setSpecialMentionTeams(normalized);
      })
      .catch(console.error);

    fetchScoredTeams();

    axios.get(`${API}/mentors`)
      .then(res => setMentors(res.data))
      .catch(console.error);
  }, [judgeName]);

  const fetchScoredTeams = () => {
    if (!judgeName) return;
    axios.get(`${API}/scores/judge/${encodeURIComponent(judgeName)}`)
      .then(res => setScoredTeamIds(res.data.map(s => s.team_id)))
      .catch(console.error);
  };

  const handleSubmit = async () => {
    if (!selectedTeam) return;
    if (parseFloat(score) < 0 || parseFloat(score) > maxScore) {
      setSubmitStatus(`Invalid: Score must be between 0 and ${maxScore}.`);
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
      setSubmitStatus(`Score submitted for ${selectedTeam.name}.`);
      setScore('');
      setNotes('');
      fetchScoredTeams();
    } catch (err) {
      setSubmitStatus(`Error: ${err.response?.data?.detail || 'Submission failed.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="p-8 max-w-xl mx-auto bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-center text-red-800 dark:text-red-300">
        <h2 className="text-xl font-bold mb-2">Invalid or Missing Access Token</h2>
        <p>A secure link is required to access the Judge Portal.</p>
      </div>
    </div>
  );

  if (!judgeName) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="text-slate-500 dark:text-slate-400">Verifying access...</div>
    </div>
  );

  const uniqueProjectLinks = selectedTeam?.members
    ? Array.from(new Set(selectedTeam.members.map(m => m.project_link).filter(link => link && link.trim() !== '')))
    : [];

  const renderTeamCard = (t, isSpecialMention = false) => {
    const teamId = t.id;
    const teamName = t.name; 
    const isScored = scoredTeamIds.includes(teamId);
    return (
      <button
        key={teamId}
        onClick={() => { setSelectedTeam(t); setScore(''); setNotes(''); setSubmitStatus(''); }}
        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center gap-2 ${
          selectedTeam?.id === teamId
            ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700'
            : isScored
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
        }`}
      >
        {isSpecialMention && <span className="text-xs uppercase font-bold text-amber-600 dark:text-amber-500">[Special]</span>}
        {teamName} {isScored && '[Completed]'}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="bg-slate-900 dark:bg-slate-900 text-white px-8 py-5 flex justify-between items-center border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold">Judge Evaluation Portal</h2>
          <p className="text-slate-400 text-sm mt-1">
            Welcome, <span className="text-white font-semibold">{judgeName}</span>
            {' '}· Evaluated <span className="text-green-400 font-semibold">{scoredTeamIds.length}</span> / {teams.length + specialMentionTeams.length} teams
          </p>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle Dark Mode"
          className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all duration-200 border border-slate-700 shadow-sm"
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      <div className="bg-blue-600 dark:bg-blue-800 text-white px-8 py-3 flex flex-wrap items-center gap-3">
        <span className="font-bold tracking-wide">Evaluating Round {currentRound}</span>
        <span className="text-blue-200 text-sm hidden sm:inline">— Ensure scores reflect current stage criteria.</span>
        <span className="ml-auto text-blue-200 text-sm">Max score constraint: <strong className="text-white">{maxScore}</strong></span>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setActiveSection('main'); setSelectedTeam(teams[0] || null); setScore(''); setNotes(''); setSubmitStatus(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              activeSection === 'main' 
                ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
          >
            Main Finalists ({teams.length})
          </button>
          <button
            onClick={() => { setActiveSection('special'); setSelectedTeam(specialMentionTeams[0] || null); setScore(''); setNotes(''); setSubmitStatus(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
              activeSection === 'special' 
                ? 'bg-amber-500 dark:bg-amber-600 text-white border-amber-500 dark:border-amber-600' 
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
            }`}
          >
            Special Mentions ({specialMentionTeams.length})
          </button>
        </div>

        {activeSection === 'special' && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">Note: These are Special Mention wildcard entries. Score them separately — their scores do not affect main finalist rankings.</p>
          </div>
        )}

        {activeSection === 'main' && (
          teams.length === 0 ? (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center text-yellow-800 dark:text-yellow-300">
              <p className="font-semibold">No approved teams available for Round {currentRound}.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-6">
              {teams.map(t => renderTeamCard(t, false))}
            </div>
          )
        )}

        {activeSection === 'special' && (
          specialMentionTeams.length === 0 ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center text-amber-800 dark:text-amber-300">
              <p className="font-semibold">No approved Special Mention nominations yet.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-6">
              {specialMentionTeams.map(t => renderTeamCard(t, true))}
            </div>
          )
        )}

        {selectedTeam && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm mb-6 transition-colors duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Team Portfolio & Projects</h3>
                  {activeSection === 'special' && (
                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full text-xs font-bold">Special Mention</span>
                  )}
                </div>

                {(() => {
                  const mentor = mentors.find(m => m.assigned_team_id === selectedTeam.id);
                  return mentor ? (
                    <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                      <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-1">Assigned Mentor</p>
                      <p className="text-sm text-indigo-700 dark:text-indigo-400"><strong>Name:</strong> {mentor.name}</p>
                      <p className="text-sm text-indigo-700 dark:text-indigo-400"><strong>Email:</strong> {mentor.email}</p>
                      {mentor.expertise && <p className="text-sm text-indigo-700 dark:text-indigo-400"><strong>Expertise:</strong> {mentor.expertise}</p>}
                    </div>
                  ) : null;
                })()}

                {uniqueProjectLinks.length > 0 && (
                  <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3">
                    {uniqueProjectLinks.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800 shadow-sm text-sm"
                      >
                        View Team Project {uniqueProjectLinks.length > 1 ? `#${idx + 1}` : ''}
                      </a>
                    ))}
                  </div>
                )}

                {selectedTeam.members && selectedTeam.members.length > 0 ? (
                  selectedTeam.members.map(m => (
                    <div key={m.id} className="mb-4 last:mb-0 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {m.name} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({m.skill})</span>
                      </p>
                      {m.tech_stack && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Tech Stack:</span> {m.tech_stack}
                        </p>
                      )}
                      <div className="flex gap-4 mt-3 text-sm">
                        {m.resume_link ? (
                          <a href={m.resume_link} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium">
                            View Resume
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">No resume</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  selectedTeam.nominated_members && selectedTeam.nominated_members.map(m => (
                    <div key={m.id} className="mb-4 last:mb-0 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-800">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {m.name} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">({m.skill})</span>
                      </p>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Nominated wildcard finalist</span>
                    </div>
                  ))
                )}
              </div>

              {activeSection === 'main' && <AssessmentGuide teamId={selectedTeam.id} />}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm h-fit transition-colors duration-300">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Round {currentRound} Evaluation — <span className={activeSection === 'special' ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'}>{selectedTeam.name}</span>
              </h3>

              {activeSection === 'special' && (
                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Scoring as Special Mention — this score is separate from main finalist rankings.</p>
                </div>
              )}

              {scoredTeamIds.includes(selectedTeam.id) ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-8 text-center mt-4">
                  <h3 className="text-xl font-bold text-green-900 dark:text-green-300 mb-2">Score Locked In</h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    You have successfully completed the evaluation for {selectedTeam.name} in Round {currentRound}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Final Score (0–{maxScore})
                    </label>
                    <input
                      type="number" step="0.1" min="0" max={maxScore}
                      value={score} onChange={e => setScore(e.target.value)}
                      className="w-full px-3 py-2 bg-transparent dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Max ${maxScore}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Evaluation Notes</label>
                    <textarea
                      value={notes} onChange={e => setNotes(e.target.value)}
                      rows={5}
                      className="w-full px-3 py-2 bg-transparent dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                      placeholder="Provide reasoning for your score..."
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !score || !notes}
                    className={`w-full disabled:opacity-50 text-white py-3 rounded-lg font-bold transition-colors ${
                      activeSection === 'special'
                        ? 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700'
                        : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'
                    }`}
                  >
                    {submitting ? 'Submitting...' : `Lock in Score for Round ${currentRound}`}
                  </button>
                  {submitStatus && (
                    <div className={`p-3 rounded-lg text-sm font-medium ${
                      submitStatus.startsWith('Score submitted') 
                        ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    }`}>
                      {submitStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JudgePortal;