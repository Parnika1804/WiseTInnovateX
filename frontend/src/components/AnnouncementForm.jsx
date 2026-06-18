import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000';

const AnnouncementForm = ({ onSent }) => {
  const [announcement, setAnnouncement] = useState('');
  const [sendTo, setSendTo] = useState('all');
  const [teams, setTeams] = useState([]);
  const [customSubject, setCustomSubject] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API}/teams`).then(res => setTeams(res.data)).catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!announcement.trim()) return alert('Please type an announcement.');
    setIsSending(true);
    setResult(null);
    setError(null);
    try {
      const payload = {
        announcement: announcement.trim(),
        send_to: sendTo,
        custom_subject: customSubject.trim() || null,
      };
      const res = await axios.post(`${API}/comms/announce`, payload);
      setResult(res.data);
      setAnnouncement('');
      setCustomSubject('');
      setSendTo('all');
      if (onSent) onSent();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send announcement.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#333' }}>Broadcast Announcement</h3>
      
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fff5f5', border: '1px solid #fc8181', borderRadius: '6px', color: '#c53030', marginBottom: '15px', fontSize: '14px' }}>
          Error: {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Send To:</label>
          <select 
            value={sendTo} 
            onChange={(e) => setSendTo(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="all">All Participants (Approved Teams Only)</option>
            {teams.filter(t => t.status === 'APPROVED').map(t => (
              <option key={t.id} value={`team_${t.id}`}>Team: {t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Custom Subject (Optional):</label>
          <input 
            type="text" 
            value={customSubject} 
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="e.g., URGENT: Submission Deadline Extended"
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888' }}>If left blank, defaults to "Important Hackathon Announcement".</p>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Message:</label>
          <textarea 
            value={announcement} 
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Type your message here..."
            rows={4}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', resize: 'vertical' }}
          />
        </div>

        <button 
          onClick={handleSend} 
          disabled={isSending}
          style={{ 
            backgroundColor: isSending ? '#aaa' : '#fd7e14', 
            color: 'white', padding: '10px 16px', 
            border: 'none', borderRadius: '6px', 
            cursor: isSending ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '14px', alignSelf: 'flex-start',
          }}
        >
          {isSending ? 'Sending...' : 'Draft & Send Now'}
        </button>
      </div>

      {result && (
        <div style={{ 
          marginTop: '14px', padding: '12px', 
          backgroundColor: '#f0fff4', border: '1px solid #68d391', 
          borderRadius: '6px',
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#276749' }}>
            Success: Announcement sent ({result.sent} delivered{result.failed > 0 ? `, ${result.failed} failed` : ''})
          </p>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
            <strong>Subject:</strong> {result.subject}
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
            {result.body_preview}
          </p>
        </div>
      )}
    </div>
  );
};

export default AnnouncementForm;