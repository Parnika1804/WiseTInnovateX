import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

/* ── tiny helpers ─────────────────────────────────────────────────── */
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
    highlight
      ? 'bg-amber-50 border-amber-200'
      : 'bg-white border-gray-200'
  }`}>
    {children}
  </div>
);

const ActionBtn = ({ onClick, disabled, variant, children }) => {
  const styles = {
    green:  'bg-green-600 hover:bg-green-700 text-white',
    red:    'bg-red-500 hover:bg-red-600 text-white',
    blue:   'bg-blue-600 hover:bg-blue-700 text-white',
    gray:   'bg-gray-200 hover:bg-gray-300 text-gray-700',
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

/* ── main component ───────────────────────────────────────────────── */
const PendingApprovals = ({ onAction }) => {
  const [pendingTeams,  setPendingTeams]  = useState([]);
  const [anomalies,     setAnomalies]     = useState([]);
  const [draftComms,    setDraftComms]    = useState([]);
  const [loadingId,     setLoadingId]     = useState(null);
  const [toast,         setToast]         = useState('');
  const [expanded,      setExpanded]      = useState({});

  const totalCount = pendingTeams.length + anomalies.length + draftComms.length;

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [teamsRes, anomalyRes, commsRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/scores/anomalies`),
        axios.get(`${API}/comms/log`),
      ]);
      setPendingTeams((teamsRes.data || []).filter(t => t.status === 'PENDING'));
      setAnomalies(anomalyRes.data?.anomalies || []);
      setDraftComms((commsRes.data || []).filter(c => c.status === 'DRAFT'));
    } catch (e) {
      console.error('PendingApprovals load error:', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* team approve / reject */
  const handleTeam = async (teamId, action) => {
    setLoadingId(`team-${teamId}-${action}`);
    try {
      await axios.post(`${API}/teams/approve`, { team_id: teamId, action });
      showToast(`Team ${action.toLowerCase()} successfully.`);
      load();
      onAction?.();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Action failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  /* anomaly resolve */
  const handleResolve = async (scoreId) => {
    setLoadingId(`anomaly-${scoreId}`);
    try {
      await axios.post(`${API}/scores/resolve/${scoreId}`);
      showToast('Anomaly resolved. Results are no longer on hold.');
      load();
      onAction?.();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Resolve failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  /* draft comm send */
  const handleSend = async (logId, email) => {
    setLoadingId(`comm-${logId}`);
    try {
      await axios.post(`${API}/comms/send`, { log_id: logId });
      showToast(`Email sent to ${email}.`);
      load();
      onAction?.();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Send failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleExpand = (key) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* header */}
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

      {/* ── PENDING TEAMS ── */}
      {pendingTeams.length > 0 && (
        <div className="mb-5">
          <SectionHead icon="👥" label="Teams awaiting approval" count={pendingTeams.length} />
          {pendingTeams.map(team => (
            <Card key={team.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{team.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(team.member_ids || []).length} members
                  </p>
                  {team.rationale && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleExpand(`team-${team.id}`)}
                        className="text-xs text-blue-600 hover:underline"
                      >
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
                  <ActionBtn
                    variant="green"
                    disabled={loadingId === `team-${team.id}-APPROVED`}
                    onClick={() => handleTeam(team.id, 'APPROVED')}
                  >
                    Approve
                  </ActionBtn>
                  <ActionBtn
                    variant="red"
                    disabled={loadingId === `team-${team.id}-REJECTED`}
                    onClick={() => handleTeam(team.id, 'REJECTED')}
                  >
                    Reject
                  </ActionBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── ANOMALIES ── */}
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
                  {a.notes && (
                    <p className="text-xs text-gray-500 mt-1 italic">"{a.notes}"</p>
                  )}
                  <p className="text-xs text-amber-600 mt-1">
                    This score deviates significantly from panel average. Results are held until resolved.
                  </p>
                </div>
                <ActionBtn
                  variant="blue"
                  disabled={loadingId === `anomaly-${a.id}`}
                  onClick={() => handleResolve(a.id)}
                >
                  Resolve
                </ActionBtn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── DRAFT COMMS ── */}
      {draftComms.length > 0 && (
        <div>
          <SectionHead icon="📧" label="Draft communications not yet sent" count={draftComms.length} />
          {draftComms.map(c => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{c.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">To: {c.recipient_email}</p>
                  <div className="mt-2">
                    <button
                      onClick={() => toggleExpand(`comm-${c.id}`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {expanded[`comm-${c.id}`] ? '▲ Hide preview' : '▼ Preview message'}
                    </button>
                    {expanded[`comm-${c.id}`] && (
                      <p className="mt-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 p-2 rounded whitespace-pre-wrap">
                        {c.message.slice(0, 300)}{c.message.length > 300 ? '…' : ''}
                      </p>
                    )}
                  </div>
                </div>
                <ActionBtn
                  variant="blue"
                  disabled={loadingId === `comm-${c.id}`}
                  onClick={() => handleSend(c.id, c.recipient_email)}
                >
                  Send
                </ActionBtn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className={`mt-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
          toast.ok
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;
