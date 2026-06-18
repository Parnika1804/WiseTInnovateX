import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DynamicTeamConfig = ({ onRulesConfirmed }) => {
  const [numRounds, setNumRounds]         = useState(1);
  const [qualifyPercents, setQualifyPercents] = useState([50]);
  const [isConfirmed, setIsConfirmed]     = useState(false);
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState('');

  useEffect(() => {
    setQualifyPercents(prev => {
      const next = [...prev];
      while (next.length < numRounds) next.push(50);
      return next.slice(0, numRounds);
    });
  }, [numRounds]);

  const handlePercentChange = (idx, val) => {
    const clamped = Math.max(1, Math.min(100, Number(val)));
    setQualifyPercents(prev => prev.map((p, i) => (i === idx ? clamped : p)));
    setIsConfirmed(false);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');

    try {
      const rules = qualifyPercents.map((pct, idx) => ({
        round: idx + 1,
        stage_name: `Round ${idx + 1}`,
        rule: idx === numRounds - 1
          ? 'final round — no elimination'
          : `top ${pct}% advance`,
      }));

      await axios.patch('http://localhost:8000/event/config/advancement-rules', { rules });
      setIsConfirmed(true);
      if (onRulesConfirmed) onRulesConfirmed({ numRounds, qualifyPercents });
    } catch (err) {
      setSaveError(err?.response?.data?.detail || 'Failed to save. Is the event configured yet?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-6 transition-colors duration-300">

      {/* Header */}
      <div className="bg-blue-50 dark:bg-indigo-900/10 border-b border-blue-100 dark:border-indigo-800/30 p-5 flex items-start justify-between transition-colors duration-300">
        <div>
          <h3 className="text-lg font-bold text-blue-900 dark:text-indigo-100 flex items-center gap-2 transition-colors duration-300">
            Round Configuration
          </h3>
          <p className="text-sm text-blue-700 dark:text-indigo-300/70 mt-1 transition-colors duration-300">
            Define how many rounds this event has and what percentage of teams advance after each round.
          </p>
        </div>
        {isConfirmed && (
          <span className="bg-green-100 dark:bg-emerald-900/30 text-green-800 dark:text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1 shrink-0 border border-green-200 dark:border-emerald-800/50 transition-colors duration-300">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Confirmed
          </span>
        )}
      </div>

      <form onSubmit={handleConfirm} className="p-6 space-y-5">

        {/* Number of rounds */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 transition-colors duration-300">
            How many rounds are you conducting?
          </label>
          <input
            type="number" min="1" max="10" value={numRounds}
            onChange={(e) => { setNumRounds(Math.max(1, parseInt(e.target.value) || 1)); setIsConfirmed(false); }}
            className="w-24 p-2.5 border border-gray-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors duration-300"
          />
        </div>

        {/* Per-round qualify % */}
        {numRounds > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-slate-400 transition-colors duration-300">
              What percentage of teams qualify for the next round?
            </p>
            {qualifyPercents.map((pct, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg border border-gray-200 dark:border-slate-700/50 transition-colors duration-300">
                <span className="text-sm font-bold text-blue-700 dark:text-indigo-400 w-24 shrink-0 transition-colors duration-300">
                  Round {idx + 1}
                  {idx === numRounds - 1 && (
                    <span className="ml-1 text-xs text-gray-400 dark:text-slate-500 font-normal transition-colors duration-300">(Final)</span>
                  )}
                </span>
                {idx < numRounds - 1 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="1" max="100" value={pct}
                      onChange={(e) => handlePercentChange(idx, e.target.value)}
                      className="w-20 p-2 border border-gray-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm transition-colors duration-300"
                    />
                    <span className="text-sm text-gray-600 dark:text-slate-400 transition-colors duration-300">% advance to Round {idx + 2}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-slate-500 italic transition-colors duration-300">
                    All qualified teams compete — winners decided by scores
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {saveError && (
          <div className="bg-red-50 dark:bg-rose-900/30 border border-red-200 dark:border-rose-800/50 text-red-700 dark:text-rose-400 text-sm rounded-lg p-3 transition-colors duration-300">
            Error: {saveError}
          </div>
        )}

        <div className="pt-2 flex justify-end gap-3">
          {isConfirmed && (
            <button type="button" onClick={() => setIsConfirmed(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
              Edit
            </button>
          )}
          <button type="submit" disabled={saving}
            className={`px-6 py-2.5 rounded-lg font-semibold text-white transition-colors duration-300 ${
              saving ? 'bg-blue-300 dark:bg-indigo-800/50 dark:text-slate-400 cursor-not-allowed'
              : isConfirmed ? 'bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-700'
              : 'bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-700'
            }`}>
            {saving ? 'Saving…' : isConfirmed ? 'Confirmed — Update' : 'Confirm Rounds'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DynamicTeamConfig;