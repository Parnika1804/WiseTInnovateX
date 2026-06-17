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
  const [isSecondLastRound, setIsSecondLastRound] = useState(false);
  const [currentRound, setCurrentRound] = useState(null);
  const [currentStageLabel, setCurrentStageLabel] = useState(null);
  const [feedbackHistory, setFeedbackHistory] = useState([]);

  const [selectedMemberId, setSelectedMemberId] = useState(null);
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

      let lastScoredRound = 0;
      try {
        const feedbackRes = await axios.get(`${API}/scores/team-feedback/${assignedTeam.id}`);
        const feedback = feedbackRes.data?.feedback || [];
        setFeedbackHistory(feedback);
        if (feedback.length > 0) {
          setRoundsHappened(true);
          lastScoredRound = Math.max(...feedback.map(f => f.round_number));
        }
      } catch (e) {}

      try {
        const configRes = await axios.get(`${API}/event/config`);
        if (configRes.data.status === 'found') {
          let scoring = configRes.data.config.scoring;
          if (typeof scoring === 'string') scoring = JSON.parse(scoring);
          const round = scoring?.current_round || 1;
          setCurrentRound(round);

          const stages = configRes.data.config.stages || [];
          const roundStages = stages.filter(s => /^round\s/i.test(s.name));
          const totalRounds = roundStages.length;

          const activeStage = roundStages[round - 1];
          if (activeStage) setCurrentStageLabel(activeStage.label);

          if (totalRounds >= 2 && lastScoredRound === totalRounds - 1) setIsSecondLastRound(true);
        }
      } catch (e) {}

      try {
        const finalRes = await axios.get(`${API}/scores/finalized`);
        if (finalRes.data.finalized) setIsFinalized(true);
      } catch (e) {}

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

  const handleNominate = async () => {
    if (!selectedMemberId) {
      setSubmitStatus('❌ Please select exactly one member to nominate.');
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
        nominated_member_ids: [selectedMemberId],
        reason: reason.trim(),
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="
        p-8 max-w-xl mx-auto rounded-xl text-center border
        bg-red-50 dark:bg-red-950/30
        border-red-200 dark:border-red-800
        text-red-800 dark:text-red-300
      ">
        <h2 className="text-xl font-bold mb-2">Invalid or Missing Access Token</h2>
        <p>A secure magic link is required to access the Mentor Portal.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="font-medium text-slate-500 dark:text-slate-400">Loading Mentor Portal...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white px-8 py-5 border-b border-slate-800 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Mentor Portal</h2>
          <p className="text-slate-400 text-sm mt-1">
            Welcome, <span className="text-white font-semibold">{mentorInfo?.name}</span>
          </p>
        </div>
        {currentRound && !isFinalized && (
          <div className="bg-blue-600 border border-blue-500 px-4 py-2 rounded-lg text-center shadow-inner">
            <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-0.5">Current Stage</p>
            <p className="text-white font-black text-xl leading-none">Round {currentRound}</p>
            {currentStageLabel && (
              <p className="text-blue-200 text-xs mt-1">{currentStageLabel}</p>
            )}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Team Card */}
        {team && (
          <div className="
            rounded-xl p-6 shadow-sm border
            bg-white dark:bg-slate-900
            border-slate-200 dark:border-slate-800
          ">
            <div className="
              flex items-center justify-between mb-4 border-b pb-3
              border-slate-100 dark:border-slate-800
            ">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Your Assigned Team</h3>
              {roundsHappened && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  team.is_qualified
                    ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800'
                    : 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                }`}>
                  {team.is_qualified ? '✅ Qualified' : '❌ Eliminated'}
                </span>
              )}
            </div>

            <p className="text-sm mb-4">
              <strong className="text-slate-600 dark:text-slate-400">Team Name:</strong>
              <span className="font-bold text-blue-600 dark:text-blue-400 ml-2">{team.name}</span>
            </p>

            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="
                    flex justify-between items-center p-3 rounded-lg border
                    bg-slate-50 dark:bg-slate-800/50
                    border-slate-100 dark:border-slate-700
                  "
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100">{m.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{m.skill}</span>
                    {m.email && (
                      <span className="
                        text-xs px-2 py-0.5 rounded border
                        text-indigo-600 dark:text-indigo-400
                        bg-indigo-50 dark:bg-indigo-950/40
                        border-indigo-100 dark:border-indigo-800
                      ">
                        {m.email}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Judge Feedback — round by round */}
        {feedbackHistory.length > 0 && (
          <div className="
            rounded-xl p-6 shadow-sm border
            bg-white dark:bg-slate-900
            border-slate-200 dark:border-slate-800
          ">
            <h3 className="text-lg font-bold mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100">
              🧑‍⚖️ Judge Feedback
            </h3>
            <div className="space-y-3">
              {feedbackHistory.map((f, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Round {f.round_number}</p>
                    <span className="text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full font-semibold">
                      Score: {f.score}
                    </span>
                  </div>
                  {f.notes ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{f.notes}"</p>
                  ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500 italic">No written feedback provided for this round.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event in progress — no rounds yet */}
        {team && !roundsHappened && !isFinalized && (
          <div className="
            rounded-xl p-6 text-center shadow-sm border
            bg-blue-50 dark:bg-blue-950/30
            border-blue-200 dark:border-blue-800
          ">
            <div className="text-4xl mb-3"></div>
            <h3 className="text-lg font-bold mb-1 text-blue-800 dark:text-blue-200">Event is in Progress</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Support your team as they build their project. Results will appear here once judging begins.
            </p>
          </div>
        )}

        {/* Rounds happened — team qualified */}
        {team && roundsHappened && team.is_qualified && !isFinalized && (
          <div className="
            rounded-xl p-6 text-center shadow-sm border
            bg-green-50 dark:bg-green-950/30
            border-green-200 dark:border-green-800
          ">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-lg font-bold mb-1 text-green-800 dark:text-green-200">Your Team Advanced!</h3>
            <p className="text-sm text-green-700 dark:text-green-300">
              Your team qualified for the next round. Keep supporting them!
            </p>
          </div>
        )}

        {/* Rounds happened — team eliminated */}
        {team && roundsHappened && !team.is_qualified && !isFinalized && (
          <>
            <div className="
              rounded-xl p-6 text-center shadow-sm border
              bg-red-50 dark:bg-red-950/30
              border-red-200 dark:border-red-800
            ">
              <div className="text-4xl mb-3">🏁</div>
              <h3 className="text-lg font-bold mb-1 text-red-800 dark:text-red-200">Your Team Was Eliminated</h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                Your team did not advance to the next round.
                {isSecondLastRound && ' You can nominate one member for a Special Mention wildcard entry to the finals below.'}
              </p>
            </div>

            {/* Special Mention */}
            {isSecondLastRound && (
              <div className="
                rounded-xl p-6 shadow-sm border
                bg-white dark:bg-slate-900
                border-indigo-200 dark:border-indigo-800
              ">
                <h3 className="text-lg font-bold mb-1 text-indigo-800 dark:text-indigo-300">
                   Nominate for Special Mention
                </h3>
                <p className="text-sm mb-5 text-slate-500 dark:text-slate-400">
                  Select <strong>one member</strong> who deserves a wildcard entry to the finals — due to exams, medical reasons, or exceptional individual effort.
                </p>

                {nomination ? (
                  <div className={`p-4 rounded-lg text-sm font-medium border ${
                    nomination.status === 'PENDING'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                      : nomination.status === 'APPROVED'
                      ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {nomination.status === 'PENDING' && ' Your nomination is under committee review.'}
                    {nomination.status === 'APPROVED' && ' Nomination approved! Your nominated member will compete in the finals as a Special Mention wildcard.'}
                    {nomination.status === 'REJECTED' && ' Your nomination was reviewed but not approved this time. Thank you for supporting your team.'}
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
                        Select One Member to Nominate
                      </label>
                      <div className="space-y-2">
                        {members.map((m) => (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMemberId(m.id)}
                            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedMemberId === m.id
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedMemberId === m.id
                                  ? 'border-indigo-600 dark:border-indigo-400'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {selectedMemberId === m.id && (
                                  <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                )}
                              </div>
                              <span className="font-medium text-slate-800 dark:text-slate-100">{m.name}</span>
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{m.skill}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Reason for Nomination
                      </label>
                      <textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={4}
                        className="
                          w-full px-3 py-2 rounded-lg outline-none resize-vertical text-sm border
                          bg-white dark:bg-slate-800
                          border-slate-200 dark:border-slate-700
                          text-slate-700 dark:text-slate-300
                          placeholder-slate-400 dark:placeholder-slate-500
                          focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
                        "
                        placeholder="e.g. This member had university exams during the hackathon and couldn't contribute fully despite strong technical abilities..."
                      />
                    </div>

                    <button
                      onClick={handleNominate}
                      disabled={submitting}
                      className="
                        w-full py-3 rounded-lg font-bold transition-colors
                        bg-indigo-600 hover:bg-indigo-700
                        dark:bg-indigo-500 dark:hover:bg-indigo-600
                        disabled:opacity-50
                        text-white
                      "
                    >
                      {submitting ? 'Submitting...' : ' Submit Special Mention Nomination'}
                    </button>

                    {submitStatus && (
                      <div className={`mt-3 p-3 rounded-lg text-sm font-medium border ${
                        submitStatus.startsWith('✅')
                          ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
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
            team.is_qualified
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
          }`}>
            <div className="text-4xl mb-3">{team.is_qualified ? '🏆' : '🏁'}</div>
            <h3 className={`text-lg font-bold mb-1 ${
              team.is_qualified
                ? 'text-amber-800 dark:text-amber-200'
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {team.is_qualified ? 'Event Complete — Your Team Competed!' : 'Event Complete'}
            </h3>
            <p className={`text-sm ${
              team.is_qualified
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
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