import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'http://localhost:8000';

const CommsLogTable = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);

  // WebSocket Live Refresh
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
    if (!type) return '—';
    if (type.includes('WELCOME')) return '👋 Welcome';
    if (type.includes('TEAM_ASSIGN')) return '👥 Team Assignment';
    if (type.includes('EVAL')) return '⏱️ Eval Reminder';
    if (type.includes('ANNOUNCEMENT')) return '📢 Announcement';
    if (type.includes('RESULT')) return '🏆 Results';
    if (type.startsWith('STAGE_')) return `⚡ ${type.replace('STAGE_', '')}`;
    return type;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SENT':
        return <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">✅ Sent</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-200">⏳ Awaiting Approval</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 bg-red-50 text-red-500 rounded-full text-xs font-medium">❌ Rejected</span>;
      case 'DRAFT':
        return <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">📝 Draft</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="mt-6">
      {/* ── Status Header ── */}
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-gray-800">Communication History</h3>
        {wsStatus === 'open' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            LIVE
          </span>
        )}
      </div>

      {/* ── Main log table ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-sm">
                <th className="p-4 font-semibold text-gray-700">To</th>
                <th className="p-4 font-semibold text-gray-700">Subject</th>
                <th className="p-4 font-semibold text-gray-700">Type</th>
                <th className="p-4 font-semibold text-gray-700">Status</th>
                <th className="p-4 font-semibold text-gray-700 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">No communication logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm ${
                      log.status === 'PENDING_APPROVAL' ? 'bg-amber-50/40' : ''
                    }`}>
                    <td className="p-4 text-gray-800">{log.recipient_email}</td>
                    <td className="p-4 text-gray-600 truncate max-w-xs" title={log.subject}>{log.subject}</td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {getTypeBadge(log.comm_type)}
                      </span>
                    </td>
                    <td className="p-4">{getStatusBadge(log.status)}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Only the delete button remains here */}
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors text-xs"
                        >
                          🗑️
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