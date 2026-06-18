import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const API = 'http://localhost:8000';

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
      case 'SENT': return <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200">Sent</span>;
      case 'FAILED': return <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200">Failed</span>;
      case 'PENDING_APPROVAL': return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200">Pending Approval</span>;
      default: return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold border border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-800 m-0">Communication Logs</h3>
          {wsStatus === 'open' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live Tracking
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          Total Logs: {logs.length}
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
              <tr>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">Recipient</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">Subject</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">Type</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200">Status</th>
                <th className="p-4 font-bold text-xs uppercase tracking-wider text-gray-500 border-b border-gray-200 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-400 font-medium bg-white">No communications logged yet.</td>
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
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors text-xs font-semibold"
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