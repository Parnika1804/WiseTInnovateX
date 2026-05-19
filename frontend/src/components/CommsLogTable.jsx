import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SendButton = ({ logId, onSent }) => {
  const handleSend = async () => {
    try {
      await axios.post('http://localhost:8000/comms/send', { log_id: logId });
      if (onSent) onSent();
    } catch (err) {
      console.error("Send error:", err);
    }
  };
  return (
    <button onClick={handleSend} style={{ backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>
      Send Now
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

  return (
    <div>
      <h3>Communications Log</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f9' }}>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>To</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Subject</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Status</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{log.recipient_email}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{log.subject}</td>
              <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '12px', backgroundColor: log.status === 'SENT' ? '#d4edda' : '#e2e3e5' }}>
                  {log.status}
                </span>
              </td>
              <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                {log.status === 'DRAFT' && <SendButton logId={log.id} onSent={fetchLogs} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CommsLogTable;