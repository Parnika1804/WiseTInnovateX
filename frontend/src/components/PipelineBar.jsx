import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const API = 'https://wisetinnovatex-r4vx.onrender.com';

// Call this from any committee action component to refresh the pipeline instantly
export const refreshPipeline = () => {
  window.dispatchEvent(new Event('pipeline:refresh'));
};

const PipelineBar = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    axios.get(`${API}/pipeline/dynamic/status`)
      .then(res => {
        if (res.data.status === 'not_configured') {
          setError(res.data.message);
        } else {
          setError('');
          setData(res.data);
          
          // Trigger Toast if stage advancing drafts emails
          if (res.data.stage_emails_drafted) {
             notifyEmailDraft(res.data.stage_emails_drafted);
          }
        }
      })
      .catch(() => setError('Could not load pipeline status.'));
  }, []);

  useEffect(() => {
    load();
    // Refresh pipeline whenever any committee action fires the event
    window.addEventListener('pipeline:refresh', load);
    return () => window.removeEventListener('pipeline:refresh', load);
  }, [load]);

  if (error) return (
    <div className="w-full p-8 bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-gray-500 dark:text-slate-400 mb-6 transition-colors duration-300">
      <p className="font-medium text-gray-600 dark:text-slate-300">{error}</p>
      <p className="text-sm">Please go to the "Setup Event" tab to configure your pipeline.</p>
    </div>
  );

  if (!data) return <div className="p-4 text-gray-500 dark:text-slate-400">Loading pipeline...</div>;

  const completedCount = data.stages?.filter(s => s.status === 'COMPLETED').length || 0;
  const progressPct = data.total_stages > 1
    ? Math.round((completedCount / (data.total_stages - 1)) * 100)
    : data.is_final_stage ? 100 : 0;

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 transition-colors duration-300">
            Event Pipeline: <span className="text-blue-600 dark:text-blue-400">{data.event_name}</span>
          </h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5 transition-colors duration-300">
            Stage {(data.current_stage_index ?? 0) + 1} of {data.total_stages}
            {data.is_final_stage && (
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">· Event complete</span>
            )}
          </p>
        </div>
        {/* Manual refresh button */}
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full mb-5 overflow-hidden transition-colors duration-300">
        <div
          className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stage pills */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {data.stages?.map((stage) => (
          <div
            key={stage.order}
            title={stage.description}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 ${
              stage.status === 'ACTIVE'
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                : stage.status === 'COMPLETED'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50'
                : 'bg-gray-100 dark:bg-slate-800/80 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700'
            }`}
          >
            {stage.status === 'COMPLETED' && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {stage.order}. {stage.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineBar;