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

  const approvedTeams = teams.filter(t => t.status === 'APPROVED');

  return (
    <div style={{
      padding: '20px',
      border: '2px solid #fd7e14',
      borderRadius: '10px',
      backgroundColor: '#fff9f5',
      marginBottom: '20px',
    }}>
      <h3 style={{ margin: '0 0 4px 0', color: '#c05621' }}>📢 Send Announcement</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#666' }}>
        Type a short update — AI will draft the full email and send it instantly.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Announcement text */}
        <textarea
          placeholder='e.g. "Venue changed to Room 201 in Block B" or "Round 2 starts tomorrow at 10 AM"'
          value={announcement}
          onChange={e => setAnnouncement(e.target.value)}
          rows={3}
          style={{
            padding: '10px', borderRadius: '6px',
            border: '1px solid #f0a070', fontSize: '14px',
            resize: 'vertical', fontFamily: 'inherit',
          }}
        />

        {/* Optional subject override */}
        <input
          type="text"
          placeholder="Custom subject line (optional — AI will generate one if blank)"
          value={customSubject}
          onChange={e => setCustomSubject(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #f0a070', fontSize: '13px' }}
        />

        {/* Recipients selector */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '600', fontSize: '13px', color: '#555' }}>Send to:</label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <input
              type="radio" value="all"
              checked={sendTo === 'all'}
              onChange={() => setSendTo('all')}
            />
            <span style={{ fontSize: '13px' }}>All Participants</span>
          </label>

          {approvedTeams.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="radio" value="team"
                checked={sendTo.startsWith('team:')}
                onChange={() => setSendTo(`team:${approvedTeams[0]?.id || ''}`)}
              />
              <span style={{ fontSize: '13px' }}>Specific Team:</span>
              <select
                value={sendTo.startsWith('team:') ? sendTo : ''}
                onChange={e => setSendTo(e.target.value)}
                disabled={!sendTo.startsWith('team:')}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
              >
                {approvedTeams.map(t => (
                  <option key={t.id} value={`team:${t.id}`}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={isSending || !announcement.trim()}
          style={{
            backgroundColor: isSending ? '#aaa' : '#fd7e14',
            color: 'white', padding: '10px 16px',
            border: 'none', borderRadius: '6px',
            cursor: isSending ? 'not-allowed' : 'pointer',
            fontWeight: '600', fontSize: '14px', alignSelf: 'flex-start',
          }}
        >
          {isSending ? '✉️ Sending...' : '📤 Draft & Send Now'}
        </button>
      </div>

      {/* Success result */}
      {result && (
        <div style={{
          marginTop: '14px', padding: '12px',
          backgroundColor: '#f0fff4', border: '1px solid #68d391',
          borderRadius: '6px',
        }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#276749' }}>
            ✅ Announcement sent! ({result.sent} delivered{result.failed > 0 ? `, ${result.failed} failed` : ''})
          </p>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px' }}>
            <strong>Subject:</strong> {result.subject}
          </p>
          <p style={{ margin: '0', fontSize: '12px', color: '#555', fontStyle: 'italic' }}>
            {result.body_preview}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          marginTop: '14px', padding: '10px',
          backgroundColor: '#fff5f5', border: '1px solid #fc8181',
          borderRadius: '6px', color: '#c53030', fontSize: '13px',
        }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default AnnouncementForm;
