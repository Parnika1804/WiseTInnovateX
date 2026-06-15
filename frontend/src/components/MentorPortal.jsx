import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000';

const MentorPortal = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [mentorInfo, setMentorInfo] = useState(null);
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [tokenError, setTokenError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFinalized, setIsFinalized] = useState(false);
  const [roundsHappened, setRoundsHappened] = useState(false);
  const [isSecondLastRound, setIsSecondLastRound] = useState(false); // NEW

  // Nomination state — back to multi-select
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [nomination, setNomination] = useState(null);

  useEffect(() => {
    if (!token) { setTokenError(true); setLoading(false); return; }
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (payload.role !== 'Mentor') { setTokenError(true); setLoading(false); return; }
      setMentorInfo({ name: payload.name, email: payload.email });
      loadPortal(payload.email);
    } catch (err) {
      console.error("Invalid JWT", err);
      setTokenError(true);
      setLoading(false);
    }
  }, [token]);

  const loadPortal = async (email) => {
    try {
      const mentorsRes = await axios.get(`${API}/mentors`);
      const mentor = mentorsRes.data.find(m => m.email === email);
      if (!mentor || !mentor.assigned_team_id) { setLoading(false); return; }

      setMentorInfo(prev => ({ ...prev, id: mentor.id }));

      const teamsRes = await axios.get(`${API}/teams`);
      const assignedTeam = teamsRes.data.find(t => t.id === mentor.assigned_team_id);
      if (assignedTeam) {
        setTeam(assignedTeam);
        setMembers(assignedTeam.members || []);
      }

      // Check rounds + get current round and total rounds from EventConfig
      try {
        const leaderboardRes = await axios.get(`${API}/scores/leaderboard`);
        if (leaderboardRes.data && leaderboardRes.data.length > 0) {
          setRoundsHappened(true);
        }
      } catch (e) {}

      // Check if we are in the second-to-last round
      try {
        const configRes = await axios.get(`${API}/event/config`);
        if (configRes.data.status === 'found') {
          let scoring = configRes.data.config.scoring;
          if (typeof scoring === 'string') scoring = JSON.parse(scoring);
          const currentRound = scoring?.current_round || 1;
          let advancementRules = scoring?.advancement_rules || [];
          if (typeof advancementRules === 'string') advancementRules = JSON.parse(advancementRules);
          const totalRounds = advancementRules.length;
          // Second-to-last round means currentRound === totalRounds - 1
          // After that round is finalized, current_round becomes totalRounds (the final)
          // So nomination window: currentRound === totalRounds (team was eliminated in round totalRounds-1)
          if (totalRounds >= 2 && currentRound === totalRounds) {
            setIsSecondLastRound(true);
          }
        }
      } catch (e) {}

      // Check if event is finalized
      try {
        const finalRes = await axios.get(`${API}/scores/finalized`);
        if (finalRes.data.finalized) setIsFinalized(true);
      } catch (e) {}

      // Check existing nomination
      try {
        const nominationsRes = await axios.get(`${API}/special-mention`);
        const existing = nominationsRes.data.find(n => n.team_id === mentor.assigned_team_id);
        if (existing) setNomination(existing);
      } catch (e) {}

    } catch (err) {
      console.error("Failed to load mentor portal", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNominate = async () => {
    if (selectedMemberIds.length === 0) {
      setSubmitStatus('❌ Please select at least one member to nominate.');
      return;
    }
    if (!reason.trim()) {
      setSubmitStatus('❌ Please provide a reason for the nomination.');
      return;
    }
    setSubmitting(true);
    setSubmitStatus('');
    try {
      await axios.post(`${API}/special-mention/nominate`, {
        mentor_id: mentorInfo.id,
        team_id: team.id,
        nominated_member_ids: selectedMemberIds,
        reason: reason.trim()
      });
      setSubmitStatus('✅ Nomination submitted successfully!');
      setNomination({ status: 'PENDING' });
    } catch (err) {
      setSubmitStatus(`❌ ${err.response?.data?.detail || 'Nomination failed.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenError) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="p-8 max-w-xl mx-auto bg-red-50 border border-red-200 rounded-xl text-center text-red-800">
        <h2 className="text-xl font-bold mb-2">Invalid or Missing Access Token</h2>
        <p>A secure magic link is required to access the Mentor Portal.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-slate-500 font-medium">Loading Mentor Portal...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white px-8 py-5">
        <h2 className="text-xl font-bold">Mentor Portal</h2>
        <p className="text-slate-400 text-sm mt-1">
          Welcome, <span className="text-white font-semibold">{mentorInfo?.name}</span>
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Team Card — always shown */}
        {team && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">Your Assigned Team</h3>
              {roundsHappened && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  team.is_qualified
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}>
                  {team.is_qualified ? '✅ Qualified' : '❌ Eliminated'}
                </span>
              )}
            </div>

            <p className="text-sm mb-4">
              <strong className="text-slate-600">Team Name:</strong>
              <span className="font-bold text-blue-600 ml-2">{team.name}</span>
            </p>

            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="font-medium text-slate-800">{m.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">{m.skill}</span>
                    {m.email && (
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {m.email}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event in progress — no rounds yet */}
        {team && !roundsHappened && !isFinalized && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-lg font-bold text-blue-800 mb-1">Event is in Progress</h3>
            <p className="text-sm text-blue-700">Support your team as they build their project. Results will appear here once judging begins.</p>
          </div>
        )}

        {/* Rounds happened — team qualified */}
        {team && roundsHappened && team.is_qualified && !isFinalized && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-bold text-green-800 mb-1">Your Team Advanced!</h3>
            <p className="text-sm text-green-700">Your team qualified for the next round. Keep supporting them!</p>
          </div>
        )}

        {/* Rounds happened — team eliminated */}
        {team && roundsHappened && !team.is_qualified && !isFinalized && (
          <>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center shadow-sm">
              <div className="text-4xl mb-3">🏁</div>
              <h3 className="text-lg font-bold text-red-800 mb-1">Your Team Was Eliminated</h3>
              <p className="text-sm text-red-700">
                Your team did not advance to the next round.
                {isSecondLastRound && ' You can nominate members for a Special Mention wildcard entry to the finals below.'}
              </p>
            </div>

            {/* Special Mention — ONLY in second-to-last round */}
            {isSecondLastRound && (
              <div className="bg-white border border-indigo-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-indigo-800 mb-1">⭐ Nominate for Special Mention</h3>
                <p className="text-sm text-slate-500 mb-5">
                  Select one or more members who deserve a wildcard entry to the finals — due to exams, medical reasons, or exceptional individual effort.
                </p>

                {nomination ? (
                  <div className={`p-4 rounded-lg text-sm font-medium border ${
                    nomination.status === 'PENDING'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : nomination.status === 'APPROVED'
                      ? 'bg-purple-50 border-purple-200 text-purple-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {nomination.status === 'PENDING' && '⏳ Your nomination is under committee review.'}
                    {nomination.status === 'APPROVED' && '⭐ Nomination approved! Your nominated members will compete in the finals as Special Mention wildcards.'}
                    {nomination.status === 'REJECTED' && '🏁 Your nomination was reviewed but not approved this time. Thank you for supporting your team.'}
                  </div>
                ) : (
                  <>
                    {/* Multi-select members */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">Select Members to Nominate</label>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedMemberIds(members.map(m => m.id))} className="text-xs text-indigo-600 hover:underline">Select All</button>
                          <span className="text-slate-300">|</span>
                          <button onClick={() => setSelectedMemberIds([])} className="text-xs text-slate-500 hover:underline">Clear</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => toggleMember(m.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedMemberIds.includes(m.id)
                                ? 'bg-indigo-50 border-indigo-300'
                                : 'bg-slate-50 border-slate-200 hover:border-indigo-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                selectedMemberIds.includes(m.id)
                                  ? 'bg-indigo-600 border-indigo-600'
                                  : 'border-slate-300'
                              }`}>
                                {selectedMemberIds.includes(m.id) && <span className="text-white text-xs">✓</span>}
                              </div>
                              <span className="font-medium text-slate-800">{m.name}</span>
                            </div>
                            <span className="text-sm text-slate-500">{m.skill}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Nomination</label>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical text-sm"
                        placeholder="e.g. These members had university exams during the hackathon and couldn't contribute fully despite strong technical abilities..."
                      />
                    </div>

                    <button
                      onClick={handleNominate}
                      disabled={submitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 rounded-lg font-bold transition-colors"
                    >
                      {submitting ? 'Submitting...' : '⭐ Submit Special Mention Nomination'}
                    </button>

                    {submitStatus && (
                      <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
                        submitStatus.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {submitStatus}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Event finalized */}
        {team && isFinalized && (
          <div className={`rounded-xl p-6 text-center shadow-sm border ${
            team.is_qualified ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-4xl mb-3">{team.is_qualified ? '🏆' : '🏁'}</div>
            <h3 className={`text-lg font-bold mb-1 ${team.is_qualified ? 'text-amber-800' : 'text-slate-700'}`}>
              {team.is_qualified ? 'Event Complete — Your Team Competed!' : 'Event Complete'}
            </h3>
            <p className={`text-sm ${team.is_qualified ? 'text-amber-700' : 'text-slate-500'}`}>
              {team.is_qualified
                ? 'Thank you for mentoring your team through the finals. Results have been declared.'
                : 'Thank you for your support and dedication as a mentor. We hope to see you at future events!'}
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default MentorPortal;