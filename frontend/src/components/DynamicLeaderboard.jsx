import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://wisetinnovatex-r4vx.onrender.com';

const DynamicLeaderboard = ({ scoringCategories = [], teamData = [], currentRound = 1, onRoundEnded }) => {
  const [finalizing, setFinalizing] = useState(false);
  const [successOverlay, setSuccessOverlay] = useState(null);

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
      
      const isFinal = res.data.is_final;
      const emailsDrafted = res.data.emails_drafted || 0;
      
      const overlayData = {
        title: isFinal ? "Event Finalized Successfully" : `Round ${currentRound} Finalized Successfully`,
        body: `ACTION REQUIRED: ${emailsDrafted} dispatch emails have been automatically drafted. Review and fire off these emails to notify participants.`
      };

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
    setSuccessOverlay(null);
    localStorage.removeItem('pending_email_dispatch');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!scoringCategories || scoringCategories.length === 0) {
    return (
      <div className="w-full p-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm mt-6 transition-colors duration-300">
        <div className="w-16 h-16 mb-4 bg-slate-50 dark:bg-slate-900/50 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-700/50 transition-colors duration-300">
          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">Awaiting Telemetry</p>
        <p className="text-sm mt-1 font-medium">The leaderboard will render once event schema is parsed and scores arrive.</p>
      </div>
    );
  }

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
    <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-6 relative transition-colors duration-300">
      
      {/* FLOATING BOTTOM BANNER FOR EMAILS */}
      {successOverlay && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] w-[90%] max-w-3xl animate-fade-in-up">
          <div className="bg-emerald-600 dark:bg-emerald-900/95 text-white p-5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between border border-emerald-500 dark:border-emerald-700/50 gap-4 transition-colors duration-300">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div>
                <h4 className="font-black text-xl mb-1">{successOverlay.title}</h4>
                <p className="text-emerald-50 dark:text-emerald-200 text-sm font-medium leading-relaxed">{successOverlay.body}</p>
              </div>
            </div>
            <button 
              onClick={handleGoToComms} 
              className="bg-white dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-transparent dark:border-emerald-800 px-6 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900 shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
            >
              Go to Communications &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Header Container */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800 dark:to-indigo-900/10 border-b border-slate-200 dark:border-slate-700 p-6 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">Live Leaderboard</h3>
              <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border border-transparent dark:border-indigo-800/30 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide transition-colors duration-300">
                Round {currentRound}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium transition-colors duration-300">Rankings based on dynamic evaluation criteria.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30 rounded-full text-xs font-bold uppercase tracking-wider transition-colors duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              Audit Engine Active
            </div>
            <button
              onClick={handleEndEvaluation}
              disabled={finalizing}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50"
            >
              {finalizing ? 'Processing...' : `End Evaluation for Round ${currentRound}`}
            </button>
          </div>
        </div>
      </div>

      {/* Main Scoring Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300 border-collapse transition-colors duration-300">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 uppercase font-bold text-xs border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
            <tr>
              <th className="px-6 py-4 w-20 text-center tracking-wider">Rank</th>
              <th className="px-6 py-4 tracking-wider">Participant Team</th>
              <th className="px-6 py-4 text-center tracking-wider w-36">Integrity Status</th>
              <th className="px-6 py-4 text-left bg-slate-100/50 dark:bg-slate-800/50 tracking-wider w-48 transition-colors duration-300">Total Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 transition-colors duration-300">
            {rankedTeams.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 font-medium transition-colors duration-300">
                  No evaluations submitted yet.
                </td>
              </tr>
            ) : (
              rankedTeams.map((team, index) => {
                const isAnomaly = team.results_on_hold || team.has_anomaly;
                const isFirst = index === 0;
                const isSecond = index === 1;
                const isThird = index === 2;
                
                let rowBg = "hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-300";
                let rankBadge = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-transparent dark:border-slate-600";
                let progressBarColor = "bg-indigo-500 dark:bg-indigo-400";
                let scoreTextColor = "text-indigo-600 dark:text-indigo-400";
                let rankLabel = index + 1;
                
                if (isAnomaly) {
                  rowBg = "bg-rose-50/40 dark:bg-rose-900/10 hover:bg-rose-50/70 dark:hover:bg-rose-900/20 border-l-4 border-l-rose-500 transition-colors duration-300";
                  rankBadge = "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 font-bold";
                  progressBarColor = "bg-rose-400 dark:bg-rose-500";
                  scoreTextColor = "text-rose-600 dark:text-rose-400";
                  rankLabel = "!";
                } else if (isFirst) {
                  rowBg = "bg-gradient-to-r from-amber-50/40 dark:from-amber-900/10 to-transparent hover:from-amber-50/80 dark:hover:from-amber-900/20 transition-colors duration-300 border-l-4 border-l-amber-500/50";
                  rankBadge = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 font-bold shadow-sm";
                  progressBarColor = "bg-amber-400 dark:bg-amber-500";
                  scoreTextColor = "text-amber-600 dark:text-amber-400";
                  rankLabel = "1";
                } else if (isSecond) {
                  rowBg = "bg-gradient-to-r from-slate-100/40 dark:from-slate-700/30 to-transparent hover:from-slate-100/80 dark:hover:from-slate-700/50 transition-colors duration-300 border-l-4 border-l-slate-400/50";
                  rankBadge = "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 font-bold shadow-sm";
                  progressBarColor = "bg-slate-400 dark:bg-slate-500";
                  scoreTextColor = "text-slate-600 dark:text-slate-300";
                  rankLabel = "2";
                } else if (isThird) {
                  rowBg = "bg-gradient-to-r from-orange-50/40 dark:from-orange-900/10 to-transparent hover:from-orange-50/80 dark:hover:from-orange-900/20 transition-colors duration-300 border-l-4 border-l-orange-500/40";
                  rankBadge = "bg-orange-100/80 dark:bg-orange-900/30 text-orange-900 dark:text-orange-400 border border-orange-300/60 dark:border-orange-800/50 font-bold shadow-sm";
                  progressBarColor = "bg-orange-500 dark:bg-orange-600";
                  scoreTextColor = "text-orange-700 dark:text-orange-400";
                  rankLabel = "3";
                }

                return (
                  <tr key={team.id || team.team_id} className={rowBg}>
                    <td className="px-6 py-4 text-center">
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-xs ${rankBadge}`}>
                        {isAnomaly ? '⚠️' : isFirst ? '🥇' : isSecond ? '🥈' : isThird ? '🥉' : index + 1}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 transition-colors duration-300">
                      {team.name || team.team_name}
                      {!team.is_qualified && (
                        <span className="ml-3 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-800/50 transition-colors duration-300">
                          Eliminated
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      {isAnomaly ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 shadow-sm animate-pulse transition-colors duration-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-500"></span>
                          On Hold
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/50 transition-colors duration-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Verified
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 bg-slate-50/30 dark:bg-slate-900/20 transition-colors duration-300">
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-base w-8 text-right transition-colors duration-300 ${scoreTextColor}`}>
                          {team.totalScore.toFixed(2)}
                        </span>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 hidden sm:block overflow-hidden transition-colors duration-300">
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
      
      <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700 px-6 transition-colors duration-300">
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