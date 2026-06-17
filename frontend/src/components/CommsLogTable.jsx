import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'http://localhost:8000';

const CommsLogTable = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);

  const wsStatus = useWebSocket('comms', (data) => {
    if (data.event === 'comms_updated') fetchLogs();
  });

  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get(`${API}/comms/log`);
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this communication log?')) return;
    try {
      await axios.delete(`${API}/comms/log/${logId}`);
      setLogs(logs.filter(log => log.id !== logId));
    } catch (error) {
      console.error('Failed to delete log', error);
      alert('Failed to delete log. Check backend console.');
    }
  };

  // Helper functions remain the same...
  const getTypeBadge = (type) => {
    if (!type) return '—';
    if (type.includes('WELCOME')) return ' Welcome';
    if (type.includes('TEAM_ASSIGN')) return ' Team Assignment';
    if (type.includes('EVAL')) return ' Eval Reminder';
    if (type.includes('ANNOUNCEMENT')) return ' Announcement';
    if (type.includes('RESULT')) return ' Results';
    if (type.startsWith('STAGE_')) return `⚡ ${type.replace('STAGE_', '')}`;
    return type;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SENT': return <span className="px-2 py-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-full text-xs font-medium whitespace-nowrap">✅ Sent</span>;
      case 'PENDING_APPROVAL': return <span className="px-2 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-200 dark:border-amber-800 whitespace-nowrap"> Awaiting</span>;
      default: return <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium whitespace-nowrap">{status}</span>;
    }
  };

  // Grid template: Recipient (2fr), Subject (3fr), Type (1fr), Status (1fr), Actions (auto)
  const gridCols = "grid-cols-[1fr_2fr_auto_auto_auto] md:grid-cols-[200px_1fr_120px_100px_60px]";

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Communication History</h3>
        {wsStatus === 'open' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 animate-pulse"></span>
            LIVE
          </span>
        )}
      </div>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className={`grid ${gridCols} gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-bold uppercase tracking-wider text-slate-500`}>
          <div className="hidden md:block">To</div>
          <div className="hidden md:block">Subject</div>
          <div className="hidden md:block">Type</div>
          <div className="hidden md:block">Status</div>
          <div className="text-center">Actions</div>
        </div>

        {/* Rows */}
        <div className="max-h-[400px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No logs found.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={`grid ${gridCols} gap-4 p-4 items-center border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
                <div className="text-sm text-slate-800 dark:text-slate-200 truncate">{log.recipient_email}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400 truncate">{log.subject}</div>
                <div className="hidden md:block text-xs font-medium text-blue-600">{getTypeBadge(log.comm_type)}</div>
                <div className="hidden md:block">{getStatusBadge(log.status)}</div>
                <div className="text-center">
                  <button onClick={() => handleDeleteLog(log.id)} className="text-slate-400 hover:text-red-500">🗑️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommsLogTable;