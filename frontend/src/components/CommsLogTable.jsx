import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CommsLogTable = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger]);

  const fetchLogs = async () => {
    try {
      const response = await axios.get('http://localhost:8000/comms/log');
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    }
  };

  // --- THE DELETE FUNCTION ---
  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Are you sure you want to delete this communication log?")) return;
    
    try {
      await axios.delete(`http://localhost:8000/comms/log/${logId}`);
      // Remove the deleted log from the screen instantly
      setLogs(logs.filter(log => log.id !== logId)); 
    } catch (error) {
      console.error("Failed to delete log", error);
      alert("Failed to delete log. Check backend console.");
    }
  };

  // Helper to format the pill badges nicely
  const getTypeBadge = (type) => {
    if (type.includes('WELCOME')) return '👋 Welcome';
    if (type.includes('TEAM_ASSIGN')) return '👥 Team Assignment';
    if (type.includes('EVAL')) return '⏱️ Eval Reminder';
    if (type.includes('ANNOUNCEMENT')) return '📢 Announcement';
    if (type.includes('RESULT')) return '🏆 Results';
    return type;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-sm">
              <th className="p-4 font-semibold text-gray-700">To</th>
              <th className="p-4 font-semibold text-gray-700">Subject</th>
              <th className="p-4 font-semibold text-gray-700">Type</th>
              <th className="p-4 font-semibold text-gray-700">Status</th>
              <th className="p-4 font-semibold text-gray-700 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500">No communication logs found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm">
                  <td className="p-4 text-gray-800">{log.recipient_email}</td>
                  <td className="p-4 text-gray-600 truncate max-w-md" title={log.subject}>{log.subject}</td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      {getTypeBadge(log.comm_type)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                      {log.status}
                    </span>
                  </td>
                  
                  {/* --- THE DELETE BUTTON --- */}
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDeleteLog(log.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded-md transition-colors text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                  
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CommsLogTable;