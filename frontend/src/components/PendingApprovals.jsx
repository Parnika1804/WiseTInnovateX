import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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
    green:  'bg-green-600 hover:bg-green-700 text-white',
    red:    'bg-red-500 hover:bg-red-600 text-white',
    blue:   'bg-blue-600 hover:bg-blue-700 text-white',
    gray:   'bg-gray-200 hover:bg-gray-300 text-gray-700',
    purple: 'bg-purple-600 hover:bg-purple-700 text-white',
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

// Modal component
const EmailModal = ({ comm, mode, onClose, onSave }) => {
  const [subject, setSubject] = useState(comm.subject);
  const [message, setMessage] = useState(comm.message);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(`${API}/comms/log/${comm.id}`, { subject, message });
      onSave();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-bold text-gray-800 text-lg">
            {mode === 'edit' ? '✏️ Edit Email' : '👁️ View Email'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        {/* Modal body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
            <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{comm.recipient_email}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
            {mode === 'edit' ? (
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            ) : (
              <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{subject}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
            {mode === 'edit' ? (
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-vertical"
              />
            ) : (
              <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 whitespace-pre-wrap">{message}</p>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          {mode === 'edit' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PendingApprovals = ({ onAction }) => {
  const [pendingTeams,  setPendingTeams]  = useState([]);
  const [anomalies,     setAnomalies]     = useState([]);
  const [draftComms,    setDraftComms]    = useState([]);
  const [pendingComms,  setPendingComms]  = useState([]);
  const [loadingId,     setLoadingId]     = useState(null);
  const [toast,         setToast]         = useState('');
  const [expanded,      setExpanded]      = useState({});
  const [modal,         setModal]         = useState(null); // { comm, mode }

  const totalCount = pendingTeams.length + anomalies.length + draftComms.length + pendingComms.length;

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    try {
      const [teamsRes, anomalyRes, commsRes, pendingRes] = await Promise.all([
        axios.get(`${API}/teams`),
        axios.get(`${API}/scores/anomalies`),
        axios.get(`${API}/comms/log`),
        axios.get(`${API}/comms/pending`),
      ]);
      setPendingTeams((teamsRes.data || []).filter(t => t.status === 'PENDING'));
      setAnomalies(anomalyRes.data?.anomalies || []);
      setDraftComms((commsRes.data || []).filter(c => c.status === 'DRAFT'));
      setPendingComms(pendingRes.data || []);
    } catch (e) {
      console.error('PendingApprovals load error:', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const handleApprove = async (logId, email) => {
    setLoadingId(`pending-${logId}`);
    try {
      await axios.post(`${API}/comms/approve/${logId}`);
      showToast(`Email approved and sent to ${email}.`);
      load();
      onAction?.();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Approve failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (logId) => {
    setLoadingId(`pending-reject-${logId}`);
    try {
      await axios.post(`${API}/comms/reject/${logId}`);
      showToast('Email rejected and discarded.');
      load();
      onAction?.();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Reject failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  const toggleExpand = (key) =>
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  // Group pending comms by batch
  const batchMap = {};
  pendingComms.forEach(c => {
    const key = c.batch_id || `single-${c.id}`;
    if (!batchMap[key]) batchMap[key] = [];
    batchMap[key].push(c);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Modal */}
      {modal && (
        <EmailModal
          comm={modal.comm}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSave={load}
        />
      )}

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

      {/* PENDING TEAMS */}
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

      {/* DRAFT COMMS */}
      {draftComms.length > 0 && (
        <div className="mb-5">
          <SectionHead icon="📧" label="Draft communications not yet sent" count={draftComms.length} />
          {draftComms.map(c => (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{c.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">To: {c.recipient_email}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <ActionBtn variant="gray" onClick={() => setModal({ comm: c, mode: 'view' })}>View</ActionBtn>
                  <ActionBtn variant="purple" onClick={() => setModal({ comm: c, mode: 'edit' })}>Edit</ActionBtn>
                  <ActionBtn variant="blue" disabled={loadingId === `comm-${c.id}`} onClick={() => handleSend(c.id, c.recipient_email)}>Send</ActionBtn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PENDING APPROVAL COMMS — grouped by batch */}
      {Object.keys(batchMap).length > 0 && (
        <div>
          <SectionHead icon="📬" label="Emails awaiting your approval" count={pendingComms.length} />
          {Object.entries(batchMap).map(([batchId, comms]) => (
            <div key={batchId} className="mb-4 border border-blue-100 rounded-xl overflow-hidden">
              {/* Batch header */}
              <div className="bg-blue-50 px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-700">{comms[0]?.comm_type?.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-blue-500 ml-2">· {comms.length} emails</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setLoadingId(`batch-approve-${batchId}`);
                      try {
                        await axios.post(`${API}/comms/approve-batch`, { batch_id: batchId });
                        showToast(`${comms.length} emails approved and sent.`);
                        load(); onAction?.();
                      } catch (e) {
                        showToast(e.response?.data?.detail || 'Batch approve failed.', false);
                      } finally { setLoadingId(null); }
                    }}
                    disabled={loadingId === `batch-approve-${batchId}`}
                    className="px-3 py-1 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    ✓ Approve All
                  </button>
                  <button
                    onClick={async () => {
                      setLoadingId(`batch-reject-${batchId}`);
                      try {
                        await axios.post(`${API}/comms/reject-batch`, { batch_id: batchId });
                        showToast(`Batch rejected.`);
                        load(); onAction?.();
                      } catch (e) {
                        showToast(e.response?.data?.detail || 'Batch reject failed.', false);
                      } finally { setLoadingId(null); }
                    }}
                    disabled={loadingId === `batch-reject-${batchId}`}
                    className="px-3 py-1 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50"
                  >
                    ✗ Reject All
                  </button>
                </div>
              </div>

              {/* Individual emails in batch */}
              {comms.map(c => (
                <div key={c.id} className="px-4 py-3 border-t border-blue-100 flex items-center justify-between gap-3 bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.subject}</p>
                    <p className="text-xs text-gray-500">To: {c.recipient_email}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <ActionBtn variant="gray" onClick={() => setModal({ comm: c, mode: 'view' })}>👁 View</ActionBtn>
                    <ActionBtn variant="purple" onClick={() => setModal({ comm: c, mode: 'edit' })}>✏️ Edit</ActionBtn>
                    <ActionBtn variant="green" disabled={loadingId === `pending-${c.id}`} onClick={() => handleApprove(c.id, c.recipient_email)}>Approve</ActionBtn>
                    <ActionBtn variant="red" disabled={loadingId === `pending-reject-${c.id}`} onClick={() => handleReject(c.id)}>Reject</ActionBtn>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className={`mt-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
          toast.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default PendingApprovals;