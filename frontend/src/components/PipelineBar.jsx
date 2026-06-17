import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { notifyEmailDraft } from '../hooks/useEmailDraftNotifier';

const API = 'http://localhost:8000';

// Call this from any committee action component to refresh the pipeline instantly
export const refreshPipeline = () => {
  window.dispatchEvent(new Event('pipeline:refresh'));
};

const PipelineBar = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    axios
      .get(`${API}/pipeline/dynamic/status`)
      .then((res) => {
        if (res.data.status === 'not_configured') {
          setError(res.data.message);
        } else {
          setError('');
          setData(res.data);

          if (res.data.stage_emails_drafted) {
            notifyEmailDraft(res.data.stage_emails_drafted);
          }
        }
      })
      .catch(() => setError('Could not load pipeline status.'));
  }, []);

  useEffect(() => {
    load();

    window.addEventListener('pipeline:refresh', load);

    return () =>
      window.removeEventListener('pipeline:refresh', load);
  }, [load]);

  if (error)
    return (
      <div
        className="
          w-full

          p-8

          bg-slate-50
          dark:bg-slate-900/50

          border-2
          border-dashed

          border-slate-300
          dark:border-slate-700

          rounded-2xl

          flex
          flex-col
          items-center
          justify-center

          text-slate-500
          dark:text-slate-400

          mb-6
        "
      >
        <p className="font-medium text-slate-700 dark:text-slate-300">
          {error}
        </p>

        <p className="text-sm mt-1">
          Please go to the Setup Event tab to configure your
          pipeline.
        </p>
      </div>
    );

  if (!data)
    return (
      <div className="p-4 text-slate-500 dark:text-slate-400">
        Loading pipeline...
      </div>
    );

  const completedCount =
    data.stages?.filter((s) => s.status === 'COMPLETED')
      .length || 0;

  const progressPct =
    data.total_stages > 1
      ? Math.round(
          (completedCount / (data.total_stages - 1)) * 100
        )
      : data.is_final_stage
      ? 100
      : 0;

  return (
    <div
      className="
        w-full

        bg-white/80
        dark:bg-slate-900/80

        backdrop-blur-md

        border
        border-slate-200
        dark:border-slate-800

        rounded-2xl

        shadow-sm

        p-6

        mb-6
      "
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Event Pipeline:{' '}
            <span className="text-blue-600 dark:text-blue-400">
              {data.event_name}
            </span>
          </h3>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Stage {(data.current_stage_index ?? 0) + 1} of{' '}
            {data.total_stages}

            {data.is_final_stage && (
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                · Event complete
              </span>
            )}
          </p>
        </div>

        <button
          onClick={load}
          className="
            self-start sm:self-auto
            flex
            items-center
            gap-2

            px-3
            py-2

            bg-slate-100
            dark:bg-slate-800

            hover:bg-slate-200
            dark:hover:bg-slate-700

            text-slate-600
            dark:text-slate-300

            text-sm
            font-medium

            rounded-xl

            transition-colors
          "
        >
          🔄 Refresh
        </button>
      </div>

      {/* Progress Bar */}
      <div
        className="
          w-full
          h-2

          bg-slate-200
          dark:bg-slate-800

          rounded-full

          mb-6

          overflow-hidden
        "
      >
        <div
          className="
            h-full

            bg-blue-500

            rounded-full

            transition-all
            duration-500
          "
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stages */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {data.stages?.map((stage) => (
          <div
            key={stage.order}
            title={stage.description}
            className={`
              flex-shrink-0

              flex
              items-center
              gap-1.5

              px-3
              sm:px-4
              py-2

              rounded-full

              text-xs
              sm:text-sm
              font-semibold

              whitespace-nowrap

              transition-colors

              ${
                stage.status === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : stage.status === 'COMPLETED'
                  ? `
                      bg-green-100
                      dark:bg-green-950/40

                      text-green-700
                      dark:text-green-300

                      border
                      border-green-200
                      dark:border-green-900
                    `
                  : `
                      bg-slate-100
                      dark:bg-slate-800

                      text-slate-500
                      dark:text-slate-400

                      border
                      border-slate-200
                      dark:border-slate-700
                    `
              }
            `}
          >
            {stage.status === 'COMPLETED' && (
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
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