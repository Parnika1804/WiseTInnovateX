import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'http://localhost:8000';

const Badge = ({ count }) =>
  count > 0 ? (
    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
      {count}
    </span>
  ) : null;

const SectionHead = ({ icon, label, count }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="text-base">{icon}</span>
    <span className="text-sm font-semibold text-gray-700">{label}</span>
    <Badge count={count} />
  </div>
);

const Card = ({ children, highlight }) => (
  <div className={`p-4 rounded-lg border mb-3 ${
    highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'
  }`}>
    {children}
  </div>
);

const ActionBtn = ({ onClick, disabled, variant, children }) => {
  const styles = {
    green: 'bg-green-600 hover:bg-green-700 text-white',
    red:   'bg-red-500 hover:bg-red-600 text-white',
    blue:  'bg-blue-600 hover:bg-blue-700 text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
};

const PendingApprovals = ({ onAction }) => {
  const [pendingTeams, setPendingTeams] = useState([]);
  const [anomalies,    setAnomalies]    = useState([]);
  const [pendingComms, setPendingComms] = useState([]);
  const [loadingId,    setLoadingId]    = useState(null);
  const [toast,        setToast]        = useState('');
  const [expanded,     setExpanded]     = useState({});

  const emailCount = pendingComms.length;
  const totalCount = pendingTeams.length + anomalies.length + emailCount;

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [teamsRes, anomalyRes, pendingRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/scores/anomalies`),
        axios.get(`${API}/comms/pending`),
      ]);
      setPendingTeams((teamsRes.data || []).filter(t => t.status === 'PENDING'));
      setAnomalies(anomalyRes.data?.anomalies || []);
      setPendingComms(pendingRes.data || []);
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

  // --- Email Actions (Updated with alerts for clear visibility) ---
  const handleApproveAll = async (commType, count) => {
    setLoadingId(`batch-approve-${commType}`);
    try {
      const res = await axios.post(`${API}/comms/approve-type/${commType}`);
      // Use alert to ensure the user gets a prominent notification
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-800">Pending Approvals</h3>
          {totalCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {totalCount}
            </span>
          )}
        </div>
        <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          ↻ Refresh
        </button>
      </div>

      {totalCount === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">✓</div>
          <p className="text-sm">No pending approvals — you're all caught up.</p>
        </div>
      )}

      {/* EMAILS - Summary Only */}
      {Object.entries(commsGrouped).map(([type, logs]) => (
        <div key={type} className="mb-4">
          <div className="flex items-center justify-between bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2">
              <span className="text-base">📬</span>
              <span className="text-sm font-semibold text-blue-900">
                {logs.length} {type.replace(/_/g, ' ')} emails ready to approve
              </span>
              <Badge count={logs.length} />
            </div>
            <div className="flex gap-2">
              <ActionBtn 
                variant="green" 
                onClick={() => handleApproveAll(type, logs.length)}
                disabled={loadingId === `batch-approve-${type}`}
              >
                Approve All
              </ActionBtn>
              <ActionBtn 
                variant="red" 
                onClick={() => handleRejectAll(type)}
                disabled={loadingId === `batch-reject-${type}`}
              >
                Reject All
              </ActionBtn>
            </div>
          </div>
        </div>
      ))}

      {/* PENDING TEAMS */}
      {pendingTeams.length > 0 && (
        <div className="mb-5">
          <SectionHead icon="👥" label="Teams awaiting approval" count={pendingTeams.length} />
          {pendingTeams.map(team => (
            <Card key={team.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{team.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(team.member_ids || []).length} members</p>
                  {team.rationale && (
                    <div className="mt-2">
                      <button onClick={() => toggleExpand(`team-${team.id}`)} className="text-xs text-blue-600 hover:underline">
                        {expanded[`team-${team.id}`] ? '▲ Hide' : '▼ AI rationale'}
                      </button>
                      {expanded[`team-${team.id}`] && (
                        <p className="mt-1 text-xs text-gray-600 bg-blue-50 border-l-2 border-blue-300 pl-2 py-1 rounded-r">
                          {team.rationale}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <ActionBtn variant="green" disabled={loadingId === `team-${team.id}-APPROVED`} onClick={() => handleTeam(team.id, 'APPROVED')}>Approve</ActionBtn>
                  <ActionBtn variant="red" disabled={loadingId === `team-${team.id}-REJECTED`} onClick={() => handleTeam(team.id, 'REJECTED')}>Reject</ActionBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ANOMALIES */}
      {anomalies.length > 0 && (
        <div className="mb-5">
          <SectionHead icon="⚠️" label="Score anomalies — results on hold" count={anomalies.length} />
          {anomalies.map(a => (
            <Card key={a.id} highlight>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800">Team #{a.team_id}</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Judge: <strong>{a.judge_name}</strong> · Score: <strong>{a.score}</strong>
                  </p>
                  {a.notes && <p className="text-xs text-gray-500 mt-1 italic">"{a.notes}"</p>}
                </div>
                <ActionBtn variant="blue" disabled={loadingId === `anomaly-${a.id}`} onClick={() => handleResolve(a.id)}>Resolve</ActionBtn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Fixed Position Toast */}
      {toast && (
        <div className={`absolute bottom-4 right-4 left-4 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg z-10 transition-all ${
          toast.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;