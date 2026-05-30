import React, { useState } from 'react';
import axios from 'axios';
import AnnouncementForm from './AnnouncementForm';

const API = 'http://localhost:8000';

// Stage names from the dynamic pipeline
const STAGE_OPTIONS = [
  { value: 'EVALUATION', label: 'Evaluation Reminder' },
  { value: 'RESULTS', label: 'Results / Final Outcomes' },
];

const CommsDraftForm = ({ onDraftSaved }) => {
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('TEAM_ASSIGNMENT');
  const [teamId, setTeamId] = useState('');
  const [preview, setPreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Stage trigger
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
      console.error('Draft error:', err);
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
      setPreview(null);
      setEmail('');
      setTeamId('');
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      console.error('Send error:', err);
      alert(err.response?.data?.detail || 'Failed to send.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSavePreview = async () => {
    try {
      const payload = {
        recipient_email: preview.recipient_email,
        subject: preview.subject,
        message: preview.message,
      };
      await axios.post(`${API}/comms/draft`, payload);
      alert('Draft saved to the log and ready to send!');
      setPreview(null);
      setEmail('');
      setTeamId('');
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save draft to the log.');
    }
  };

  const handleTriggerStage = async () => {
    if (!window.confirm(`This will draft ${triggerStage} emails for all relevant participants and queue them for your approval. Continue?`)) return;
    setIsTriggering(true);
    setTriggerResult(null);
    try {
      const res = await axios.post(`${API}/comms/trigger-stage?stage=${triggerStage}`);
      setTriggerResult(res.data);
      if (onDraftSaved) onDraftSaved(); // refresh the log table to show pending items
    } catch (err) {
      alert(err.response?.data?.detail || 'Stage trigger failed.');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div>
      {/* ── Section 1: Announcement ── */}
      <AnnouncementForm onSent={onDraftSaved} />

      {/* ── Section 2: Stage Bulk Trigger ── */}
      <div style={{
        padding: '18px',
        border: '1px solid #4a90d9',
        borderRadius: '10px',
        backgroundColor: '#f0f7ff',
        marginBottom: '20px',
      }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#1a5fa8' }}>⚡ Stage Email Trigger</h3>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#555' }}>
          Draft stage emails for all participants — emails go to <strong>Awaiting Approval</strong> queue. Review them in the log below before they're sent.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={triggerStage}
            onChange={e => setTriggerStage(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #90c2f0', fontSize: '13px' }}
          >
            {STAGE_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={handleTriggerStage}
            disabled={isTriggering}
            style={{
              backgroundColor: isTriggering ? '#aaa' : '#2b6cb0',
              color: 'white', padding: '9px 16px',
              border: 'none', borderRadius: '6px',
              cursor: isTriggering ? 'not-allowed' : 'pointer',
              fontWeight: '600', fontSize: '13px',
            }}
          >
            {isTriggering ? 'Drafting...' : '📝 Draft Emails for Approval'}
          </button>
        </div>

        {triggerResult && (
          <div style={{
            marginTop: '12px', padding: '10px',
            backgroundColor: triggerResult.triggered ? '#fffbeb' : '#e6ffed',
            border: `1px solid ${triggerResult.triggered ? '#f6c23e' : '#68d391'}`,
            borderRadius: '6px', fontSize: '13px',
          }}>
            {triggerResult.triggered
              ? `⏳ ${triggerResult.evaluation_reminder_emails_drafted ?? triggerResult.results_emails_drafted ?? triggerResult.stage_emails_drafted ?? 0} email(s) queued for your approval — scroll down to the log and approve the batch.`
              : `ℹ️ ${triggerResult.reason}`}
          </div>
        )}
      </div>

      {/* ── Section 3: Manual Gemini Draft ── */}
      <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
        <h3 style={{ margin: '0 0 4px 0' }}>✨ Auto-Draft Communication with Gemini</h3>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#666' }}>
          Preview an AI-drafted email before sending it via SendGrid.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
          <input
            type="email" placeholder="Recipient Email"
            value={email} onChange={e => setEmail(e.target.value)}
            required style={{ padding: '8px' }}
          />
          <select value={stage} onChange={e => setStage(e.target.value)} style={{ padding: '8px' }}>
            <option value="TEAM_ASSIGNMENT">Team Assignment</option>
            <option value="EVALUATION_REMINDER">Evaluation Reminder</option>
          </select>
          {stage === 'TEAM_ASSIGNMENT' && (
            <input
              type="number" placeholder="Team ID (e.g., 1)"
              value={teamId} onChange={e => setTeamId(e.target.value)}
              style={{ padding: '8px' }}
            />
          )}
          <button
            onClick={handleGenerateDraft} disabled={isGenerating}
            style={{ backgroundColor: '#6f42c1', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
          >
            {isGenerating ? 'Generating...' : 'Generate Preview'}
          </button>
        </div>

        {preview && (
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Draft Preview</h4>
            <p><strong>To:</strong> {preview.recipient_email}</p>
            <p><strong>Subject:</strong> {preview.subject}</p>
            <div style={{ whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '10px', border: '1px solid #eee', borderRadius: '4px', fontSize: '13px' }}>
              {preview.message}
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={handleSendPreview}
                disabled={isSending}
                style={{ backgroundColor: '#007bff', color: 'white', padding: '8px 14px', border: 'none', cursor: 'pointer', borderRadius: '4px', fontWeight: '600' }}
              >
                {isSending ? 'Sending...' : '✉️ Send via SendGrid'}
              </button>
              <button
                onClick={handleSavePreview}
                style={{ backgroundColor: '#28a745', color: 'white', padding: '8px 14px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
              >
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
