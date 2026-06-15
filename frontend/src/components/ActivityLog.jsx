import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const ActivityLog = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);

  const fetchLogs = useCallback(() => {
    axios.get('http://localhost:8000/activity')
      .then(res => setLogs(res.data))
      .catch(err => console.error('Error fetching activity:', err));
  }, []);

  // WebSocket Live Refresh
  useWebSocket('dashboard', (data) => {
    if (data.event === 'dashboard_updated') {
      fetchLogs();
    }
  });

  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger, fetchLogs]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-base font-bold text-gray-800 mb-4">System Activity Log</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">No activity logged yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto pr-2">
          {logs.map(log => (
            <li key={log.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-blue-700">[{log.action}]</span>
                
                {log.target_entity && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full border border-gray-200">
                    Target: {log.target_entity} {log.target_id ? `#${log.target_id}` : ''}
                  </span>
                )}
              </div>
              
              <span className="text-gray-700 block mb-1">{log.description}</span>
              
              <div className="text-xs text-gray-400 flex flex-wrap items-center gap-2">
                <span>👤 {log.performed_by}</span>
                <span>•</span>
                <span>🕒 {new Date(log.created_at).toLocaleString()}</span>
                
                {log.ip_address && (
                  <>
                    <span>•</span>
                    <span title="Source IP">🌐 {log.ip_address}</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityLog;