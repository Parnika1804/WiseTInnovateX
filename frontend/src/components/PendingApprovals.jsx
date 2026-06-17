import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'http://localhost:8000';

const Badge = ({ count }) =>
  count > 0 ? (
    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full shadow-sm">
      {count}
    </span>
  ) : null;

const SectionHead = ({ icon, label, count }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="text-lg">{icon}</span>
    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{label}</span>
    <Badge count={count} />
  </div>
);

const Card = ({ children, highlight }) => (
  <div className={`p-4 rounded-xl border mb-3 transition-colors shadow-sm ${
    highlight
      ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20'
      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
  }`}>
    {children}
  </div>
);

const ActionBtn = ({ onClick, disabled, variant, children }) => {
  const styles = {
    green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:border-green-300 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 dark:hover:bg-green-500/20',
    red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:border-red-300 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 dark:hover:bg-blue-500/20'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-semibold border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {children}
    </button>
  );
};

const PendingApprovals = ({ onAction }) => {
  const [teams, setTeams] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        axios.get(`${API}/team/pending`),
        axios.get(`${API}/evaluation/anomaly`)
      ]);
      setTeams(tRes.data);
      setAnomalies(aRes.data);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  useWebSocket('dashboard', (data) => {
    if (['team_created', 'evaluation_submitted', 'dashboard_updated'].includes(data.event)) {
      fetchData();
    }
  });

  useEffect(() => { fetchData(); }, [fetchData]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleTeam = async (id, act) => {
    setLoadingId(`team-${id}`);
    try {
      await axios.post(`${API}/team/${id}/${act}`);
      showToast(`Team ${act}d!`);
      if (onAction) onAction();
      fetchData();
    } catch (err) {
      showToast(`Failed to ${act} team.`, false);
    }
    setLoadingId(null);
  };

  const handleResolve = async (id) => {
    setLoadingId(`anomaly-${id}`);
    try {
      await axios.post(`${API}/evaluation/anomaly/${id}/resolve`);
      showToast('Anomaly resolved!');
      if (onAction) onAction();
      fetchData();
    } catch (err) {
      showToast('Resolution failed.', false);
    }
    setLoadingId(null);
  };

  if (!teams.length && !anomalies.length) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
        <svg className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-slate-500 dark:text-slate-400 font-medium">All caught up! No pending approvals.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      {teams.length > 0 && (
        <div>
          <SectionHead icon="👥" label="Team Approvals" count={teams.length} />
          {teams.map(t => (
            <Card key={t.id}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{t.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                    Members: {t.member_names.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <ActionBtn variant="green" disabled={loadingId === `team-${t.id}`} onClick={() => handleTeam(t.id, 'approve')}>Approve</ActionBtn>
                  <ActionBtn variant="red" disabled={loadingId === `team-${t.id}`} onClick={() => handleTeam(t.id, 'reject')}>Reject</ActionBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {anomalies.length > 0 && (
        <div>
          <SectionHead icon="⚠️" label="Score Anomalies" count={anomalies.length} />
          {anomalies.map(a => (
            <Card key={a.id} highlight>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Team #{a.team_id}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Judge: <span className="font-semibold">{a.judge_name}</span> <span className="mx-1">•</span> Score: <span className="font-semibold">{a.score}</span>
                  </p>
                  {a.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 italic bg-white/50 dark:bg-slate-900/50 p-2 rounded border border-amber-100 dark:border-amber-500/10">"{a.notes}"</p>
                  )}
                </div>
                <div className="shrink-0">
                  <ActionBtn variant="blue" disabled={loadingId === `anomaly-${a.id}`} onClick={() => handleResolve(a.id)}>Resolve</ActionBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-sm font-bold shadow-lg z-50 transition-all transform flex items-center gap-2 ${
          toast.ok
            ? 'bg-green-100 dark:bg-green-900/80 text-green-800 dark:text-green-100 border border-green-200 dark:border-green-700'
            : 'bg-red-100 dark:bg-red-900/80 text-red-800 dark:text-red-100 border border-red-200 dark:border-red-700'
        }`}>
          <span>{toast.ok ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;