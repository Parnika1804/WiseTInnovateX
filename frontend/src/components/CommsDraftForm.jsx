import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AnnouncementForm from './AnnouncementForm';

const API = 'https://wisetinnovatex-r4vx.onrender.com';

const STAGE_OPTIONS = [
  { value: 'EVALUATION', label: 'Evaluation Reminder' },
  { value: 'RESULTS', label: 'Results / Final Outcomes' },
];

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
    <div className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col transition-colors duration-300">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-700/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
            {mode === 'edit' ? 'Edit Email' : 'View Email'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 text-2xl font-medium leading-none">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">To</label>
            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">{comm.recipient_email}</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Subject</label>
            {mode === 'edit' ? (
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors" />
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">{subject}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Message</label>
            {mode === 'edit' ? (
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={12}
                className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-vertical transition-colors" />
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap transition-colors">{message}</p>
            )}
          </div>
        </div>
        <div className="p-5 border-t border-slate-100 dark:border-slate-700/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Close</button>
          {mode === 'edit' && (
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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

  const typeMap = {};
  pendingComms.forEach(c => {
    const key = c.comm_type || "OTHER";
    if (!typeMap[key]) typeMap[key] = [];
    typeMap[key].push(c);
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6 transition-colors duration-300">
      {modal && (
        <EmailModal comm={modal.comm} mode={modal.mode} onClose={() => setModal(null)} onSave={load} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Emails Awaiting Approval</h3>
          {pendingComms.length > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full shadow-sm animate-pulse">
              {pendingComms.length}
            </span>
          )}
        </div>
        <button onClick={load} className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          Refresh List
        </button>
      </div>

      {pendingComms.length === 0 ? (
        <div className="text-center py-10 text-slate-400 dark:text-slate-500 transition-colors">
          <p className="text-sm font-medium">No emails pending approval.</p>
        </div>
      ) : (
        Object.entries(typeMap).map(([commType, comms]) => (
          <div key={commType} className="mb-5 border border-indigo-100 dark:border-indigo-800/30 rounded-xl overflow-hidden transition-colors duration-300 shadow-sm">
            <div className="bg-indigo-50/80 dark:bg-indigo-900/20 px-4 py-3 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/30 transition-colors">
              <div>
                <span className="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">{commType.replace(/_/g, ' ')}</span>
                <span className="text-xs font-medium text-indigo-600/70 dark:text-indigo-400/70 ml-3">{comms.length} pending draft(s)</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setLoadingId(`type-approve-${commType}`);
                    try {
                      await axios.post(`${API}/comms/approve-type/${commType}`);
                      showToast(`Approved and dispatched ${comms.length} emails.`);
                      load();
                    } catch (e) {
                      showToast(e.response?.data?.detail || 'Batch approval failed.', false);
                    } finally { setLoadingId(null); }
                  }}
                  disabled={loadingId === `type-approve-${commType}`}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30 rounded-lg transition-all disabled:opacity-50"
                >
                  Approve All
                </button>
                <button
                  onClick={async () => {
                    setLoadingId(`type-reject-${commType}`);
                    try {
                      await axios.post(`${API}/comms/reject-type/${commType}`);
                      showToast('Emails discarded.');
                      load();
                    } catch (e) {
                      showToast(e.response?.data?.detail || 'Batch rejection failed.', false);
                    } finally { setLoadingId(null); }
                  }}
                  disabled={loadingId === `type-reject-${commType}`}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/30 rounded-lg transition-all disabled:opacity-50"
                >
                  Discard All
                </button>
              </div>
            </div>

            <div className="divide-y divide-indigo-50 dark:divide-indigo-900/10 bg-white dark:bg-slate-800 transition-colors duration-300">
              {comms.map(c => (
                <div key={c.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{c.subject}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">To: <span className="font-medium text-slate-600 dark:text-slate-300">{c.recipient_email}</span></p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setModal({ comm: c, mode: 'view' })}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 transition-colors">
                      View
                    </button>
                    <button onClick={() => setModal({ comm: c, mode: 'edit' })}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => handleApprove(c.id, c.recipient_email)}
                      disabled={loadingId === `approve-${c.id}`}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-colors disabled:opacity-50">
                      Approve
                    </button>
                    <button onClick={() => handleReject(c.id)}
                      disabled={loadingId === `reject-${c.id}`}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 transition-colors disabled:opacity-50">
                      Discard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {toast && (
        <div className={`mt-5 px-4 py-3 rounded-xl text-sm font-bold border transition-colors duration-300 ${
          toast.ok ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-400 border-rose-200 dark:border-rose-800/50'
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
      alert(`Email dispatched successfully to ${preview.recipient_email} via SendGrid.`);
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
      alert('Draft saved.');
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
      <EmailInbox />
      <AnnouncementForm onSent={onDraftSaved} />

      <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/30 rounded-xl p-6 mb-6 transition-colors duration-300">
        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 mb-1">Stage Email Trigger</h3>
        <p className="text-sm font-medium text-indigo-700/70 dark:text-indigo-300/70 mb-5">Draft systemic stage emails for all participants (routes to approval queue).</p>
        <div className="flex gap-3 items-center flex-wrap">
          <select value={triggerStage} onChange={e => setTriggerStage(e.target.value)}
            className="px-3 py-2 border border-indigo-300 dark:border-indigo-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
            {STAGE_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={handleTriggerStage} disabled={isTriggering}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors shadow-sm">
            {isTriggering ? 'Drafting...' : 'Draft Emails for Approval'}
          </button>
        </div>
        {triggerResult && (
          <div className="mt-4 p-4 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/50 rounded-lg text-sm font-medium text-indigo-800 dark:text-indigo-300 transition-colors shadow-sm">
            {triggerResult.triggered
              ? `Status: ${triggerResult.evaluation_reminder_emails_drafted ?? triggerResult.results_emails_drafted ?? triggerResult.stage_emails_drafted ?? 0} email(s) successfully queued for committee approval.`
              : `Info: ${triggerResult.reason}`}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 transition-colors duration-300 shadow-sm">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">AI Smart Draft</h3>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-5">Preview an AI-drafted email before sending.</p>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <input type="email" placeholder="Recipient Email" value={email} onChange={e => setEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" />
          <select value={stage} onChange={e => setStage(e.target.value)}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
            <option value="TEAM_ASSIGNMENT">Team Assignment</option>
            <option value="EVALUATION_REMINDER">Evaluation Reminder</option>
          </select>
          {stage === 'TEAM_ASSIGNMENT' && (
            <input type="number" placeholder="Team ID" value={teamId} onChange={e => setTeamId(e.target.value)}
              className="w-full sm:w-32 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-transparent dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" />
          )}
          <button onClick={handleGenerateDraft} disabled={isGenerating}
            className="px-5 py-2 bg-slate-800 dark:bg-slate-100 hover:bg-slate-700 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap shadow-sm">
            {isGenerating ? 'Generating...' : 'Preview Draft'}
          </button>
        </div>

        {preview && (
          <div className="p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors duration-300">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Draft Preview</h4>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400"><strong className="text-slate-800 dark:text-slate-200">To:</strong> {preview.recipient_email}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400"><strong className="text-slate-800 dark:text-slate-200">Subject:</strong> {preview.subject}</p>
            </div>
            <div className="whitespace-pre-wrap bg-white dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 mb-5 transition-colors shadow-sm">
              {preview.message}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSendPreview} disabled={isSending}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors shadow-sm">
                {isSending ? 'Dispatching...' : 'Send via SendGrid'}
              </button>
              <button onClick={handleSavePreview}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 text-sm font-bold rounded-lg transition-colors shadow-sm">
                Save as Draft
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommsDraftForm;