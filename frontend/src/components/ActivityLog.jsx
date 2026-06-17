import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWebSocket } from '../hooks/useWebSocket';

const ActivityLog = ({ refreshTrigger }) => {
  const [logs, setLogs] = useState([]);

  const fetchLogs = useCallback(() => {
    axios
      .get('http://localhost:8000/activity')
      .then((res) => setLogs(res.data))
      .catch((err) => console.error('Error fetching activity:', err));
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
    <div
      className="
        bg-white/80
        dark:bg-slate-900/80
        backdrop-blur-md
        border
        border-slate-200
        dark:border-slate-800
        rounded-2xl
        shadow-sm
        p-6
        flex
        flex-col
        
        /* FIX: Replaced h-full with a max-height. 
          This forces the container to stop growing at 600px, 
          which makes the 'overflow-y-auto' on the list actually work.
        */
        max-h-[600px] 
        overflow-hidden
      "
    >
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4">
        System Activity Log
      </h3>

      {logs.length === 0 ? (
        <div
          className="
            flex-1
            flex
            items-center
            justify-center
            rounded-xl
            bg-slate-50
            dark:bg-slate-800/50
            border
            border-dashed
            border-slate-200
            dark:border-slate-700
            p-6
          "
        >
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No activity logged yet.
          </p>
        </div>
      ) : (
        <ul
          className="
            flex-1
            overflow-y-auto
            pr-2
            divide-y
            divide-slate-200
            dark:divide-slate-800
            
            /* Optional: Custom scrollbar styling for a cleaner look */
            scrollbar-thin
            scrollbar-thumb-slate-300
            dark:scrollbar-thumb-slate-600
          "
        >
          {logs.map((log) => (
            <li
              key={log.id}
              className="
                py-4
                hover:bg-slate-50
                dark:hover:bg-slate-800/40
                rounded-xl
                transition-colors
                px-2
              "
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  [{log.action}]
                </span>

                {log.target_entity && (
                  <span
                    className="
                      rounded-full
                      px-3
                      py-1
                      text-xs
                      bg-slate-100
                      dark:bg-slate-800
                      text-slate-600
                      dark:text-slate-400
                      border
                      border-slate-200
                      dark:border-slate-700
                    "
                  >
                    Target: {log.target_entity}
                    {log.target_id ? ` #${log.target_id}` : ''}
                  </span>
                )}
              </div>

              <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 leading-relaxed">
                {log.description}
              </p>

              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>👤 {log.performed_by}</span>

                <span>•</span>

                <span>
                  🕒 {new Date(log.created_at).toLocaleString()}
                </span>

                {log.ip_address && (
                  <>
                    <span>•</span>
                    <span title="Source IP">
                      🌐 {log.ip_address}
                    </span>
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