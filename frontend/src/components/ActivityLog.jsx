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
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full overflow-hidden">
            <h3 className="text-base font-bold text-gray-800 mb-4">System Activity Log</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">No activity logged yet.</p>
      ) : (
<ul className="divide-y divide-slate-100 flex-1 overflow-y-auto pr-2">
              {logs.map(log => (
            <li key={log.id} className="relative pl-8 pb-6">
              <>
  <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>

  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all duration-300 hover:bg-white hover:shadow-md">

    <div className="flex items-center justify-between gap-4">

      <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
        {log.action}
      </span>

      <span className="text-xs text-slate-400">
        {new Date(log.created_at).toLocaleString()}
      </span>

    </div>

    <p className="mt-3 text-sm text-slate-700 leading-relaxed">
      {log.description}
    </p>

    <div className="mt-4 flex flex-wrap gap-2">

      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 border border-slate-200">
        👤 {log.performed_by}
      </span>

      {log.target_entity && (
        <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500 border border-slate-200">
          🎯 {log.target_entity}
        </span>
      )}

    </div>

  </div>
</>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ActivityLog;