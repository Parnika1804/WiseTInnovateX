import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AnnouncementForm from './AnnouncementForm';

const API = 'http://localhost:8000';

const STAGE_OPTIONS = [
  { value: 'EVALUATION', label: 'Evaluation Reminder' },
  { value: 'RESULTS', label: 'Results / Final Outcomes' },
];

// Email modal
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
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="font-bold text-gray-800 text-lg">
            {mode === 'edit' ? '✏️ Edit Email' : '👁️ View Email'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
            <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{comm.recipient_email}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
            {mode === 'edit' ? (
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            ) : (
              <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{subject}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
            {mode === 'edit' ? (
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-vertical" />
            ) : (
              <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 whitespace-pre-wrap">{message}</p>
            )}
          </div>
        </div>
        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Close</button>
          {mode === 'edit' && (
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Email inbox section
const EmailInbox = () => {
  const [pendingComms, setPendingComms] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(''), 3500);
  };

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/comms/pending`);
      setPendingComms(res.data || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // BUG #4 FIX: Added setInterval and clearInterval for 30-second polling
  useEffect(() => { 
    load(); 
    const intervalId = setInterval(load, 30000);
    return () => clearInterval(intervalId);
  }, [load]);

  const handleApprove = async (logId, email) => {
    setLoadingId(`approve-${logId}`);
    try {
      await axios.post(`${API}/comms/approve/${logId}`);
      showToast(`Email approved and sent to ${email}.`);
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Approve failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (logId) => {
    setLoadingId(`reject-${logId}`);
    try {
      await axios.post(`${API}/comms/reject/${logId}`);
      showToast('Email rejected and discarded.');
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || 'Reject failed.', false);
    } finally {
      setLoadingId(null);
    }
  };

  const batchMap = {};
  pendingComms.forEach(c => {
    const key = c.batch_id || `single-${c.id}`;
    if (!batchMap[key]) batchMap[key] = [];
    batchMap[key].push(c);
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {modal && (
        <EmailModal comm={modal.comm} mode={modal.mode} onClose={() => setModal(null)} onSave={load} />
      )}

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-800">📬 Emails Awaiting Approval</h3>
          {pendingComms.length > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
              {pendingComms.length}
            </span>
          )}
        </div>
        <button onClick={load} className="text-xs text-gray-400 hover:text-gray-600">↻ Refresh</button>
      </div>

      {pendingComms.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">✓</div>
          <p className="text-sm">No emails pending approval.</p>
        </div>
      ) : (
        Object.entries(batchMap).map(([batchId, comms]) => (
          <div key={batchId} className="mb-4 border border-blue-100 rounded-xl overflow-hidden">
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
                      load();
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
                      showToast('Batch rejected.');
                      load();
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

            {comms.map(c => (
              <div key={c.id} className="px-4 py-3 border-t border-blue-100 flex items-center justify-between gap-3 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.subject}</p>
                  <p className="text-xs text-gray-500">To: {c.recipient_email}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setModal({ comm: c, mode: 'view' })}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700">
                    👁 View
                  </button>
                  <button onClick={() => setModal({ comm: c, mode: 'edit' })}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-purple-600 hover:bg-purple-700 text-white">
                    ✏️ Edit
                  </button>
                  <button onClick={() => handleApprove(c.id, c.recipient_email)}
                    disabled={loadingId === `approve-${c.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 hover:bg-green-700 text-white disabled:opacity-50">
                    Approve
                  </button>
                  <button onClick={() => handleReject(c.id)}
                    disabled={loadingId === `reject-${c.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-500 hover:bg-red-600 text-white disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

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

const CommsDraftForm = ({ onDraftSaved }) => {
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('TEAM_ASSIGNMENT');
  const [teamId, setTeamId] = useState('');
  const [preview, setPreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [triggerStage, setTriggerStage] = useState('EVALUATION');
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState(null);

  const handleGenerateDraft = async () => {
    if (!email) return alert('Please enter a recipient email.');
    if (stage === 'TEAM_ASSIGNMENT' && !teamId) return alert('Team ID is required for Team Assignment emails.');
    setIsGenerating(true);
    try {
      const payload = { stage, recipient_email: email, team_id: teamId ? parseInt(teamId) : null };
      const res = await axios.post(`${API}/comms/draft/gemini`, payload);
      setPreview(res.data.preview);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate draft.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendPreview = async () => {
    if (!preview) return;
    setIsSending(true);
    try {
      await axios.post(`${API}/comms/send`, { log_id: preview.id });
      alert(`✅ Email sent to ${preview.recipient_email} via SendGrid!`);
      setPreview(null); setEmail(''); setTeamId('');
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSavePreview = async () => {
    try {
      await axios.post(`${API}/comms/draft`, {
        recipient_email: preview.recipient_email,
        subject: preview.subject,
        message: preview.message,
      });
      alert('Draft saved!');
      setPreview(null); setEmail(''); setTeamId('');
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      alert('Failed to save draft.');
    }
  };

  const handleTriggerStage = async () => {
    if (!window.confirm(`Draft ${triggerStage} emails for all participants?`)) return;
    setIsTriggering(true);
    setTriggerResult(null);
    try {
      const res = await axios.post(`${API}/comms/trigger-stage?stage=${triggerStage}`);
      setTriggerResult(res.data);
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      alert(err.response?.data?.detail || 'Stage trigger failed.');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div>
      {/* Email inbox at top */}
      <EmailInbox />

      {/* Announcement */}
      <AnnouncementForm onSent={onDraftSaved} />

      {/* Stage Bulk Trigger */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
        <h3 className="font-bold text-blue-800 mb-1">⚡ Stage Email Trigger</h3>
        <p className="text-sm text-blue-600 mb-4">Draft stage emails for all participants — goes to approval queue.</p>
        <div className="flex gap-3 items-center flex-wrap">
          <select value={triggerStage} onChange={e => setTriggerStage(e.target.value)}
            className="px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white">
            {STAGE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={handleTriggerStage} disabled={isTriggering}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {isTriggering ? 'Drafting...' : '📝 Draft Emails for Approval'}
          </button>
        </div>
        {triggerResult && (
          <div className="mt-3 p-3 bg-white border border-blue-200 rounded-lg text-sm text-blue-700">
            {triggerResult.triggered
              ? `⏳ ${triggerResult.evaluation_reminder_emails_drafted ?? triggerResult.results_emails_drafted ?? triggerResult.stage_emails_drafted ?? 0} email(s) queued for approval.`
              : `ℹ️ ${triggerResult.reason}`}
          </div>
        )}
      </div>

      {/* Manual Gemini Draft */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-800 mb-1">✨ Auto-Draft with Gemini</h3>
        <p className="text-sm text-gray-500 mb-4">Preview an AI-drafted email before sending.</p>
        <div className="flex flex-col gap-3 mb-4">
          <input type="email" placeholder="Recipient Email" value={email} onChange={e => setEmail(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={stage} onChange={e => setStage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="TEAM_ASSIGNMENT">Team Assignment</option>
            <option value="EVALUATION_REMINDER">Evaluation Reminder</option>
          </select>
          {stage === 'TEAM_ASSIGNMENT' && (
            <input type="number" placeholder="Team ID" value={teamId} onChange={e => setTeamId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          )}
          <button onClick={handleGenerateDraft} disabled={isGenerating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
            {isGenerating ? 'Generating...' : 'Generate Preview'}
          </button>
        </div>

        {preview && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-bold text-gray-800 mb-3">Draft Preview</h4>
            <p className="text-sm mb-1"><strong>To:</strong> {preview.recipient_email}</p>
            <p className="text-sm mb-3"><strong>Subject:</strong> {preview.subject}</p>
            <div className="whitespace-pre-wrap bg-white p-3 border border-gray-200 rounded-lg text-sm text-gray-700 mb-3">
              {preview.message}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSendPreview} disabled={isSending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                {isSending ? 'Sending...' : '✉️ Send via SendGrid'}
              </button>
              <button onClick={handleSavePreview}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg">
                💾 Save as Draft
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommsDraftForm;