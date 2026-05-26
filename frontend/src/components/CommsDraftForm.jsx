import React, { useState } from 'react';
import axios from 'axios';

const CommsDraftForm = ({ onDraftSaved }) => {
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState('TEAM_ASSIGNMENT');
  const [teamId, setTeamId] = useState('');
  const [preview, setPreview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Calls the new Gemini Draft Endpoint
  const handleGenerateDraft = async () => {
    if (!email) return alert("Please enter a recipient email.");
    if (stage === 'TEAM_ASSIGNMENT' && !teamId) return alert("Team ID is required for Team Assignment emails.");

    setIsGenerating(true);
    try {
      const payload = { stage, recipient_email: email, team_id: teamId ? parseInt(teamId) : null };
      const res = await axios.post('http://localhost:8000/comms/draft/gemini', payload);
      setPreview(res.data.preview);
    } catch (err) {
      console.error("Draft error:", err);
      alert(err.response?.data?.detail || "Failed to generate draft.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Saves the previewed draft to the log table
  const handleSavePreview = async () => {
    try {
      // Create a manual draft entry using the preview data
      const payload = {
        recipient_email: preview.recipient_email,
        subject: preview.subject,
        message: preview.message,
        stage: stage
      };
      await axios.post('http://localhost:8000/comms/draft', payload);
      
      alert("Draft saved to the log and ready to send!");
      setPreview(null);
      setEmail(''); 
      setTeamId('');
      if (onDraftSaved) onDraftSaved();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save draft to the log.");
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px', backgroundColor: '#fff' }}>
      <h3>✨ Auto-Draft Communication with Gemini</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
        <input type="email" placeholder="Recipient Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ padding: '8px' }} />
        <select value={stage} onChange={e => setStage(e.target.value)} style={{ padding: '8px' }}>
          <option value="TEAM_ASSIGNMENT">Team Assignment</option>
          <option value="EVALUATION_REMINDER">Evaluation Reminder</option>
        </select>
        {stage === 'TEAM_ASSIGNMENT' && (
          <input type="number" placeholder="Team ID (e.g., 1)" value={teamId} onChange={e => setTeamId(e.target.value)} style={{ padding: '8px' }} />
        )}
        <button onClick={handleGenerateDraft} disabled={isGenerating} style={{ backgroundColor: '#6f42c1', color: 'white', padding: '10px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          {isGenerating ? 'Generating...' : 'Generate Preview'}
        </button>
      </div>

      {preview && (
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', border: '1px solid #ddd', borderRadius: '5px' }}>
          <h4>Draft Preview</h4>
          <p><strong>To:</strong> {preview.recipient_email}</p>
          <p><strong>Subject:</strong> {preview.subject}</p>
          <div style={{ whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '10px', border: '1px solid #eee' }}>{preview.message}</div>
          <button onClick={handleSavePreview} style={{ marginTop: '10px', backgroundColor: '#28a745', color: 'white', padding: '8px 12px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
            Looks Good, Save Draft
          </button>
        </div>
      )}
    </div>
  );
};

export default CommsDraftForm;