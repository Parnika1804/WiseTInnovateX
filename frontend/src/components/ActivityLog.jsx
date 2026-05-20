import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActivityLog = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/activity')
      .then(res => setLogs(res.data))
      .catch(err => console.error("Error fetching activity:", err));
  }, []);

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #eee' }}>
      <h3 style={{ marginTop: 0 }}>System Activity Log</h3>
      <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
        {logs.length === 0 ? <li>No activity logged yet.</li> : logs.map(log => (
          <li key={log.id} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0', fontSize: '14px' }}>
            <span style={{ fontWeight: 'bold', color: '#0056b3' }}>[{log.action}]</span> 
            <span style={{ marginLeft: '10px' }}>{log.description}</span>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              By: {log.performed_by} | {new Date(log.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ActivityLog;