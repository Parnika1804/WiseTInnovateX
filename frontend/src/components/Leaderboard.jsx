import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000';

const Leaderboard = ({ refreshTrigger }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [finalizing, setFinalizing] = useState(false);
  
  const navigate = useNavigate();

  const fetchData = () => {
    axios.get(`${API}/scores/leaderboard`)
      .then(res => setLeaderboard(res.data))
      .catch(err => console.error("Error fetching leaderboard:", err));

    axios.get(`${API}/scores/anomalies`)
      .then(res => setAnomalies(res.data.anomalies || []))
      .catch(err => console.error("Error fetching anomalies:", err));
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleResolve = async (scoreId) => {
    if (!window.confirm("Mark this anomaly as reviewed and resolved? This will release the team's results.")) return;
    setResolvingId(scoreId);
    try {
      await axios.post(`${API}/scores/resolve/${scoreId}`);
      fetchData(); 
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
      fetchData(); 
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

    if (!window.confirm("End the evaluation phase? The AI will now calculate winners based on your configuration rules and draft the progression emails.")) return;

    setFinalizing(true);
    try {
      await axios.post(`${API}/scores/finalize`);
      alert("Evaluation ended successfully! Taking you to the Communications tab to review and send the drafted results.");
      navigate('/comms'); // Redirect to Communications log to approve the drafts!
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

  return (
    <div className="w-full">
      {/* 🔴 ANOMALY RESOLUTION DASHBOARD 🔴 */}
      {anomalies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">⚠️</span>
            <h3 className="text-xl font-bold text-red-800 m-0">Action Required: Anomaly Resolution</h3>
          </div>
          <p className="text-red-700 text-sm mb-5">
            The evaluation engine has paused the pipeline. The following scores deviate significantly from the panel average (&gt; 20% variance). Review the judge's notes and resolve the discrepancies to unlock the leaderboard.
          </p>
          
          <div className="space-y-4">
            {anomalies.map(anomaly => (
              <div key={anomaly.id} className="bg-white border border-red-200 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-lg mb-1">Team #{anomaly.team_id}</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Evaluator:</strong> {anomaly.judge_name} <span className="mx-2">|</span> 
                    <strong>Flagged Score:</strong> <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">{anomaly.score}</span>
                  </p>
                  <div className="text-sm text-gray-700 italic bg-slate-50 p-3 rounded-md border border-slate-100 relative">
                    <span className="absolute -left-2 -top-2 text-xl opacity-50">❝</span>
                    {anomaly.notes}
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => handleResolve(anomaly.id)}
                    disabled={resolvingId === anomaly.id}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50 shadow-sm w-full"
                  >
                    {resolvingId === anomaly.id ? 'Processing...' : '✓ Accept & Resolve'}
                  </button>
                  <button
                    onClick={() => handleReject(anomaly.id, anomaly.judge_name)}
                    disabled={resolvingId === anomaly.id}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors disabled:opacity-50 shadow-sm w-full"
                  >
                    {resolvingId === anomaly.id ? 'Processing...' : '❌ Reject & Re-score'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🏆 LIVE LEADERBOARD 🏆 */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-gray-800">Live Leaderboard</h3>
        
        {/* NEW END EVALUATION BUTTON */}
        <button
          onClick={handleFinalizeEvaluation}
          disabled={finalizing || leaderboard.length === 0}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {finalizing ? 'Drafting Emails...' : '✅ End Evaluation & Draft Results'}
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200">
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500">Rank</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500">Team Name</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 text-right">Avg Score</th>
              <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaderboard.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-gray-400 font-medium">No evaluations submitted yet.</td>
              </tr>
            ) : (
              leaderboard.map((team, index) => (
                <React.Fragment key={team.team_id}>
                  <tr 
                    onClick={() => toggleRow(team.team_id)} 
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedTeamId === team.team_id ? 'bg-slate-50' : ''}`}
                  >
                    <td className="p-4 font-bold text-gray-700">#{index + 1}</td>
                    <td className="p-4 font-semibold text-blue-700">{team.team_name}</td>
                    <td className="p-4 font-black text-gray-800 text-right text-lg">{team.average_score.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      {team.results_on_hold ? (
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                          ON HOLD (Anomaly)
                        </span>
                      ) : (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                          CLEARED
                        </span>
                      )}
                    </td>
                  </tr>
                  
                  {/* Expandable Judge Breakdown */}
                  {expandedTeamId === team.team_id && (
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <td colSpan="4" className="p-6">
                        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-inner">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Evaluation Breakdown</h4>
                          {team.scores.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {team.scores.map((score, idx) => (
                                <div key={idx} className={`p-4 rounded-lg border ${score.anomaly_flagged ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex justify-between mb-2">
                                    <span className="font-bold text-slate-800">{score.judge_name}</span>
                                    <span className={`font-bold ${score.anomaly_flagged ? 'text-red-600' : 'text-blue-600'}`}>
                                      {score.score.toFixed(2)} {score.anomaly_flagged && " (⚠️ Flagged)"}
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-600 italic m-0">"{score.notes}"</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500 m-0">No detailed scores available for this team yet.</p>
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
      <p className="text-xs text-gray-400 mt-3 font-medium">
        * Teams flagged with an anomaly have a judge score deviating &gt; 20% from the panel average. Click any row to view individual judge scores.
      </p>
    </div>
  );
};

export default Leaderboard;