import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const API = 'http://localhost:8000';

const Leaderboard = ({ refreshTrigger }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  const [podium, setPodium] = useState(null);
  const [specialMentionWinner, setSpecialMentionWinner] = useState(null);
  const [specialMentions, setSpecialMentions] = useState([]);

  const navigate = useNavigate();

  const fetchData = useCallback(() => {
    axios.get(`${API}/scores/leaderboard`)
      .then(res => setLeaderboard(res.data))
      .catch(err => console.error("Error fetching leaderboard:", err));

    axios.get(`${API}/scores/anomalies`)
      .then(res => setAnomalies(res.data.anomalies || []))
      .catch(err => console.error("Error fetching anomalies:", err));

    axios.get(`${API}/special-mention/approved`)
      .then(res => setSpecialMentions(res.data || []))
      .catch(err => console.error("Error fetching special mentions:", err));
  }, []);

  const loadLeaderboardData = useCallback(() => {
    axios.get(`${API}/scores/finalized`)
      .then(res => {
        if (res.data.finalized) {
          setPodium(res.data.podium);
          setSpecialMentionWinner(res.data.special_mention_winner || null);
        } else {
          fetchData();
        }
      })
      .catch(() => fetchData());
  }, [fetchData]);

  const wsStatus = useWebSocket('leaderboard', (data) => {
    if (data.event === 'leaderboard_updated') {
      loadLeaderboardData();
    }
  });

  useEffect(() => {
    loadLeaderboardData();
  }, [loadLeaderboardData, refreshTrigger]);

  const handleResolve = async (scoreId) => {
    if (!window.confirm("Mark this anomaly as reviewed and resolved? This will release the team's results.")) return;
    setResolvingId(scoreId);
    try {
      await axios.post(`${API}/scores/resolve/${scoreId}`);
      loadLeaderboardData();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to resolve anomaly.");
    } finally {
      setResolvingId(null);
    }
  };

  const handleReject = async (scoreId, judgeName) => {
    if (!window.confirm(`Are you sure? This will delete the score and draft an email to ${judgeName} for committee approval, asking them to re-evaluate the team.`)) return;
    setResolvingId(scoreId);
    try {
      const res = await axios.post(`${API}/scores/reject/${scoreId}`);
      alert(`Score rejected. A re-evaluation email for ${judgeName} has been drafted and is awaiting committee approval.`);
      if (res.data.emails_drafted) {
        notifyEmailDraft(res.data.emails_drafted);
      }
      loadLeaderboardData();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to reject anomaly.");
    } finally {
      setResolvingId(null);
    }
  };

  const handleFinalizeEvaluation = async () => {
    if (anomalies.length > 0) {
      alert("You must resolve all scoring anomalies before ending the evaluation.");
      return;
    }
    if (!window.confirm("End the evaluation phase? The AI will now calculate winners and draft result emails.")) return;
    setFinalizing(true);
    try {
      const res = await axios.post(`${API}/scores/finalize`);
      setPodium(res.data.podium);
      setSpecialMentionWinner(res.data.special_mention_winner || null);
      
      // Hook into the shared email draft notification system
      if (res.data.emails_drafted !== undefined) {
        notifyEmailDraft(res.data.emails_drafted);
      }
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to finalize evaluation.");
      console.error(error);
    } finally {
      setFinalizing(false);
    }
  };

  const toggleRow = (teamId) => {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  };

  const medalColors = {
    1: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-300', badge: 'bg-yellow-400 text-white' },
    2: { bg: 'bg-gray-50 dark:bg-slate-700/50', border: 'border-gray-300 dark:border-slate-600', text: 'text-gray-700 dark:text-slate-300', badge: 'bg-gray-400 text-white' },
    3: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800/50', text: 'text-orange-800 dark:text-orange-300', badge: 'bg-orange-400 text-white' },
  };

  const SpecialMentionLeaderboard = () => {
    if (specialMentions.length === 0) return null;
    return (
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 transition-colors duration-300">Special Mention</h3>
          <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800/50 transition-colors duration-300">
            WILDCARD FINALISTS
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800/50 overflow-hidden transition-colors duration-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800/50 transition-colors duration-300">
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400">Member</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400">From Team</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400">Skill</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 dark:divide-purple-900/20">
              {specialMentions.map((sm) =>
                sm.nominated_members.map((member) => (
                  <tr key={`${sm.nomination_id}-${member.id}`} className="hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors duration-300">
                    <td className="p-4 font-bold text-purple-800 dark:text-purple-300 transition-colors duration-300">{member.name}</td>
                    <td className="p-4 text-gray-600 dark:text-slate-300 font-medium transition-colors duration-300">{sm.team_name}</td>
                    <td className="p-4">
                      <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs font-semibold transition-colors duration-300">
                        {member.skill}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-slate-400 text-sm italic transition-colors duration-300">{sm.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (podium) {
    return (
      <div className="w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-800 dark:text-slate-100 mb-1 transition-colors duration-300">Final Results</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm transition-colors duration-300">The evaluation is complete. Here are your winners.</p>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center md:items-end gap-6 md:gap-4 mb-10 md:mb-8">
  {podium[1] && (
    <div className="flex flex-col items-center order-2 md:order-1 w-full md:w-auto">
      <div className="bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-300 dark:border-slate-600 rounded-xl p-5 text-center w-full max-w-[200px] md:w-48 shadow-sm transition-colors duration-300">
        <div className="text-xl font-bold mb-2 dark:text-slate-200 transition-colors duration-300">2nd Place</div>
        <p className="font-black text-gray-800 dark:text-slate-100 text-lg truncate px-2 transition-colors duration-300">{podium[1].team_name}</p>
        <p className="text-gray-500 dark:text-slate-400 text-sm font-semibold transition-colors duration-300">{podium[1].final_score} pts</p>
      </div>
      <div className="bg-gray-300 dark:bg-slate-600 w-full max-w-[200px] md:w-48 h-12 md:h-16 rounded-b-xl flex items-center justify-center transition-colors duration-300">
        <span className="font-black text-white text-2xl">2</span>
      </div>
    </div>
  )}

  {podium[0] && (
    <div className="flex flex-col items-center order-1 md:order-2 w-full md:w-auto z-10">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-6 md:p-5 text-center w-full max-w-[220px] md:w-48 shadow-md transform md:scale-110 transition-colors duration-300">
        <div className="text-2xl md:text-xl font-bold mb-2 dark:text-yellow-200 transition-colors duration-300">1st Place</div>
        <p className="font-black text-gray-800 dark:text-slate-100 text-xl md:text-lg truncate px-2 transition-colors duration-300">{podium[0].team_name}</p>
        <p className="text-yellow-600 dark:text-yellow-400 text-base md:text-sm font-semibold transition-colors duration-300">{podium[0].final_score} pts</p>
      </div>
      <div className="bg-yellow-400 dark:bg-yellow-600 w-full max-w-[220px] md:w-48 h-16 md:h-24 rounded-b-xl flex items-center justify-center transform md:scale-110 transition-colors duration-300">
        <span className="font-black text-white text-3xl md:text-2xl">1</span>
      </div>
    </div>
  )}

  {podium[2] && (
    <div className="flex flex-col items-center order-3 md:order-3 w-full md:w-auto">
      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800/50 rounded-xl p-5 text-center w-full max-w-[200px] md:w-48 shadow-sm transition-colors duration-300">
        <div className="text-xl font-bold mb-2 dark:text-orange-200 transition-colors duration-300">3rd Place</div>
        <p className="font-black text-gray-800 dark:text-slate-100 text-lg truncate px-2 transition-colors duration-300">{podium[2].team_name}</p>
        <p className="text-orange-500 dark:text-orange-400 text-sm font-semibold transition-colors duration-300">{podium[2].final_score} pts</p>
      </div>
      <div className="bg-orange-400 dark:bg-orange-600 w-full max-w-[200px] md:w-48 h-10 rounded-b-xl flex items-center justify-center transition-colors duration-300">
        <span className="font-black text-white text-2xl">3</span>
      </div>
    </div>
  )}
</div>

        {specialMentionWinner && (
          <div className="mb-8">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-black text-purple-800 dark:text-purple-300 transition-colors duration-300">Special Mention Award</h3>
              <p className="text-purple-500 dark:text-purple-400 text-sm transition-colors duration-300">Wildcard finalist recognized for outstanding contribution</p>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-2xl p-6 shadow-md text-center max-w-md mx-auto transition-colors duration-300">
              {(specialMentionWinner.members && specialMentionWinner.members.length > 0)
                ? specialMentionWinner.members.map((m) => (
                    <div key={m.id}>
                      <p className="font-black text-purple-900 dark:text-purple-200 text-2xl transition-colors duration-300">{m.name}</p>
                      <span className="inline-block bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-300 text-xs font-bold px-3 py-1 rounded-full mt-1 mb-2 transition-colors duration-300">
                        {m.skill}
                      </span>
                    </div>
                  ))
                : (
                    <p className="font-black text-purple-900 dark:text-purple-200 text-2xl transition-colors duration-300">Special Mention Awardee</p>
                  )
              }
              <p className="text-gray-500 dark:text-slate-400 text-sm mt-1 transition-colors duration-300">
                From team <span className="font-bold text-gray-700 dark:text-slate-200 transition-colors duration-300">{specialMentionWinner.team_name}</span>
              </p>
              <p className="text-purple-700 dark:text-purple-400 text-sm font-semibold mt-1 transition-colors duration-300">
                Final Score: {specialMentionWinner.final_score} pts
              </p>
              <div className="mt-3 bg-white dark:bg-slate-800 rounded-lg p-3 border border-purple-100 dark:border-purple-800/50 transition-colors duration-300">
                <p className="text-gray-500 dark:text-slate-400 text-xs italic transition-colors duration-300">"{specialMentionWinner.reason}"</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-4 transition-colors duration-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400">Rank</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400">Team Name</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 text-right">Final Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {podium.map((entry) => {
                const colors = medalColors[entry.rank] || { bg: 'dark:bg-slate-800', border: 'border-gray-100 dark:border-slate-700', text: 'text-gray-700 dark:text-slate-300', badge: 'bg-gray-200 text-gray-700' };
                return (
                  <tr key={entry.team_id} className={`${colors.bg} transition-colors duration-300`}>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${colors.badge}`}>
                        {entry.medal}
                      </span>
                    </td>
                    <td className={`p-4 font-bold ${colors.text} transition-colors duration-300`}>{entry.team_name}</td>
                    <td className="p-4 font-black text-gray-800 dark:text-slate-100 text-right text-lg transition-colors duration-300">{entry.final_score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl p-4 text-center transition-colors duration-300">
          <p className="text-green-700 dark:text-green-400 font-semibold text-sm transition-colors duration-300">Result emails have been drafted and sent to Pending Approvals. Go to the Comms tab to review and send.</p>
          <button
            onClick={() => navigate('/comms')}
            className="mt-3 px-6 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Go to Comms →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {anomalies.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-6 mb-8 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-red-800 dark:text-red-300 m-0 transition-colors duration-300">Attention Required: Anomaly Resolution</h3>
          </div>
          <p className="text-red-700 dark:text-red-400 text-sm mb-5 transition-colors duration-300">
            The evaluation engine has paused the pipeline. The following scores deviate significantly from the panel average (&gt; 20% variance). Review the judge's notes and resolve the discrepancies to unlock the leaderboard.
          </p>
          <div className="space-y-4">
            {anomalies.map(anomaly => (
              <div key={anomaly.id} className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800/50 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm transition-colors duration-300">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 dark:text-slate-100 text-lg mb-1 transition-colors duration-300">Team #{anomaly.team_id}</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-2 transition-colors duration-300">
                    <strong>Evaluator:</strong> {anomaly.judge_name} <span className="mx-2">|</span>
                    <strong>Flagged Score:</strong> <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded transition-colors duration-300">{anomaly.score}</span>
                  </p>
                  <div className="text-sm text-gray-700 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-700/50 p-3 rounded-md border border-slate-100 dark:border-slate-600 relative transition-colors duration-300">
                    {anomaly.notes}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => handleResolve(anomaly.id)}
                    disabled={resolvingId === anomaly.id}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50 shadow-sm w-full"
                  >
                    {resolvingId === anomaly.id ? 'Processing...' : 'Accept & Resolve'}
                  </button>
                  <button
                    onClick={() => handleReject(anomaly.id, anomaly.judge_name)}
                    disabled={resolvingId === anomaly.id}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50 shadow-sm w-full"
                  >
                    {resolvingId === anomaly.id ? 'Processing...' : 'Reject & Re-score'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl px-5 py-3 mb-4 flex items-center gap-3 transition-colors duration-300">
          <div>
            <span className="font-bold text-blue-800 dark:text-blue-300 transition-colors duration-300">Round {leaderboard[0].current_round}</span>
            <span className="text-blue-600 dark:text-blue-400 text-sm ml-2 transition-colors duration-300">— Currently active evaluation round</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-slate-100 transition-colors duration-300">Live Leaderboard</h3>
          {wsStatus === 'open' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 transition-colors duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={handleFinalizeEvaluation}
          disabled={finalizing || leaderboard.length === 0}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {finalizing ? 'Drafting Emails...' : 'End Evaluation & Draft Results'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 transition-colors duration-300">
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400">Rank</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400">Team Name</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 text-right">Avg Score</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-400 dark:text-slate-500 font-medium transition-colors duration-300">No evaluations submitted yet.</td>
              </tr>
            ) : (
              leaderboard.map((team, index) => (
                <React.Fragment key={team.team_id}>
                  <tr
                    onClick={() => toggleRow(team.team_id)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors duration-300 ${expandedTeamId === team.team_id ? 'bg-slate-50 dark:bg-slate-700/50' : ''}`}
                  >
                    <td className="p-4 font-bold text-gray-700 dark:text-slate-300 transition-colors duration-300">#{index + 1}</td>
                    <td className="p-4 font-semibold text-blue-700 dark:text-blue-400 transition-colors duration-300">{team.team_name}</td>
                    <td className="p-4 font-black text-gray-800 dark:text-slate-100 text-right text-lg transition-colors duration-300">{team.average_score.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      {team.results_on_hold ? (
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800/50 transition-colors duration-300">
                          ON HOLD (Anomaly)
                        </span>
                      ) : (
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800/50 transition-colors duration-300">
                          SCORED
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedTeamId === team.team_id && (
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b-2 border-slate-200 dark:border-slate-700 transition-colors duration-300">
                      <td colSpan="4" className="p-6">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-inner transition-colors duration-300">
                          <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2 transition-colors duration-300">Evaluation Breakdown</h4>
                          {team.scores.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {team.scores.map((score, idx) => (
                                <div key={idx} className={`p-4 rounded-lg border transition-colors duration-300 ${score.anomaly_flagged ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'}`}>
                                  <div className="flex justify-between mb-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 transition-colors duration-300">{score.judge_name}</span>
                                    <span className={`font-bold transition-colors duration-300 ${score.anomaly_flagged ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                      {score.score.toFixed(2)} {score.anomaly_flagged && " (Flagged)"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 italic m-0 transition-colors duration-300">"{score.notes}"</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 m-0 transition-colors duration-300">No detailed scores available for this team yet.</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-3 font-medium transition-colors duration-300">
        * Teams flagged with an anomaly have a judge score deviating &gt; 20% from the panel average. Click any row to view individual judge scores.
      </p>

      <SpecialMentionLeaderboard />
    </div>
  );
};

export default Leaderboard;