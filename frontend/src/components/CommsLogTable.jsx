import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TYPE_LABELS = {
  WELCOME: { label: '👋 Welcome', color: '#d1ecf1' },
  TEAM_ASSIGNMENT: { label: '👥 Team Assignment', color: '#d4edda' },
  EVALUATION_REMINDER: { label: '⏰ Eval Reminder', color: '#fff3cd' },
  RESULTS_QUALIFIED: { label: '🏆 Results – Qualified', color: '#d4edda' },
  RESULTS_NOT_QUALIFIED: { label: '📋 Results – Thanks', color: '#f8f9fa' },
  ANNOUNCEMENT: { label: '📢 Announcement', color: '#fde8d8' },
  MANUAL: { label: '✏️ Manual', color: '#e9ecef' },
};

const SendButton = ({ logId, onSent }) => {
  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    setSending(true);
    try {
      await axios.post('http://localhost:8000/comms/send', { log_id: logId });
      if (onSent) onSent();
    } catch (err) {
      console.error('Send error:', err);
      alert(err.response?.data?.detail || 'Send failed');
    } finally {
      setSending(false);
    }
  };
  return (
    <button
      onClick={handleSend} disabled={sending}
      style={{ backgroundColor: sending ? '#aaa' : '#17a2b8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}
    >
      {sending ? 'Sending...' : '✉️ Send via SendGrid'}
    </button>
  );
};

const CommsLogTable = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);

  const fetchLogs = async () => {
    const res = await axios.get('http://localhost:8000/comms/log');
    setLogs(res.data);
  };

  useEffect(() => { fetchLogs(); }, [refreshTrigger]);

  const typeInfo = (type) => TYPE_LABELS[type] || { label: type || 'AUTO', color: '#e9ecef' };

  return (
    <div>
      <h3>Communications Log</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f9' }}>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>To</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Subject</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Type</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Status</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => {
            const ti = typeInfo(log.comm_type);
            return (
              <tr key={log.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{log.recipient_email}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{log.subject}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', backgroundColor: ti.color }}>{ti.label}</span>
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '11px', backgroundColor: log.status === 'SENT' ? '#d4edda' : log.status === 'FAILED' ? '#f8d7da' : '#e2e3e5' }}>
                    {log.status}
                  </span>
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                  {log.status === 'DRAFT' && <SendButton logId={log.id} onSent={fetchLogs} />}
                </td>
              </tr>
            );
          })}
          {logs.length === 0 && (
            <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No emails yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CommsLogTable;