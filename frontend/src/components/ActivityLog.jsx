import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActivityLog = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/activity')
      .then(res => setLogs(res.data))
      .catch(err => console.error('Error fetching activity:', err));
  }, [refreshTrigger]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-base font-bold text-gray-800 mb-4">System Activity Log</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">No activity logged yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {logs.map(log => (
            <li key={log.id} className="py-3 text-sm">
              <span className="font-semibold text-blue-700">[{log.action}]</span>
              <span className="ml-2 text-gray-700">{log.description}</span>
              <div className="text-xs text-gray-400 mt-1">
                {log.performed_by} · {new Date(log.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityLog;
