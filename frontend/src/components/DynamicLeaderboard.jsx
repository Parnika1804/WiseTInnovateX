import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const DynamicLeaderboard = ({ scoringCategories = [], teamData = [], currentRound = 1, onRoundEnded }) => {
  const [finalizing, setFinalizing] = useState(false);
  const [successOverlay, setSuccessOverlay] = useState(null);

  // Check memory on load: ensures the banner survives if the page auto-refreshes
  useEffect(() => {
    const savedOverlay = localStorage.getItem('pending_email_dispatch');
    if (savedOverlay) {
      setSuccessOverlay(JSON.parse(savedOverlay));
    }
  }, []);

  const handleEndEvaluation = async () => {
    if (!window.confirm(`Are you sure you want to end Evaluation for Round ${currentRound}? This will calculate cutoffs and draft emails.`)) return;
    
    setFinalizing(true);
    setSuccessOverlay(null);
    
    try {
      const res = await axios.post(`${API}/scores/finalize`);
      
      // Determine if it was an intermediate round or the final round based on backend response
      const isFinal = res.data.is_final;
      const emailsDrafted = res.data.emails_drafted || 0;
      
      const overlayData = {
        title: isFinal ? " Event Finalized Successfully!" : `✅ Round ${currentRound} Finalized Successfully!`,
        body: `CRITICAL ACTION REQUIRED: ${emailsDrafted} dispatch emails have been automatically drafted. You must fire off these emails now to notify participants and judges.`
      };

      // Force the UI to show the banner immediately and lock it in memory
      localStorage.setItem('pending_email_dispatch', JSON.stringify(overlayData));
      setSuccessOverlay(overlayData);
      
      if (onRoundEnded) onRoundEnded();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to finalize round. Ensure teams have been scored.");
    } finally {
      setFinalizing(false);
    }
  };

  const handleGoToComms = () => {
    // Clear the banner only when they explicitly click to acknowledge it
    setSuccessOverlay(null);
    localStorage.removeItem('pending_email_dispatch');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // NOTE: If you have a router navigate function, you can trigger it here to push them to the Comms page.
  };

  // Empty State Layout
  if (!scoringCategories || scoringCategories.length === 0) {
    return (
      <div className="w-full p-12 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm mt-6">
        <div className="w-16 h-16 mb-4 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-700">
          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Awaiting Telemetry</p>
        <p className="text-sm mt-1 text-slate-400 dark:text-slate-500">The leaderboard will render once event schema is parsed and scores arrive.</p>
      </div>
    );
  }

  // Calculate totals and sort teams by highest score
  const rankedTeams = useMemo(() => {
    return [...teamData]
      .map(team => {
        const totalScore = scoringCategories.reduce((sum, category) => {
          return sum + (team.scores ? team.scores[category] || 0 : team.average_score || 0);
        }, 0);
        return { ...team, totalScore: team.average_score || totalScore };
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [teamData, scoringCategories]);

  const maxPossibleScore = rankedTeams.length > 0 ? rankedTeams[0].totalScore || 100 : 100;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden mt-6 relative">
      
      {/* 🚀 FLOATING BOTTOM BANNER FOR EMAILS - Highly visible after EVERY round! */}
      {successOverlay && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-3xl animate-fade-in-up">
          <div className="bg-emerald-600 dark:bg-emerald-700 text-white p-5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between border-4 border-emerald-400 dark:border-emerald-600 gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <span className="text-5xl drop-shadow-md">✉️</span>
              <div>
                <h4 className="font-black text-xl mb-1">{successOverlay.title}</h4>
                <p className="text-emerald-50 dark:text-emerald-100 text-sm font-medium">{successOverlay.body}</p>
              </div>
            </div>
            <button 
              onClick={handleGoToComms} 
              className="bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 dark:hover:bg-slate-800 shadow-md transition-colors whitespace-nowrap flex-shrink-0"
            >
              Go to Communications →
            </button>
          </div>
        </div>
      )}

      {/* Header Container */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50/30 dark:from-slate-900 dark:to-blue-950/20 border-b border-slate-200/80 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Live Leaderboard</h3>
              <span className="bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                Round {currentRound}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Rankings based on dynamic evaluation criteria.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></span>
              Audit Engine Active
            </div>
            <button
              onClick={handleEndEvaluation}
              disabled={finalizing}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {finalizing ? 'Processing...' : `End Evaluation for Round ${currentRound}`}
            </button>
          </div>
        </div>
      </div>

      {/* Main Scoring Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs border-b border-slate-200/80 dark:border-slate-700">
            <tr>
              <th className="px-6 py-4 w-20 text-center tracking-wider">Rank</th>
              <th className="px-6 py-4 tracking-wider">Participant Team</th>
              <th className="px-6 py-4 text-center tracking-wider w-36">Integrity Status</th>
              <th className="px-6 py-4 text-left bg-slate-100/50 dark:bg-slate-800/70 tracking-wider w-48">Total Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rankedTeams.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                  No evaluations submitted yet.
                </td>
              </tr>
            ) : (
              rankedTeams.map((team, index) => {
                const isAnomaly = team.results_on_hold || team.has_anomaly;
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;
                
                let rowBg = "hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors";
                let rankBadge = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
                let progressBarColor = "bg-blue-500";
                let scoreTextColor = "text-blue-600 dark:text-blue-400";
                
                if (isAnomaly) {
                  rowBg = "bg-rose-50/40 hover:bg-rose-50/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 border-l-4 border-l-rose-500 dark:border-l-rose-600 transition-colors";
                  rankBadge = "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 shadow-sm font-bold";
                  progressBarColor = "bg-rose-400";
                  scoreTextColor = "text-rose-600 dark:text-rose-400";
                } else if (isFirst) {
                  rowBg = "bg-gradient-to-r from-amber-50/40 to-transparent hover:from-amber-50/80 dark:from-amber-950/20 dark:hover:from-amber-950/30 transition-colors border-l-4 border-l-amber-500/30 dark:border-l-amber-500/50";
                  rankBadge = "bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 shadow-sm font-bold";
                  progressBarColor = "bg-amber-400";
                  scoreTextColor = "text-amber-600 dark:text-amber-400";
                } else if (isSecond) {
                  rowBg = "bg-gradient-to-r from-slate-100/40 to-transparent hover:from-slate-100/80 dark:from-slate-800/40 dark:hover:from-slate-800/60 transition-colors border-l-4 border-l-slate-400/30 dark:border-l-slate-500/40";
                  rankBadge = "bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 shadow-sm font-bold";
                  progressBarColor = "bg-slate-400";
                  scoreTextColor = "text-slate-600 dark:text-slate-300";
                } else if (isThird) {
                  rowBg = "bg-gradient-to-r from-amber-950/[0.02] to-transparent hover:from-amber-950/[0.05] dark:from-orange-950/20 dark:hover:from-orange-950/30 transition-colors border-l-4 border-l-orange-700/40 dark:border-l-orange-600/50";
                  rankBadge = "bg-orange-100/80 text-orange-900 border border-orange-300/60 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 shadow-xs font-bold";
                  progressBarColor = "bg-orange-700";
                  scoreTextColor = "text-orange-900 dark:text-orange-300";
                }

                return (
                  <tr key={team.id || team.team_id} className={rowBg}>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${rankBadge}`}>
                        {isAnomaly ? '⚠️' : isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : index + 1}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
                      {team.name || team.team_name}
                      {!team.is_qualified && (
                        <span className="ml-3 text-xs font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded border border-red-100 dark:border-red-800">
                          Eliminated
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      {isAnomaly ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 shadow-xs animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400"></span>
                          On Hold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200/60 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400"></span>
                          Verified
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 bg-slate-50/30 dark:bg-slate-800/20">
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-base w-8 text-right ${scoreTextColor}`}>
                          {team.totalScore.toFixed(2)}
                        </span>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 hidden sm:block overflow-hidden">
                          <div 
                            className={`h-1.5 rounded-full transition-all duration-500 ${progressBarColor}`}
                            style={{ width: `${(team.totalScore / maxPossibleScore) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 border-t border-slate-100 dark:border-slate-800 px-6">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          * Deviance Guard: Submissions are frozen if a unique evaluator variant metric shifts &gt; 2.0 total points away from consensus arrays.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default DynamicLeaderboard;