import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

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
          // Don't fetch specialMentions separately after finalization —
          // the winner card is the canonical SM display on the results page.
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
    if (!window.confirm(`Are you sure? This will delete the score and automatically email ${judgeName} to re-evaluate the team.`)) return;
    setResolvingId(scoreId);
    try {
      await axios.post(`${API}/scores/reject/${scoreId}`);
      alert(`Score rejected. ${judgeName} has been notified to re-evaluate.`);
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
    1: { bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-800 dark:text-yellow-300', badge: 'bg-yellow-400 dark:bg-yellow-600 text-white' },
    2: { bg: 'bg-gray-50 dark:bg-gray-800/40', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-700 dark:text-gray-300', badge: 'bg-gray-400 dark:bg-gray-600 text-white' },
    3: { bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-700', text: 'text-orange-800 dark:text-orange-300', badge: 'bg-orange-400 dark:bg-orange-600 text-white' },
  };

  // FIX: SpecialMentionLeaderboard is only shown on the LIVE leaderboard view,
  // never after finalization — the winner card is the canonical post-results display.
  const SpecialMentionLeaderboard = () => {
    if (specialMentions.length === 0) return null;
    return (
      <div className="mt-8">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">⭐ Special Mention</h3>
          <span className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-bold px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800">
            WILDCARD FINALISTS
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-purple-50 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-800">
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400">Member</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400">From Team</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400">Skill</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-purple-500 dark:text-purple-400">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 dark:divide-purple-900/40">
              {specialMentions.map((sm) =>
                sm.nominated_members.map((member) => (
                  <tr key={`${sm.nomination_id}-${member.id}`} className="hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors">
                    <td className="p-4 font-bold text-purple-800 dark:text-purple-300">⭐ {member.name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 font-medium">{sm.team_name}</td>
                    <td className="p-4">
                      <span className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-semibold">
                        {member.skill}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-sm italic">{sm.reason}</td>
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
          <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-1"> Final Results</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">The evaluation is complete. Here are your winners!</p>
        </div>

        {/* Podium */}
        <div className="flex justify-center items-end gap-4 mb-8">
          {podium[1] && (
            <div className="flex flex-col items-center">
              <div className="bg-gray-50 dark:bg-gray-800/60 border-2 border-gray-300 dark:border-gray-600 rounded-xl p-5 text-center w-48 shadow-sm">
                <div className="text-4xl mb-2">🥈</div>
                <p className="font-black text-gray-800 dark:text-gray-100 text-lg">{podium[1].team_name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-semibold">{podium[1].final_score} pts</p>
              </div>
              <div className="bg-gray-300 dark:bg-gray-600 w-48 h-16 rounded-b-xl flex items-center justify-center">
                <span className="font-black text-white text-2xl">2</span>
              </div>
            </div>
          )}

          {podium[0] && (
            <div className="flex flex-col items-center">
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-5 text-center w-48 shadow-md">
                <div className="text-4xl mb-2">🥇</div>
                <p className="font-black text-gray-800 dark:text-gray-100 text-lg">{podium[0].team_name}</p>
                <p className="text-yellow-600 dark:text-yellow-400 text-sm font-semibold">{podium[0].final_score} pts</p>
              </div>
              <div className="bg-yellow-400 dark:bg-yellow-600 w-48 h-24 rounded-b-xl flex items-center justify-center">
                <span className="font-black text-white text-2xl">1</span>
              </div>
            </div>
          )}

          {podium[2] && (
            <div className="flex flex-col items-center">
              <div className="bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 dark:border-orange-700 rounded-xl p-5 text-center w-48 shadow-sm">
                <div className="text-4xl mb-2">🥉</div>
                <p className="font-black text-gray-800 dark:text-gray-100 text-lg">{podium[2].team_name}</p>
                <p className="text-orange-500 dark:text-orange-400 text-sm font-semibold">{podium[2].final_score} pts</p>
              </div>
              <div className="bg-orange-400 dark:bg-orange-600 w-48 h-10 rounded-b-xl flex items-center justify-center">
                <span className="font-black text-white text-2xl">3</span>
              </div>
            </div>
          )}
        </div>

        {/* Special Mention Winner Card — only shown when there IS a winner.
            FIX: SpecialMentionLeaderboard table is NOT rendered here to prevent
            the same person appearing twice (winner card + table row). */}
        {specialMentionWinner && (
          <div className="mb-8">
            <div className="text-center mb-4">
              <h3 className="text-2xl font-black text-purple-800 dark:text-purple-300">⭐ Special Mention Award</h3>
              <p className="text-purple-500 dark:text-purple-400 text-sm">Wildcard finalist recognized for outstanding contribution</p>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-2 border-purple-300 dark:border-purple-700 rounded-2xl p-6 shadow-md text-center max-w-md mx-auto">
              <div className="text-5xl mb-3">⭐</div>
              {/* FIX: guard against null/empty members array to prevent crash */}
              {(specialMentionWinner.members && specialMentionWinner.members.length > 0)
                ? specialMentionWinner.members.map((m) => (
                    <div key={m.id}>
                      <p className="font-black text-purple-900 dark:text-purple-200 text-2xl">{m.name}</p>
                      <span className="inline-block bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 text-xs font-bold px-3 py-1 rounded-full mt-1 mb-2">
                        {m.skill}
                      </span>
                    </div>
                  ))
                : (
                    <p className="font-black text-purple-900 dark:text-purple-200 text-2xl">Special Mention Awardee</p>
                  )
              }
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                From team <span className="font-bold text-gray-700 dark:text-gray-300">{specialMentionWinner.team_name}</span>
              </p>
              <p className="text-purple-700 dark:text-purple-300 text-sm font-semibold mt-1">
                Final Score: {specialMentionWinner.final_score} pts
              </p>
              <div className="mt-3 bg-white dark:bg-slate-900 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                <p className="text-gray-500 dark:text-gray-400 text-xs italic">"{specialMentionWinner.reason}"</p>
              </div>
            </div>
          </div>
        )}

        {/* Full results table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Rank</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Team Name</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Final Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {podium.map((entry) => {
                const colors = medalColors[entry.rank] || { bg: '', border: 'border-gray-100', text: 'text-gray-700 dark:text-gray-300', badge: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' };
                return (
                  <tr key={entry.team_id} className={`${colors.bg}`}>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${colors.badge}`}>
                        {entry.medal}
                      </span>
                    </td>
                    <td className={`p-4 font-bold ${colors.text}`}>{entry.team_name}</td>
                    <td className="p-4 font-black text-gray-800 dark:text-gray-100 text-right text-lg">{entry.final_score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
          <p className="text-green-700 dark:text-green-300 font-semibold text-sm">✅ Result emails have been drafted and sent to Pending Approvals. Go to the Comms tab to review and send.</p>
          <button
            onClick={() => navigate('/comms')}
            className="mt-3 px-6 py-2 bg-green-600 dark:bg-green-700 text-white font-semibold rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors text-sm"
          >
            Go to Comms →
          </button>
        </div>

        {/* FIX: SpecialMentionLeaderboard NOT rendered here after finalization.
            The winner card above is the only SM display on the results page. */}
      </div>
    );
  }

  // Live leaderboard view (pre-finalization)
  return (
    <div className="w-full">
      {anomalies.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-xl font-bold text-red-800 dark:text-red-300 m-0">Action Required: Anomaly Resolution</h3>
          </div>
          <p className="text-red-700 dark:text-red-400 text-sm mb-5">
            The evaluation engine has paused the pipeline. The following scores deviate significantly from the panel average (&gt; 20% variance). Review the judge's notes and resolve the discrepancies to unlock the leaderboard.
          </p>
          <div className="space-y-4">
            {anomalies.map(anomaly => (
              <div key={anomaly.id} className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-1">Team #{anomaly.team_id}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <strong>Evaluator:</strong> {anomaly.judge_name} <span className="mx-2">|</span>
                    <strong>Flagged Score:</strong> <span className="text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded">{anomaly.score}</span>
                  </p>
                  <div className="text-sm text-gray-700 dark:text-gray-300 italic bg-slate-50 dark:bg-slate-800/60 p-3 rounded-md border border-slate-100 dark:border-slate-700 relative">
                    <span className="absolute -left-2 -top-2 text-xl opacity-50">❝</span>
                    {anomaly.notes}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => handleResolve(anomaly.id)}
                    disabled={resolvingId === anomaly.id}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50 shadow-sm w-full"
                  >
                    {resolvingId === anomaly.id ? 'Processing...' : '✓ Accept & Resolve'}
                  </button>
                  <button
                    onClick={() => handleReject(anomaly.id, anomaly.judge_name)}
                    disabled={resolvingId === anomaly.id}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50 shadow-sm w-full"
                  >
                    {resolvingId === anomaly.id ? 'Processing...' : '❌ Reject & Re-score'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {leaderboard.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl px-5 py-3 mb-4 flex items-center gap-3">
          <span className="text-blue-600 dark:text-blue-400 text-xl">🔄</span>
          <div>
            <span className="font-bold text-blue-800 dark:text-blue-300">Round {leaderboard[0].current_round}</span>
            <span className="text-blue-600 dark:text-blue-400 text-sm ml-2">— Currently active evaluation round</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Live Leaderboard</h3>
          {wsStatus === 'open' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></span>
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={handleFinalizeEvaluation}
          disabled={finalizing || leaderboard.length === 0}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {finalizing ? 'Drafting Emails...' : '✅ End Evaluation & Draft Results'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-gray-700">
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Rank</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">Team Name</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Avg Score</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-400 dark:text-gray-500 font-medium">No evaluations submitted yet.</td>
              </tr>
            ) : (
              leaderboard.map((team, index) => (
                <React.Fragment key={team.team_id}>
                  <tr
                    onClick={() => toggleRow(team.team_id)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${expandedTeamId === team.team_id ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}
                  >
                    <td className="p-4 font-bold text-gray-700 dark:text-gray-300">#{index + 1}</td>
                    <td className="p-4 font-semibold text-blue-700 dark:text-blue-400">{team.team_name}</td>
                    <td className="p-4 font-black text-gray-800 dark:text-gray-100 text-right text-lg">{team.average_score.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      {team.results_on_hold ? (
                        <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
                          ON HOLD (Anomaly)
                        </span>
                      ) : (
                        <span className="bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800">
                          SCORED
                        </span>
                      )}
                    </td>
                  </tr>
                  {expandedTeamId === team.team_id && (
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-700">
                      <td colSpan="4" className="p-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-5 shadow-inner">
                          <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Evaluation Breakdown</h4>
                          {team.scores.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {team.scores.map((score, idx) => (
                                <div key={idx} className={`p-4 rounded-lg border ${score.anomaly_flagged ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'}`}>
                                  <div className="flex justify-between mb-2">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{score.judge_name}</span>
                                    <span className={`font-bold ${score.anomaly_flagged ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                      {score.score.toFixed(2)} {score.anomaly_flagged && " (⚠️ Flagged)"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 italic m-0">"{score.notes}"</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 m-0">No detailed scores available for this team yet.</p>
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
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-medium">
        * Teams flagged with an anomaly have a judge score deviating &gt; 20% from the panel average. Click any row to view individual judge scores.
      </p>

      {/* FIX: SpecialMentionLeaderboard only shown on LIVE view (pre-finalization).
          After finalization, the winner card above handles SM display exclusively. */}
      <SpecialMentionLeaderboard />
    </div>
  );
};

export default Leaderboard;