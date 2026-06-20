import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'https://wisetinnovatex-r4vx.onrender.com';

const CommsLogTable = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);

  const wsStatus = useWebSocket('comms', (data) => {
    if (data.event === 'comms_updated') {
      fetchLogs();
    }
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

  const getTypeBadge = (type) => {
    if (!type) return 'System';
    return type.replace(/_/g, ' ');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SENT': return <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-bold border border-green-200 dark:border-green-800/50 transition-colors duration-300">Sent</span>;
      case 'FAILED': return <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-full text-xs font-bold border border-red-200 dark:border-red-800/50 transition-colors duration-300">Failed</span>;
      case 'PENDING_APPROVAL': return <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800/50 transition-colors duration-300">Pending Approval</span>;
      default: return <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors duration-300">{status}</span>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-300">
      <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 m-0 transition-colors duration-300">Communication Logs</h3>
          {wsStatus === 'open' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 transition-colors duration-300">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live Tracking
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-3 py-1 rounded-full transition-colors duration-300">
          Total Logs: {logs.length}
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/90 backdrop-blur-sm z-10 shadow-sm transition-colors duration-300">
              <tr>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">Recipient</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">Subject</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">Type</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">Status</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 text-center transition-colors duration-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium bg-white dark:bg-slate-800 transition-colors duration-300">No communications logged yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} 
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm ${
                      log.status === 'PENDING_APPROVAL' ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''
                    }`}>
                    <td className="p-4 text-slate-800 dark:text-slate-200 transition-colors duration-300">{log.recipient_email}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 truncate max-w-xs transition-colors duration-300" title={log.subject}>{log.subject}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-transparent dark:border-blue-800/50 rounded-full text-xs font-medium transition-colors duration-300">
                        {getTypeBadge(log.comm_type)}
                      </span>
                    </td>
                    <td className="p-4">{getStatusBadge(log.status)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded-md transition-colors text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CommsLogTable;