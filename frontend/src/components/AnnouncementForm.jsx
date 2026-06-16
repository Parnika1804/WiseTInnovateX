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
  <div
    className="
      bg-white
      rounded-3xl
      border border-slate-200
      shadow-sm
      p-6
    "
  >
<h3 className="text-lg font-bold text-slate-900">
  Quick Announcement
</h3>
      <p className="text-sm text-slate-500 mt-1 mb-6">
  Share important updates instantly with participants.
</p>

      <div className="space-y-4">
        {/* Announcement text */}
        <textarea
          placeholder='e.g. "Venue changed to Room 201 in Block B" or "Round 2 starts tomorrow at 10 AM"'
          value={announcement}
          onChange={e => setAnnouncement(e.target.value)}
          rows={3}
          className="
w-full
rounded-2xl
border border-slate-200
bg-slate-50
px-4 py-3
text-sm
focus:border-blue-500
focus:ring-2
focus:ring-blue-100
outline-none
transition-all
resize-none
"
        />

        {/* Optional subject override */}
        <input
          type="text"
          placeholder="Custom subject line (optional — AI will generate one if blank)"
          value={customSubject}
          onChange={e => setCustomSubject(e.target.value)}
          className="
w-full
rounded-2xl
border border-slate-200
bg-slate-50
px-4 py-3
text-sm
focus:border-blue-500
focus:ring-2
focus:ring-blue-100
outline-none
transition-all
"
        />

        {/* Recipients selector */}
        <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4">
          <label className="font-semibold text-sm text-slate-700">Send to:</label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio" value="all"
              checked={sendTo === 'all'}
              onChange={() => setSendTo('all')}
            />
            <span className="text-sm text-slate-600">All Participants</span>
          </label>

          {approvedTeams.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="radio" value="team"
                checked={sendTo.startsWith('team:')}
                onChange={() => setSendTo(`team:${approvedTeams[0]?.id || ''}`)}
              />
              <span className="text-sm text-slate-600">Specific Team:</span>
              <select
                value={sendTo.startsWith('team:') ? sendTo : ''}
                onChange={e => setSendTo(e.target.value)}
                disabled={!sendTo.startsWith('team:')}
                className="
rounded-xl
border border-slate-200
bg-white
px-3 py-2
text-sm
focus:border-blue-500
outline-none
"
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
          className={`
  px-6 py-3
  rounded-2xl
  font-semibold
  text-white
  transition-all
  duration-300
  hover:-translate-y-0.5
  hover:shadow-lg
  ${
    isSending || !announcement.trim()
      ? 'bg-slate-300 cursor-not-allowed'
      : 'bg-gradient-to-r from-blue-600 to-indigo-600'
  }
`}
        >
          {isSending ? '✉️ Sending...' : '📤 Draft & Send Now'}
        </button>
      </div>

      {/* Success result */}
      {result && (
        <div className="
  mt-5
  rounded-2xl
  border border-green-200
  bg-green-50
  p-4
">
          <p className="font-semibold text-green-700">
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
        <div className="
  mt-5
  rounded-2xl
  border border-red-200
  bg-red-50
  p-4
  text-sm
  text-red-700
">
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default AnnouncementForm;
