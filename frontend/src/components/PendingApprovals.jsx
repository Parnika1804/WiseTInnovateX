import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'http://localhost:8000';

const Badge = ({ count }) =>
  count > 0 ? (
    <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm">
      {count}
    </span>
  ) : null;

const SectionHead = ({ icon, label, count }) => (
  <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0 border-b border-slate-100 dark:border-slate-700/50 pb-2 transition-colors duration-300">
    <span className="text-base">{icon}</span>
    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors duration-300">{label}</span>
    <Badge count={count} />
  </div>
);

const Card = ({ children, highlight }) => (
  <div className={`p-4 rounded-xl border mb-3 transition-colors duration-300 shadow-sm ${
    highlight 
      ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30' 
      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/60'
  }`}>
    {children}
  </div>
);

// Updated to use soft background colors to reduce visual congestion
const ActionBtn = ({ onClick, disabled, variant, children }) => {
  const styles = {
    green: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-800/30',
    red:   'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-800/30',
    blue:  'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-800/30',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
    >
      {children}
    </button>
  );
};

const PendingApprovals = ({ onAction }) => {
  const [pendingTeams, setPendingTeams] = useState([]);
  const [anomalies,    setAnomalies]    = useState([]);
  const [pendingComms, setPendingComms] = useState([]);
  const [pendingMentions, setPendingMentions] = useState([]);
  const [loadingId,    setLoadingId]    = useState(null);
  const [toast,        setToast]        = useState('');
  const [expanded,     setExpanded]     = useState({});

  const emailCount = pendingComms.length;
  const totalCount = pendingTeams.length + anomalies.length + emailCount + pendingMentions.length;

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [teamsRes, anomalyRes, pendingRes, mentionsRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/scores/anomalies`),
        axios.get(`${API}/comms/pending`),
        axios.get(`${API}/special-mention`),
      ]);
      setPendingTeams((teamsRes.data || []).filter(t => t.status === 'PENDING'));
      setAnomalies(anomalyRes.data?.anomalies || []);
      setPendingComms(pendingRes.data || []);
      setPendingMentions((mentionsRes.data || []).filter(m => m.status === 'PENDING'));
    } catch (e) {
      console.error('PendingApprovals load error:', e);
    }
  }, []);

  useWebSocket('comms', (data) => {
    if (data.event === 'comms_updated') load();
  });
  useWebSocket('dashboard', (data) => {
    if (data.event === 'dashboard_updated') load();
  });

  useEffect(() => { load(); }, [load]);

  const handleTeam = async (teamId, action) => {
    setLoadingId(`team-${teamId}-${action}`);
    try {
      await axios.post(`${API}/teams/approve`, { team_id: teamId, action });
      showToast(`Team ${action.toLowerCase()} successfully.`);
      load(); onAction?.();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Action failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleMention = async (nominationId, action) => {
    setLoadingId(`mention-${nominationId}-${action}`);
    try {
      await axios.post(`${API}/special-mention/approve`, { 
        nomination_id: nominationId, 
        action, 
        reviewed_by: 'committee' 
      });
      showToast(`Nomination ${action.toLowerCase()} successfully.`);
      load(); onAction?.();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Action failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleResolve = async (scoreId) => {
    setLoadingId(`anomaly-${scoreId}`);
    try {
      await axios.post(`${API}/scores/resolve/${scoreId}`);
      showToast('Anomaly resolved.');
      load(); onAction?.();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Resolve failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleApproveAll = async (commType, count) => {
    setLoadingId(`batch-approve-${commType}`);
    try {
      const res = await axios.post(`${API}/comms/approve-type/${commType}`);
      alert(`✅ Successfully sent ${res.data?.sent || count} ${commType} email(s).`);
      load();
    } catch (e) {
      alert(`❌ Batch approval failed: ${e.response?.data?.detail || e.message}`);
    } finally { setLoadingId(null); }
  };

  const handleRejectAll = async (commType) => {
    if (!window.confirm(`Are you sure you want to discard all pending ${commType} emails?`)) return;
    setLoadingId(`batch-reject-${commType}`);
    try {
      await axios.post(`${API}/comms/reject-type/${commType}`);
      alert(`🗑️ Rejected pending ${commType} emails.`);
      load();
    } catch (e) {
      alert(`❌ Batch rejection failed: ${e.response?.data?.detail || e.message}`);
    } finally { setLoadingId(null); }
  };

  const toggleExpand = (key) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const commsGrouped = pendingComms.reduce((acc, log) => {
    const type = log.comm_type || 'UNCATEGORIZED';
    if (!acc[type]) acc[type] = [];
    acc[type].push(log);
    return acc;
  }, {});

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 relative transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300">Action Center</h3>
          {totalCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-sm animate-pulse">
              {totalCount} Pending
            </span>
          )}
        </div>
        <button onClick={load} className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-300 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          Refresh
        </button>
      </div>

      {totalCount === 0 && (
        <div className="text-center py-10 text-slate-400 dark:text-slate-500 transition-colors duration-300">
          <div className="text-4xl mb-3 opacity-50"> </div>
          <p className="text-sm font-medium">Inbox zero! You're all caught up.</p>
        </div>
      )}

      {/* EMAILS - Summary Only */}
      {Object.entries(commsGrouped).map(([type, logs]) => (
        <div key={type} className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-lg"> </div>
              <div>
                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300 block">
                  {type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-indigo-700/70 dark:text-indigo-400/70 block mt-0.5">
                  {logs.length} draft{logs.length !== 1 && 's'} awaiting approval
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <ActionBtn 
                variant="green" 
                onClick={() => handleApproveAll(type, logs.length)}
                disabled={loadingId === `batch-approve-${type}`}
              >
                Send All
              </ActionBtn>
              <ActionBtn 
                variant="red" 
                onClick={() => handleRejectAll(type)}
                disabled={loadingId === `batch-reject-${type}`}
              >
                Discard
              </ActionBtn>
            </div>
          </div>
        </div>
      ))}

      {/* PENDING TEAMS */}
      {pendingTeams.length > 0 && (
        <div className="mb-2">
          <SectionHead icon="👥" label="Team Formations" count={pendingTeams.length} />
          {pendingTeams.map(team => (
            <Card key={team.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{team.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{(team.member_ids || []).length} participants</p>
                  {team.rationale && (
                    <div className="mt-3">
                      <button onClick={() => toggleExpand(`team-${team.id}`)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors flex items-center gap-1">
                        {expanded[`team-${team.id}`] ? '▲ Hide rationale' : '▼ View AI rationale'}
                      </button>
                      {expanded[`team-${team.id}`] && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 border-l-2 border-indigo-400 dark:border-indigo-500 pl-3 py-2 rounded-r-lg transition-colors duration-300">
                          {team.rationale}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <ActionBtn variant="green" disabled={loadingId === `team-${team.id}-APPROVED`} onClick={() => handleTeam(team.id, 'APPROVED')}>Approve</ActionBtn>
                  <ActionBtn variant="red" disabled={loadingId === `team-${team.id}-REJECTED`} onClick={() => handleTeam(team.id, 'REJECTED')}>Reject</ActionBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* SPECIAL MENTIONS */}
      {pendingMentions.length > 0 && (
        <div className="mb-2">
          <SectionHead icon="🌟" label="Special Mentions" count={pendingMentions.length} />
          {pendingMentions.map(m => (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{m.team_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Nominated by mentor: <strong className="text-slate-700 dark:text-slate-300">{m.mentor_name}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.nominated_members.map(member => (
                      <span key={member.id} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50 rounded-full text-[10px] font-semibold">
                        {member.name}
                      </span>
                    ))}
                  </div>
                  {m.mentor_reason && (
                    <div className="mt-3">
                      <button onClick={() => toggleExpand(`mention-${m.id}`)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors flex items-center gap-1">
                        {expanded[`mention-${m.id}`] ? '▲ Hide reason' : '▼ View reason'}
                      </button>
                      {expanded[`mention-${m.id}`] && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 border-l-2 border-indigo-400 dark:border-indigo-500 pl-3 py-2 rounded-r-lg transition-colors duration-300">
                          {m.mentor_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <ActionBtn variant="green" disabled={loadingId === `mention-${m.id}-APPROVED`} onClick={() => handleMention(m.id, 'APPROVED')}>Approve</ActionBtn>
                  <ActionBtn variant="red" disabled={loadingId === `mention-${m.id}-REJECTED`} onClick={() => handleMention(m.id, 'REJECTED')}>Reject</ActionBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ANOMALIES */}
      {anomalies.length > 0 && (
        <div className="mb-2">
          <SectionHead label="Score Anomalies" count={anomalies.length} />
          {anomalies.map(a => (
            <Card key={a.id} highlight>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Team #{a.team_id}</p>
                  <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">
                    Reviewer: <strong className="font-semibold">{a.judge_name}</strong> &nbsp;·&nbsp; Score: <strong className="font-semibold">{a.score}</strong>
                  </p>
                  {a.notes && <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 bg-white/50 dark:bg-slate-900/30 p-2 rounded border border-amber-100 dark:border-amber-800/20 italic">"{a.notes}"</p>}
                </div>
                <ActionBtn variant="blue" disabled={loadingId === `anomaly-${a.id}`} onClick={() => handleResolve(a.id)}>Resolve</ActionBtn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Fixed Position Toast */}
      {toast && (
        <div className={`absolute bottom-4 right-4 left-4 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg z-10 transition-all duration-300 flex items-center gap-2 ${
          toast.ok 
            ? 'bg-emerald-50 dark:bg-emerald-900/90 text-emerald-800 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-700' 
            : 'bg-rose-50 dark:bg-rose-900/90 text-rose-800 dark:text-rose-100 border border-rose-200 dark:border-rose-700'
        }`}>
          <span>{toast.ok ? '✓' : '✕'}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;