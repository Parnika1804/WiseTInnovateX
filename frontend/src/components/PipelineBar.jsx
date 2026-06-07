import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const PipelineBar = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [advancing, setAdvancing] = useState(false);
  const [toast, setToast] = useState('');
  const [rosterCount, setRosterCount] = useState(0);
  const [teams, setTeams] = useState([]);
  const [hasScores, setHasScores] = useState(false);

  const loadSideData = useCallback(() => {
    axios.get(`${API}/roster`).then(res => setRosterCount(res.data.length)).catch(() => {});
    axios.get(`${API}/teams`).then(res => setTeams(res.data)).catch(() => {});
    axios.get(`${API}/scores/leaderboard`).then(res => setHasScores(res.data.length > 0)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    axios.get(`${API}/pipeline/dynamic/status`)
      .then(res => {
        if (res.data.status === 'not_configured') {
          setError(res.data.message);
        } else {
          setError('');
          setData(res.data);
        }
      })
      .catch(() => setError('Could not load pipeline status.'));
    loadSideData();
  }, [loadSideData]);

  useEffect(() => {
    load();
    const intervalId = setInterval(() => { load(); }, 5000);
    return () => clearInterval(intervalId);
  }, [load]);

  const handleAdvance = async () => {
    if (!window.confirm(
      `Advance pipeline from "${data.current_stage}" to the next stage?\n\nThis will trigger automated stage emails to participants.`
    )) return;

    setAdvancing(true);
    try {
      const res = await axios.post(`${API}/pipeline/advance`);
      setToast(`✓ ${res.data.message}`);
      load();
      setTimeout(() => setToast(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to advance stage.';
      setToast(`✗ ${msg}`);
      setTimeout(() => setToast(''), 4000);
    } finally {
      setAdvancing(false);
    }
  };

  // Visual override logic — determines pill color based on system state
  const getVisualStatus = (stage, dbStatus) => {
  const label = stage.label?.toLowerCase() || '';
  const name = stage.name?.toLowerCase() || '';

  const isRegistration = label.includes('registr') || name.includes('registr');
  const isTeamFormation = label.includes('team') || name.includes('team');
  const approvedTeams = teams.filter(t => t.status === 'APPROVED');

  // Registration: green if roster uploaded, but only if not currently ACTIVE in DB
  if (isRegistration) {
    if (dbStatus === 'ACTIVE') return 'ACTIVE';
    if (rosterCount > 0) return 'COMPLETED';
    return dbStatus;
  }

  // Team Formation: green if teams approved, blue if teams exist but none approved yet
  if (isTeamFormation) {
    if (dbStatus === 'ACTIVE') return 'ACTIVE';
    if (dbStatus === 'COMPLETED') return 'COMPLETED';
    if (approvedTeams.length > 0) return 'COMPLETED';
    if (teams.length > 0) return 'ACTIVE';
    return dbStatus;
  }

  // All other stages (rounds etc) — trust DB completely, no visual override
  return dbStatus;
};
  if (error) return (
    <div className="w-full p-8 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 mb-6">
      <p className="font-medium text-gray-600">{error}</p>
      <p className="text-sm">Please go to the "Setup Event" tab to configure your pipeline.</p>
    </div>
  );

  if (!data) return <div className="p-4 text-gray-500">Loading pipeline...</div>;

  const completedCount = data.stages?.filter(s => s.status === 'COMPLETED').length || 0;
  const progressPct = data.total_stages > 1
    ? Math.round((completedCount / (data.total_stages - 1)) * 100)
    : data.is_final_stage ? 100 : 0;

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            Event Pipeline: <span className="text-blue-600">{data.event_name}</span>
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Stage {(data.current_stage_index ?? 0) + 1} of {data.total_stages}
            {data.is_final_stage && (
              <span className="ml-2 text-green-600 font-medium">· Event complete</span>
            )}
          </p>
        </div>

        {!data.is_final_stage && (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {advancing ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
            Advance Stage
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stage pills */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {data.stages?.map((stage) => {
          const visualStatus = getVisualStatus(stage, stage.status);
          return (
            <div
              key={stage.order}
              title={stage.description}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                visualStatus === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : visualStatus === 'COMPLETED'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              {visualStatus === 'COMPLETED' && (
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {stage.order}. {stage.label}
            </div>
          );
        })}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mt-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
          toast.startsWith('✓') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default PipelineBar;