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
    <div className="mb-8 p-5 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Broadcast Announcement</h3>
      
      {error && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Error: {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div>
          <label className="block mb-1.5 text-sm font-bold text-slate-600">Send To:</label>
          <select 
            value={sendTo} 
            onChange={(e) => setSendTo(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Participants (Approved Teams Only)</option>
            {teams.filter(t => t.status === 'APPROVED').map(t => (
              <option key={t.id} value={`team_${t.id}`}>Team: {t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-bold text-slate-600">Custom Subject (Optional):</label>
          <input 
            type="text" 
            value={customSubject} 
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="e.g., URGENT: Submission Deadline Extended"
            className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1.5 text-xs text-slate-500">If left blank, defaults to "Important Hackathon Announcement".</p>
        </div>

        <div>
          <label className="block mb-1.5 text-sm font-bold text-slate-600">Message:</label>
          <textarea 
            value={announcement} 
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder="Type your message here..."
            rows={4}
            className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        <button 
          onClick={handleSend} 
          disabled={isSending}
          className={`w-full sm:w-auto px-6 py-3 rounded-lg font-bold text-sm text-white transition-colors self-start ${
            isSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
          }`}
        >
          {isSending ? 'Sending...' : 'Draft & Send Now'}
        </button>
      </div>

      {result && (
        <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="mb-2 font-bold text-green-800 text-sm">
            Success: Announcement sent ({result.sent} delivered{result.failed > 0 ? `, ${result.failed} failed` : ''})
          </p>
          <p className="mb-1 text-sm text-slate-700">
            <strong>Subject:</strong> {result.subject}
          </p>
          <p className="text-xs text-slate-500 italic">
            {result.body_preview}
          </p>
        </div>
      )}
    </div>
  );
};

export default AnnouncementForm;